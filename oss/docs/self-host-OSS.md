# Self-hosting Argoned Vault

Run the **vault application** on your own infrastructure: vault UI, API, platform admin, and import — configured via environment variables.

> Product information and the managed service are at [argoned.com](https://argoned.com).

---

## Requirements

- Docker Engine and Compose v2 (`docker compose`)
- A host with ports for the UI and API (defaults in `api/.env.example`)
- Postgres is included in the Compose stack

---

## Quick start

From the [public repository](https://github.com/narwalsandeep/argoned-vault) root:

```bash
git clone https://github.com/narwalsandeep/argoned-vault.git
cd argoned-vault
cp api/.env.example api/.env
# Edit api/.env — at minimum DB_PASSWORD and mail settings for signup/login
docker compose --env-file ./api/.env up -d --build
```

Default local URLs (override via `api/.env`):

| Service | URL |
|---------|-----|
| Vault UI | http://localhost:3002 (`UI_PORT`) |
| API | http://localhost:3003 (`API_PORT`) |

Health: `GET /health/live`, `GET /health/ready` on the API port.

---

## Configure `api/.env`

Copy **`api/.env.example`** → **`api/.env`**. Never commit `api/.env`.

Always run Compose with the env file:

```bash
docker compose --env-file ./api/.env …
```

### Required for a usable deployment

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | Set to `production` for real deploys |
| `DB_PASSWORD` | Postgres password (Compose creates the DB) |
| `LOGIN_OTP_PEPPER` | Required when `APP_ENV=production` (sign-in email OTP) |
| `UI_ORIGIN`, `API_BASE_URL`, `API_PUBLIC_BASE_URL` | Public URLs your users hit |
| `MAIL_*` | SMTP for signup, login OTP, password reset |

### Optional — platform admin

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAIL` | Account email that may access `/api/v1/admin/*` in the UI |

### OAuth (Google, LinkedIn, Facebook)

Set client id/secret pairs in `api/.env.example` section; register callback:

`{API_PUBLIC_BASE_URL}/api/v1/auth/oauth/callback`

---

## Production overlay

For nginx-served Angular UI and PHP-FPM API:

```bash
docker compose --env-file ./api/.env \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
```

Migrations on production-style deploy:

```bash
docker compose --env-file ./api/.env \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  run --rm --entrypoint '' api \
  sh -lc 'composer install --no-interaction && composer migrate'
```

---

## License and branding

- Public releases are **MIT** — see root `LICENSE`.
- **Argoned** is the product name; the managed service at **argoned.com** is the official hosted offering.
- MIT does not grant unrelated use of the Argoned trademark.

---

## Updates

Pin a release tag (`v1.0.0`, …) or track `main` on the public repo. New OSS releases are published from the private development repo when maintainers push tag `oss-vX.Y.Z`.

---

## Further reading

- [system-reference.md](./system-reference.md) — routes, tables, import
- [vault-crypto-and-data-lifecycle.md](./vault-crypto-and-data-lifecycle.md) — zero-knowledge vault model
- [security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md) — security controls
- [SECURITY.md](../SECURITY.md) — report vulnerabilities
- [CONTRIBUTING.md](../CONTRIBUTING.md) — contributions
