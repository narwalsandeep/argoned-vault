# Operations runbooks (local Docker and EC2)

---

## Part A — Local development

### A.1 Stack

Services from repo root `docker-compose.yml`:

- `ui` — Angular vault app (`UI_PORT`, default host **3002** in `api/.env`)
- `website` — Angular marketing site (`WEBSITE_PORT`, default **3004**)
- `api` — Slim PHP (`API_PORT`, default **3003**)
- `db` — Postgres (persisted volume; host port **5454**)

### A.2 First-time setup

1. `cp api/.env.example api/.env`
2. Set `DB_PASSWORD` (and align `DB_NAME` / `DB_USER` with compose); set `UI_PORT`, `WEBSITE_PORT`, `API_PORT` if you deviate from defaults.
3. From `vault/`: `docker compose --env-file ./api/.env up -d --build`

**First API build:** may take several minutes while `pdo_pgsql` builds or dependencies install.

### A.3 Common commands

- Start: `docker compose --env-file ./api/.env up -d`
- Rebuild: `docker compose --env-file ./api/.env up -d --build`
- Stop: `docker compose --env-file ./api/.env down`
- Logs: `docker compose --env-file ./api/.env logs -f`
- Status: `docker compose --env-file ./api/.env ps`

### A.4 DB reset (destructive, dev only)

1. `docker compose --env-file ./api/.env down`
2. `docker volume rm blackbox_postgres_data` (or the volume name shown by `docker volume ls`)
3. `docker compose --env-file ./api/.env up -d --build`

### A.5 Verification

- API: `curl http://localhost:3003/health/live` → `200`, `status: ok` (use `API_PORT` from `api/.env`)
- API: `curl http://localhost:3003/health/ready` → `200` + `db: ok`, or `503` if DB down
- UI: open `http://localhost:3002` (vault app)
- Marketing site: open `http://localhost:3004` (`WEBSITE_PORT`)

```text
Browser
   |
   +--> UI container (Angular vault app)
   |
   +--> Website container (Angular marketing)
   |
   v
API container (PHP)
   |
   v
Postgres (persisted volume)
```

---

## Part B — EC2 / production-style deploy

### B.1 Architecture (current)

- `.github/workflows/deploy-vault.yml` deploys on push to `main`.
- Workflow SSHs to EC2, `git pull`, rebuilds Docker, runs migrations, starts stack.
- Compose uses `docker-compose.yml` + `docker-compose.prod.yml` (production: vault UI + marketing **website** static builds served by nginx in containers).

### B.1a Production performance (Compose overlay)

`docker-compose.prod.yml` is tuned for typical single-host Docker + **nginx on the server** reverse-proxying to container ports:

| Area | What we changed |
|------|------------------|
| **`ui` / `website` images** | Custom `nginx-main.conf`: higher `worker_connections`, `multi_accept`, `sendfile`/`tcp_nopush`, **gzip** for text/json/js/css/svg, **open_file_cache**, **immutable long-cache** headers for hashed `.js`/`.css`/fonts (SPA shell stays `no-cache`), **`real_ip`** from common Docker/private CIDRs using `X-Forwarded-For`. |
| **`api` image** | **nginx + PHP-FPM** + **Opcache** (JIT enabled) instead of `php -S` (single-threaded). FPM pool uses dynamic workers (`pm.max_children=30` — lower if RAM-constrained). Runtime install: `composer install --no-dev --optimize-autoloader`. Opcache is configured so **bind-mounted `./api` still picks up `git pull` updates** within a few seconds; switch to `validate_timestamps=0` if you ever ship the API **without** a source bind mount. |
| **`db` service** | Extra Postgres `-c` flags: `shared_buffers`, `effective_cache_size`, `work_mem`, connection ceiling, WAL/checkpoint defaults suited to a **small/medium VPS**. Raise `shared_buffers` / `effective_cache_size` when you have several GB RAM dedicated to Postgres. |
| **Process hygiene** | `restart: unless-stopped` on prod-facing services; **`init: true`** on `api` for cleaner PID 1 / zombie reaping. |

**Host nginx (outside Docker):** Prefer HTTP/2 or HTTP/3, TLS session tickets/cache where appropriate, keep **`proxy_http_version 1.1`** and **`proxy_set_header Connection ""`** for upstream keep-alives, tune **`proxy_buffering`** / **`proxy_buffers`** if responses are large. Terminate TLS at the host; containers stay HTTP.

