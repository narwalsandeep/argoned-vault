# Open Source + Hosted Service — Plan for Argoned (Vault)

> **Status:** Phase 2–4 implemented in private repo (`vault/`). Phase 1 (GitHub org repo + secrets) and Phase 5 (first release) remain operator tasks.  
> **Goal:** One codebase, two outputs: **hosted service** (argoned.com) and **public open source** (MIT) with the **same features**.

---

## 0. Decisions locked in (product owner)

| Topic | Decision |
|-------|----------|
| **OSS license** | **MIT License** on the public repo (`LICENSE` in every release). |
| **Feature scope** | **Full product in OSS** — same code as the private repo: `ui/`, `api/`, `website/`, billing (Stripe), platform admin, import, vault, docs, Compose files, tests. **No feature stripping.** |
| **Difference vs hosted service** | **License (MIT)** + **environment variables only** — self-hosters use their own `.env` (Stripe keys, mail, `ADMIN_EMAIL`, DB passwords). No production secrets in the public repo. |
| **Public repo** | **`narwalsandeep/argoned-vault`** (public, MIT). README branded **Argoned**. Future: may move to `narwalsandeep/argoned-vault` org. |
| **Private repo (main product)** | Today: `narwalsandeep/blackbox`. **Later rename** to **`argoned/argoned`** (private) — same code; development and production deploy source of truth. |

### 0.1 Can the public OSS repo be named “Argoned”?

**Yes for branding** (README, docs, product name).

**GitHub path:** two repos cannot share the same `org/name`. Target layout:

| Repo | GitHub path | Visibility | Content |
|------|-------------|------------|---------|
| Main product | `argoned/argoned` | **Private** | Full codebase (same files as OSS). |
| Open source | `narwalsandeep/argoned-vault` | **Public** | **Same codebase** + MIT `LICENSE`. No committed secrets. |

**MIT note:** Anyone can use and modify the code. It does not grant the **Argoned** trademark for unrelated products. README should say hosted service at **argoned.com** is the official managed offering.

---

## 1. Is this doable?

**Yes — and simpler than a “strip billing/admin” plan.**

Because OSS gets the **full tree**, we avoid:

- Breaking `app.routes.ts`, `routes.php`, or DI when removing modules
- Maintaining patch files or edition-specific route tables
- OSS and service code drifting in behaviour

The **only** hard requirement is: **never publish secrets**. Everything else is the same commit, same features, same tests.

**Why still two repos?** GitHub cannot hide branches on a public repo. Development stays **private**; CI publishes a **sanitized mirror** to **public** when you tag a release.

---

## 2. What we want (plain English)

| You do this | What happens |
|-------------|--------------|
| Merge to **`main`** (private repo) | Tests + **deploy to argoned.com** (existing pipeline). |
| Tag **`oss-v1.2.0`** on that commit | CI copies **full code** → removes secret **files** → adds **MIT LICENSE** → pushes to **`narwalsandeep/argoned-vault`**. |
| Self-hoster clones `narwalsandeep/argoned-vault` | Same app as production: configure **`api/.env`** from **`api/.env.example`** (their Stripe, mail, admin email, DB). |

**Hosted service vs self-hosted OSS — same software, different ops:**

| | Hosted (argoned.com) | Self-hosted (OSS) |
|--|----------------------|-------------------|
| Code | Private `main` | Public mirror of same commit |
| License | Proprietary (private repo) | **MIT** |
| Stripe | Our live/test keys in server `.env` | **Their** keys in their `.env` |
| Admin | Our `ADMIN_EMAIL` | **Their** `ADMIN_EMAIL` |
| Infra | Our EC2 + deploy pipeline | **Their** Docker / VPS |
| Website | Our domain | They run `website/` on their ports |

---

## 3. Architecture (technical)

### 3.1 Two repositories

| Repository | Visibility | Role |
|------------|------------|------|
| `argoned/argoned` (today: `narwalsandeep/blackbox`) | **Private** | Daily development, PRs, production deploy. |
| `narwalsandeep/argoned-vault` | **Public** (MIT) | Release mirror — **full code**, no secret files. |

