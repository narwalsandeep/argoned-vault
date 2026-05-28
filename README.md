<div align="center">

```
                    ░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░                        ░░
                ░░   ┏━━━━━━━━━━━━━━━━━━━━┓   ░░
                ░░   ┃                    ┃   ░░
                ░░   ┃   ┌────────────┐   ┃   ░░
                ░░   ┃   │  ▄▄▄ ▄▄▄   │   ┃   ░░
                ░░   ┃   │  █ █ █ █   │   ┃   ░░
                ░░   ┃   │  █ ███ █   │   ┃   ░░
                ░░   ┃   │  █  █  █   │   ┃   ░░
                ░░   ┃   │  ▀▀▀ ▀▀▀   │   ┃   ░░
                ░░   ┃   └──────┬─────┘   ┃   ░░
                ░░   ┃          │         ┃   ░░
                ░░   ┃     ZERO-KNOWLEDGE   ┃   ░░
                ░░   ┗━━━━━━━━━━━━━━━━━━━━┛   ░░
                  ░░                        ░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░

                         A R G O N E D
                           V A U L T
```

# Argoned Vault

**Zero-knowledge password & secrets manager — self-hostable, full-featured, MIT licensed.**

[Website](https://argoned.com) · [Self-host guide](docs/self-host.md) · [Documentation](docs/README.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Zero-knowledge](https://img.shields.io/badge/Architecture-Zero--Knowledge-2ea043?style=for-the-badge&logo=lock&logoColor=white)](docs/vault-crypto-and-data-lifecycle.md)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docs/self-host.md)

<br>

[![Angular](https://img.shields.io/badge/Angular-21+-DD0031?style=flat-square&logo=angular&logoColor=white)](ui/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](ui/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](ui/)
[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?style=flat-square&logo=php&logoColor=white)](api/)
[![Slim](https://img.shields.io/badge/Slim-4-FF5722?style=flat-square)](api/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](api/)
[![Stripe](https://img.shields.io/badge/Billing-Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)](docs/system-reference.md)

<br>

[![Tests](https://img.shields.io/badge/Tests-PHPUnit%20%2B%20Vitest-success?style=flat-square&logo=vitest&logoColor=white)](api/tests/)
[![Crypto](https://img.shields.io/badge/Crypto-AES--256--GCM%20%7C%20Argon2id-informational?style=flat-square)](docs/vault-crypto-and-data-lifecycle.md)
[![AEAD](https://img.shields.io/badge/Per--item-Encryption-2ea043?style=flat-square)](docs/vault-crypto-and-data-lifecycle.md)

<br>

**Official managed service:** [argoned.com](https://argoned.com) — same codebase, operated by the Argoned team.

</div>

---

## Overview

**Argoned Vault** is a production-grade secrets manager built for people who want **real cryptography**, **clean self-hosting**, and **no vendor lock-in**. This repository is the **public MIT release** of the vault stack (UI, API, billing, admin, import). The managed service at [argoned.com](https://argoned.com) also runs a separate marketing site — **not included here**.

| | Hosted ([argoned.com](https://argoned.com)) | Self-hosted (this repo) |
|--|---------------------------------------------|-------------------------|
| **Code** | Private development mirror | Public vault release at tagged commits |
| **License** | Proprietary (operator) | **MIT** |
| **Features** | Vault + marketing site | **Vault app** — UI, API, billing, admin, import |
| **Secrets** | Operator `.env` on server | **Your** `api/.env` |
| **Infra** | Managed cloud | Your Docker / VPS |

---

## Security model

```
  ┌─────────────┐     login + OTP      ┌─────────────┐
  │   Browser   │ ───────────────────► │     API     │
  │  (Angular)  │   session cookie     │  (Slim PHP) │
  └──────┬──────┘                      └──────┬──────┘
         │                                    │
         │  vault unlock (client-side only)   │  encrypted blobs
         │  Argon2id → keys → AES-256-GCM     │  + metadata only
         ▼                                    ▼
  ┌─────────────┐                      ┌─────────────┐
  │  Web Crypto │                      │  PostgreSQL │
  │  (in-memory)│                      │ zero-knowledge│
  └─────────────┘                      └─────────────┘
```

- **Zero-knowledge by default** — the server stores encrypted vault items and wrapped keys, not vault plaintext.
- **Account auth ≠ vault unlock** — signing in does not decrypt your vault; unlock stays client-side.
- **Per-item encryption** — each item has its own data key (DEK), wrapped by your vault key (VK).
- **Modern primitives** — Argon2id (KDF), AES-256-GCM (AEAD), Web Crypto API in the browser.
- **Recovery lane** — emergency recovery artifacts with explicit user-facing semantics ([docs/account-recovery.md](docs/account-recovery.md)).

> **Report vulnerabilities privately** — see [SECURITY.md](SECURITY.md). Do not open public issues for undisclosed security problems.

---

## Features

| Area | Capabilities |
|------|----------------|
| **Vault** | Credentials, secure notes, cards, identities; categories; search; bulk import (CSV/JSON) |
| **Crypto** | Client-side encrypt/decrypt; profile rotation; recovery artifacts |
| **Auth** | Email + password; sign-in OTP; OAuth (Google, LinkedIn, Facebook); sessions |
| **Billing** | Stripe Pro / Lifetime tiers (optional — configure your keys or run without) |
| **Admin** | Platform operator dashboard via `ADMIN_EMAIL` |
| **Ops** | Docker Compose dev + production overlay; health checks; Phinx migrations |

---

## Technology stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Vault SPA** | Angular 21+, Tailwind CSS v4, Vitest | [`ui/`](ui/) |
| **API** | Slim 4, PHP-DI, PHP 8.3, PHPUnit 11 | [`api/`](api/) |
| **Database** | PostgreSQL 16+ | [`docker-compose.yml`](docker-compose.yml) |
| **Payments** | Stripe (optional) | [`api/.env.example`](api/.env.example) |
| **Mail** | Symfony Mailer (SMTP) | [`api/.env.example`](api/.env.example) |
| **Deploy** | Docker Compose v2 | [`docs/self-host.md`](docs/self-host.md) |

**Client crypto:** `hash-wasm` (Argon2id), Web Crypto API (AES-GCM), zxcvbn password strength.

---

## Quick start

**Requirements:** Docker Engine + Compose v2, ~4 GB RAM recommended for first build.

```bash
git clone https://github.com/narwalsandeep/argoned-vault.git
cd argoned-vault
cp api/.env.example api/.env
# Edit api/.env — set DB_PASSWORD, mail, and production URLs as needed
docker compose --env-file ./api/.env up -d --build
```

| Service | Default URL |
|---------|-------------|
| Vault app | http://localhost:3002 |
| API | http://localhost:3003 |

Health checks: `GET /health/live` · `GET /health/ready`

**Production-style deploy** (nginx + PHP-FPM):

```bash
docker compose --env-file ./api/.env \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
```

Full instructions: **[docs/self-host.md](docs/self-host.md)**

---

## Configuration

Copy **`api/.env.example`** → **`api/.env`**. Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `production` for real deploys |
| `DB_PASSWORD` | Postgres password |
| `LOGIN_OTP_PEPPER` | Required in production (sign-in email OTP) |
| `UI_ORIGIN`, `API_PUBLIC_BASE_URL` | Public URLs your users hit |
| `MAIL_*` | SMTP for signup, OTP, password reset |
| `STRIPE_*` | Optional billing |
| `ADMIN_EMAIL` | Optional platform admin operator |

Always pass the env file to Compose:

```bash
docker compose --env-file ./api/.env …
```

---

## Testing

| Suite | Command | Scope |
|-------|---------|-------|
| **API (PHPUnit)** | `cd api && composer install && ./vendor/bin/phpunit` | Routes, auth, billing, vault contracts |
| **UI (Vitest)** | `cd ui && npm ci && npm test` | Angular components & services |
| **CI gate** | `.github/workflows/publish-oss.yml` | Builds + API tests before each public release |

The API ships **70+ unit tests** covering auth, OAuth, billing guards, vault validation, and HTTP middleware. Run tests before deploying to your own infrastructure.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/self-host.md](docs/self-host.md) | Self-hosting from scratch |
| [docs/system-reference.md](docs/system-reference.md) | Routes, tables, billing, import |
| [docs/vault-crypto-and-data-lifecycle.md](docs/vault-crypto-and-data-lifecycle.md) | Cryptography & key hierarchy |
| [docs/security-program-and-hardening-roadmap.md](docs/security-program-and-hardening-roadmap.md) | Security controls & roadmap |
| [docs/account-recovery.md](docs/account-recovery.md) | Recovery flows |
| [docs/architecture-security-and-threats.md](docs/architecture-security-and-threats.md) | Threat model |

Index: **[docs/README.md](docs/README.md)**

---

## Project structure

```
argoned-vault/
├── ui/                 # Vault Angular SPA
├── api/                # Slim PHP API + migrations + tests
├── docs/               # Technical documentation
├── docker-compose.yml  # Local / self-host stack (ui, api, db)
├── docker-compose.prod.yml
├── LICENSE             # MIT
├── SECURITY.md
└── CONTRIBUTING.md
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

- Bug reports → [GitHub Issues](https://github.com/narwalsandeep/argoned-vault/issues)
- Security → [SECURITY.md](SECURITY.md) (private disclosure)
- No secrets in PRs — CI leak scans reject `.env` and live keys

---

## License

MIT License — see [LICENSE](LICENSE).

**Trademark:** *Argoned* is the product name. MIT grants code use, not unrelated use of the Argoned mark. The official managed offering is at **[argoned.com](https://argoned.com)**.

---

<div align="center">

**Built with security-first defaults · Self-host anywhere · Own your data**

[⬆ Back to top](#argoned-vault)

</div>