### B.2 One-time EC2 setup (Ubuntu 22.04/24.04 example)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git nginx
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
```

Clone to the path in GitHub secret `VAULT_DEPLOY_PATH` (example `/opt/vault`):

```bash
sudo mkdir -p /opt
sudo chown -R "$USER":"$USER" /opt
cd /opt
git clone <vault-repo-url> vault
cd vault && git checkout main
cp api/.env.example api/.env
```

Edit `api/.env`: `DB_PASSWORD`, `ACCOUNT_RECOVERY_TOKEN`, Stripe/Mail, `API_BASE_URL`, `UI_ORIGIN`, **`UI_PORT`**, **`WEBSITE_PORT`**, **`API_PORT`**, **`DB_PORT`** (default **5454** for host-side clients to Postgres; Compose publishes Postgres on **5454**), etc.

- For API→Postgres inside Compose (same stack on local or EC2), keep **`DB_HOST=db`** overridden at runtime by Compose; bundled Postgres uses the persisted Docker volume—back up that volume or snapshots if you rely on it for production data.
- **Always** pass `--env-file ./api/.env` to `docker compose` so published ports match.

### B.2a Static SPA CSP (production UI container)

The **`Dockerfile.prod`** nginx image sends **`Content-Security-Policy`** and related headers from [`ui/nginx/default.conf.template`](../ui/nginx/default.conf.template). Build strips Angular’s async stylesheet `onload` hack so **`script-src` stays `'self'`** (no `'unsafe-inline'` for scripts).

Set **`NGINX_UI_CONNECT_SRC`** (optional in `api/.env`; defaulted in [`docker-compose.prod.yml`](../docker-compose.prod.yml)) to space-separated origins the browser may use for **fetch/XHR** to the API—typically the origin of `API_BASE_URL` / [`environment.prod.ts`](../ui/src/environments/environment.prod.ts) `apiBaseUrl`. Example: `https://api.argoned.com`. After deploy, confirm in DevTools → **Network** → document → **Response Headers**; if API calls are blocked, widen `connect-src` accordingly.

### B.3 Host nginx in front of UI container

Example site (replace domain and `proxy_pass` port with `UI_PORT` from `api/.env`):

```nginx
server {
    listen 80;
    server_name vault.example.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site, `sudo nginx -t`, `sudo systemctl reload nginx`.

### B.4 HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vault.example.com
sudo certbot renew --dry-run
```

### B.5 First manual deploy on EC2

From deploy path:

```bash
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml build
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml run --rm --entrypoint '' api sh -lc 'composer install --no-interaction && composer migrate'
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

Health (adjust host port to `API_PORT`):

```bash
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml ps
curl -fSs http://127.0.0.1:3003/health/live
curl -fSs http://127.0.0.1:3003/health/ready
```

### B.6 GitHub Actions secrets

In repo settings:

- `EC2_SSH_PASSWORD`, `EC2_HOST`, `EC2_USER`, `VAULT_DEPLOY_PATH`

The EC2 instance must allow **password authentication** for `EC2_USER` if you use `deploy-vault.yml` as shipped (many hardened AMIs disable it). Delete any unused legacy secret named `EC2_SSH_KEY`.

Workflow uses `sudo docker compose`; deploy user needs passwordless sudo for non-interactive SSH, or adjust workflow to use `docker` group membership without sudo.

### B.7 Daily operations

```bash
cd /opt/vault
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml ps
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml logs -f api
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml down
```

### B.8 Rollback

```bash
cd /opt/vault
git log --oneline -n 5
git checkout <last-good-commit>
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml build
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml run --rm --entrypoint '' api sh -lc 'composer install --no-interaction && composer migrate'
sudo docker compose --env-file ./api/.env -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

Then fix `main` with a revert commit and redeploy.

### B.9 Troubleshooting: port already allocated

Docker publishes **`UI_PORT`** from **`api/.env`**. If bind fails:

1. Stop/remove stale UI container from this project.
2. Check host conflicts: `sudo ss -tlnp | grep -E ':3002|:3022'` and `sudo docker ps`.
3. Change `UI_PORT` in `api/.env`, re-run compose with `--env-file`, update host nginx `proxy_pass`, keep **`UI_ORIGIN`** consistent with the public URL.

### B.10 Same codebase as open source

To publish **the same tree** as a self-hosted OSS artifact while keeping cloud deploy (env-driven secrets, CI secrets only), see [open-source-release-strategy.md](./open-source-release-strategy.md).

---

*Ports `3002` / `3003` are examples; always take values from the active `api/.env`.*