### 3.2 Branches

**Private repo**

```
main        → deploy to service on push
feature/*   → normal development
```

**Public repo**

```
main        → latest OSS release
v1.0.0 …    → semver tags (from oss-v* tags, oss- prefix stripped)
```

### 3.3 Flow diagram

```
┌──────────────────────────────────────────────────────────┐
│  PRIVATE  argoned/argoned  (full code, all features)      │
│  ui · api · website · docs · compose · workflows · tests  │
└────────────────────────────┬─────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     push main                         tag oss-v*
     deploy-vault.yml                 publish-oss.yml
              ▼                             ▼
     EC2 (our .env)                  narwalsandeep/argoned-vault (MIT)
     argoned.com                     clone + their .env
```

---

## 4. What is the same vs different in the public export

### 4.1 Included in OSS (full copy)

Everything in the vault monorepo that is **source code or config templates**, including:

| Path | In OSS? |
|------|---------|
| `ui/` | Yes |
| `api/` (source, migrations, tests) | Yes |
| `website/` | Yes |
| `docs/` | Yes |
| `docker-compose.yml` | Yes |
| `docker-compose.prod.yml` | Yes |
| `.github/workflows/` (e.g. `deploy-vault.yml`, future `ci.yml`, `publish-oss.yml`) | Yes — workflows contain **no secrets**; they reference GitHub Secrets at runtime |
| `README.md` | Yes (optional small OSS header: license + self-host link) |
| All tests | Yes |

**Stripe, platform admin, import billing guards, pricing UI** — all included. Self-hosters enable them via env (see §4.3).

### 4.2 Excluded from OSS (secrets only — not features)

These are **never** copied to the public repo:

| Item | Why |
|------|-----|
| `api/.env` | Real secrets (DB password, Stripe live keys, mail, OTP pepper, etc.) |
| Any `*.pem`, `*.key`, SSH private keys | Credentials |
| Any file matching leak patterns in CI | `sk_live_`, `BEGIN PRIVATE KEY`, etc. |
| Ad-hoc secret dumps, `secrets/` folders | If ever added |

**Not excluded:** `api/.env.example` — this is the template self-hosters copy to `api/.env`.

### 4.3 Added or replaced on export

| Item | Action |
|------|--------|
| `LICENSE` | Add **MIT** text (from `oss/LICENSE-MIT` in private repo) |
| `README.md` | Optional: prepend “Open source (MIT)” + link to argoned.com hosted service |

**No** `strip_features`. **No** `docker-compose.oss.yml` substitute. **No** route patching.

### 4.4 Self-host environment (what users configure)

Self-hosters copy `api/.env.example` → `api/.env` and set **their** values, for example:

- `DB_*` — their Postgres
- `STRIPE_*` — their Stripe account (or leave unset if billing UI shows “not configured”)
- `ADMIN_EMAIL` — their platform admin operator
- `MAIL_*` — their SMTP
- `UI_ORIGIN`, `API_BASE_URL`, ports — their hostnames

The app already reads these from env; **no code fork needed** for OSS vs service.

---

## 5. How developers choose service vs OSS when pushing

| Intent | Action | Pipeline |
|--------|--------|----------|
| Ship to **hosted service** | Merge → `main` | `deploy-vault.yml` |
| Ship to **hosted + OSS** | Merge → `main`, then `git tag oss-v1.2.0 && git push origin oss-v1.2.0` | Deploy on `main` push; **publish** on tag |
| **OSS only** (no deploy) | Tag `oss-v*` or manual `workflow_dispatch` | `publish-oss.yml` only |
| **Service hotfix** | Merge `main` | Deploy; tag OSS when ready |

**Rule:** `main` = service. `oss-v*` = public MIT release (full code snapshot).

---

## 6. Pipeline design (GitHub Actions)

### 6.1 Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` (new, optional) | PR + `main` | Tests + builds — shared gate |
| `deploy-vault.yml` (existing) | Push `main` | Deploy to EC2 |
| `publish-oss.yml` (new) | Tag `oss-v*` or manual | Mirror to `narwalsandeep/argoned-vault` |

### 6.2 `publish-oss.yml` — steps

1. Checkout private repo at tagged commit.
2. Run **same tests** as service (UI + API in Docker).
3. **Build export tree** (see §7):
   - Copy full repo (rsync / git archive).
   - Apply **exclude list** (secret files only).
   - Add `LICENSE` (MIT).
   - Optionally patch README intro.
4. **Leak scan** — fail if `.env`, live Stripe keys, or private keys found in export.
5. **Build export** — `npm run build:prod` in `ui/` and `website/`, API sanity check (proves mirror is intact).
6. Push to `narwalsandeep/argoned-vault` (`main` + tag `vX.Y.Z`).
7. Create GitHub Release with changelog + self-host instructions (`cp api/.env.example api/.env`, `docker compose up`).

### 6.3 Secrets (private repo)

| Secret | Used by |
|--------|---------|
| `EC2_*`, `VAULT_DEPLOY_PATH` | `deploy-vault.yml` only |
| `OSS_PUBLISH_GITHUB_TOKEN` | `publish-oss.yml` — write to public repo |
| `OSS_PUBLIC_REPO` | `narwalsandeep/argoned-vault` |

Publish token must **not** have access to production infra beyond pushing to the public repo.

### 6.4 Safety gates before public push

- [ ] No `api/.env` (only `api/.env.example`)
- [ ] No private keys / `sk_live_` in tree
- [ ] Tests pass on tagged commit
- [ ] Production build passes on **export** directory
- [ ] Optional: manual approval on first releases

---

## 7. Export manifest (minimal — secrets only)

**`oss/export-manifest.yml`** (planned)

```yaml
# Full-code OSS mirror. Private source: argoned/argoned (today: blackbox).

# Copy everything under vault repo root except excludes below.
include:
  - "**/*"

exclude:
  - api/.env
  - api/.env.local
  - api/.env.production
  - "**/*.pem"
  - "**/*.key"
  - "**/secrets/**"
  - .git/**

# Never exclude api/.env.example

add:
  - src: oss/LICENSE-MIT
    dest: LICENSE

# Optional README banner (does not change code)
# patch_readme: oss/README-OSS-BANNER.md
```

**`oss/scripts/build-export.sh`** — rsync (or `git archive`) + exclude list + add LICENSE + leak grep.

No `strip_features`. No alternate compose files.

---

## 8. Day-to-day workflow

### Normal feature (billing, admin, vault, website)

1. Develop in private repo on `feature/*`.
2. Merge to `main` → auto-deploy to service.
3. When ready for OSS: tag `oss-vX.Y.Z` → public repo gets **same feature** automatically.

### Releasing OSS

```bash
git checkout main
git pull
git tag oss-v1.0.0
git push origin oss-v1.0.0
```

Community gets full code at that commit under MIT.

---

## 9. Implementation phases

### Phase 0 — Decisions

- [x] Public repo: **`narwalsandeep/argoned-vault`**, **MIT**
- [x] Private repo (future): **`argoned/argoned`**
- [x] **Full feature parity** in OSS (no stripping)
- [x] Difference: **license + env only**
- [ ] Confirm GitHub org `argoned` and rename schedule

### Phase 1 — Repo setup

- [x] **Create public repo** `narwalsandeep/argoned-vault` (`git@github.com:narwalsandeep/argoned-vault.git`)
- [ ] Add `OSS_PUBLISH_GITHUB_TOKEN`, `OSS_PUBLIC_REPO=narwalsandeep/argoned-vault` to **private** repo GitHub Secrets — see `vault/oss/GITHUB-SECRETS.md`
- [ ] Bootstrap public `main` (run commands in `vault/oss/README.md`) **or** push tag `oss-v0.1.0` after secrets are set
- [ ] Plan rename `narwalsandeep/blackbox` → `argoned/argoned` (update EC2 remote URL)

**Do you need a new repo?** Yes — **one new public repo** (`narwalsandeep/argoned-vault`). Keep your existing **private** repo for daily dev and argoned.com deploy; do not make it public.

### Phase 2 — Export tooling

- [x] `oss/LICENSE-MIT`
- [x] `oss/export-manifest.yml` (exclude list only)
- [x] `oss/scripts/build-export.sh --dry-run` for local preview

### Phase 3 — CI

- [x] `publish-oss.yml` on `oss-v*` tag
- [x] Leak scan + build-on-export step
- [ ] Trial publish to a test public repo

### Phase 4 — Docs

- [x] `docs/self-host.md` — copy `.env.example`, Stripe optional, `ADMIN_EMAIL`, compose up
- [x] `SECURITY.md`, `CONTRIBUTING.md` on public repo
- [ ] Website copy: managed vs self-hosted

### Phase 5 — First release

- [ ] Tag `oss-v0.1.0`
- [ ] Clone **public repo only** → `docker compose up` with fresh `.env`
- [ ] Verify billing/admin routes exist and respond (with or without Stripe configured)

---

## 10. Mapping (today → target)

| | Private `argoned/argoned` | Public `narwalsandeep/argoned-vault` |
|--|---------------------------|-------------------------|
| Code | Full | **Same** (at tagged commit) |
| License | Private / internal | **MIT** |
| Secrets | Server `api/.env` (not in git) | **None committed** — `.env.example` only |
| Stripe / admin / website | Yes | **Yes** — configure via env |
| Deploy | Our EC2 pipeline | User’s infra (workflow files included as reference) |

---

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Secret committed to private repo then exported | Leak scan on export; never commit `.env`; gitleaks on PRs |
| Someone runs OSS as competing hosted service | Allowed under MIT; differentiate via brand, ops, support, argoned.com |
| Stripe live key in example file | `.env.example` uses placeholders only; CI rejects `sk_live_` |
| Private/public repo name clash | `argoned/argoned` private, `narwalsandeep/argoned-vault` public |
| Accidental direct push to public | CI-only publish token; block manual push in maintainer docs |

---

## 12. Leak prevention

### Never commit (private or public)

- `api/.env`, production passwords, Stripe **live** keys, SSH private keys, EC2 passwords

### Pre-push hook (maintainers, optional)

```bash
# Block manual push to public remote — use tag oss-v* + CI
if [ "$remote" = "public" ]; then
  echo "Use: git tag oss-vX.Y.Z && git push origin oss-vX.Y.Z"
  exit 1
fi
```

---

## 13. Summary

| Question | Answer |
|----------|--------|
| Same features in OSS? | **Yes — full code mirror** |
| What differs? | **MIT license** + **no secret files**; self-hosters use **their `.env`** |
| Strip billing/admin/website? | **No** |
| Two repos? | **Yes** — private dev, public mirror (GitHub visibility rules) |
| Service deploy | **`main`** → `deploy-vault.yml` |
| OSS publish | **`oss-v*` tag** → `publish-oss.yml` |
| Will stripping cause bugs? | **N/A** — we are not stripping |
| Next step | Phase 1: create `narwalsandeep/argoned-vault`, add `OSS_PUBLISH_GITHUB_TOKEN`, trial tag `oss-v0.1.0` |

---

## Appendix A — Why two repos (reference)

GitHub does not support hidden branches on public repositories. Industry pattern: **private monorepo** + **automated public mirror** (Metabase, GitLab, and others ship full or near-full source publicly while running managed cloud).

### Generic leak-prevention rules

| Rule | Reason |
|------|--------|
| Two repos | Public cannot see private development history |
| Never commit `.env` | Secrets stay off GitHub |
| CI-only publish | Reduces human error |
| `.env.example` in public repo | Documents required env vars without values |
