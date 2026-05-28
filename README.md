<div align="center">

# Argoned Vault

**Zero-knowledge password & secrets manager — self-hostable, full-featured, MIT licensed.**

*Encrypted client-side · Argon2id · AES-256-GCM · per-item keys*

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

<br>

[![Tests](https://img.shields.io/badge/Tests-PHPUnit%20%2B%20Vitest-success?style=flat-square&logo=vitest&logoColor=white)](api/tests/)
[![Crypto](https://img.shields.io/badge/Crypto-AES--256--GCM%20%7C%20Argon2id-informational?style=flat-square)](docs/vault-crypto-and-data-lifecycle.md)
[![AEAD](https://img.shields.io/badge/Per--item-Encryption-2ea043?style=flat-square)](docs/vault-crypto-and-data-lifecycle.md)

<br>

**Managed service:** [argoned.com](https://argoned.com) — production-hosted Argoned Vault, operated by the team behind this project.

</div>

---

## Overview

**Argoned Vault** is a production-grade, zero-knowledge secrets manager — **MIT licensed** and ready to self-host. This repository contains the vault application: Angular UI, Slim PHP API, platform admin, bulk import, Docker Compose deployment, tests, and technical documentation.

### Also available as a hosted service

You do not have to self-host. **[Argoned](https://argoned.com)** provides the same vault technology as a **managed, production service** — maintained and operated by the Argoned team. Whether you subscribe at [argoned.com](https://argoned.com) or deploy from this repository, the **cryptographic architecture is the same**: client-side encryption, zero-knowledge storage, and per-item keys.

---

## Why the cryptography is built this way

Most password managers claim “encryption.” Argoned is designed so you can **verify** the model: decryption happens **only in your browser**, with **standard algorithms**, **separate login vs vault unlock**, and **per-item keys** so a single compromise does not unwrap your entire vault at once.

| Property | Argoned | Typical weak pattern |
|----------|---------|----------------------|
| **Server sees vault plaintext** | **Never** (zero-knowledge) | Server-side decrypt or “recoverable master key” |
| **Login password = vault key** | **No** — separate unlock secret | One password unlocks everything server-side |
| **Key derivation** | **Argon2id** (memory-hard, per-user salt) | Fast hashes (bcrypt-only UI, MD5-era legacy) |
| **Item encryption** | **AES-256-GCM** (AEAD) + random **DEK per item** | One master key encrypts all rows |
| **Tamper detection** | GCM **authentication tag** on every blob | ECB / unauthenticated modes |
| **Unlock location** | **Web Crypto API** in tab memory | Keys persisted in `localStorage` |
| **Recovery** | Optional **recovery artifact** (second wrap of vault key) | Account reset silently decrypts vault |

**Bottom line:** the API is a **storage and access-control plane** for ciphertext. It validates who you are (session + CSRF + OTP), not what your secrets contain.

> Deep dive: [docs/vault-crypto-and-data-lifecycle.md](docs/vault-crypto-and-data-lifecycle.md) · [docs/architecture-security-and-threats.md](docs/architecture-security-and-threats.md)

---

## System architecture

```mermaid
flowchart LR
  subgraph Browser["Browser · Angular SPA"]
    UI[UI + forms]
    WC[WebCryptoService<br/>hash-wasm + Web Crypto]
    MEM[(Tab memory<br/>Vault Key when unlocked)]
    UI --> WC --> MEM
  end

  subgraph API["API · Slim PHP"]
    AUTH[Auth · Session · CSRF · OTP]
    VAULT[Vault routes<br/>store/retrieve blobs only]
    AUTH --> VAULT
  end

  subgraph DB["PostgreSQL"]
    VP[(vault_profiles<br/>wrapped keys)]
    VI[(vault_items<br/>ciphertext + wraps)]
    U[(users · sessions)]
  end

  Browser <-->|HTTPS JSON| API
  API --> DB
```

---

## Three independent secret layers

Argoned deliberately splits **account access** from **vault decryption**. Compromising your login session does **not** automatically decrypt vault items.

```mermaid
flowchart TB
  subgraph Layer1["Layer 1 · Account login"]
    EMAIL[Email]
    APW[Account password]
    OTP[Email OTP]
    SESS[HttpOnly session cookie]
    EMAIL --> APW --> OTP --> SESS
  end

  subgraph Layer2["Layer 2 · Vault unlock (client only)"]
    US[Unlock secret<br/>memorized / password manager]
    ARG[Argon2id + per-user salt]
    UK[Unlock Key UK]
    VK[Vault Key VK<br/>256-bit random]
    US --> ARG --> UK -->|AES-GCM wrap/unwrap| VK
  end

  subgraph Layer3["Layer 3 · Per-item encryption"]
    DEK[Random DEK per item]
    PL[Credential / note JSON]
    VK -->|wrap DEK| DEK -->|AES-GCM| PL
  end

  Layer1 -.->|authorizes API calls| Layer3
  Layer2 --> Layer3
```

| Layer | Stored on server? | Purpose |
|-------|-------------------|---------|
| **Login** | Password hash + session row only | Prove account ownership |
| **Unlock** | Wrapped vault key + KDF params + salt | Zero-knowledge envelope |
| **Per item** | Wrapped DEK + ciphertext + nonces + tags | Limit blast radius per row |

---

## Key hierarchy (technical)

```mermaid
flowchart TB
  US["Unlock secret (user)"]
  SALT["kdf_salt + argon2id params"]
  UK["Unlock Key (UK)<br/>derived via Argon2id"]
  VK["Vault Key (VK)<br/>random 256-bit"]
  DEK["Data Encryption Key (DEK)<br/>random per vault item"]
  PAYLOAD["Item payload<br/>JSON ciphertext"]

  US --> SALT
  SALT --> UK
  UK -->|"AES-256-GCM wrap"| VK
  VK -->|"AES-256-GCM wrap"| DEK
  DEK -->|"AES-256-GCM encrypt"| PAYLOAD
```

| Symbol | Algorithm | Where it lives |
|--------|-----------|----------------|
| **UK** | Argon2id → AES-256-GCM key material | Derived in browser; never sent plaintext |
| **VK** | Random; wrapped by UK | Wrapped blob in `vault_profiles` |
| **DEK** | Random per item; wrapped by VK | Wrapped blob in each `vault_items` row |
| **Payload** | AES-256-GCM | Ciphertext + IV + auth tag in `vault_items` |

**Recovery lane (optional):** a separate **recovery secret** wraps an copy of VK into `vault_recovery_artifacts` so you can regain vault access if the unlock secret is lost — without the server ever holding plaintext keys.

---

## Encrypt flow (save a vault item)

```mermaid
sequenceDiagram
  actor User
  participant UI as Angular UI
  participant Crypto as WebCryptoService
  participant API as Slim API
  participant DB as PostgreSQL

  User->>UI: Unlock vault (unlock secret)
  UI->>Crypto: Argon2id(salt, params) → UK
  Crypto->>Crypto: Unwrap VK with UK
  Note over Crypto: VK stays in tab memory

  User->>UI: Create / edit item
  UI->>Crypto: Generate random DEK
  Crypto->>Crypto: AES-GCM encrypt payload with DEK
  Crypto->>Crypto: AES-GCM wrap DEK with VK
  Crypto-->>UI: Ciphertext + wrapped DEK + nonces + tags

  UI->>API: POST /api/v1/vault/items (JSON blobs)
  API->>DB: INSERT opaque ciphertext rows
  Note over API,DB: API never receives unlock secret,<br/>VK, DEK, or plaintext JSON
```

---

## Decrypt flow (read a vault item)

```mermaid
sequenceDiagram
  actor User
  participant UI as Angular UI
  participant Crypto as WebCryptoService
  participant API as Slim API
  participant DB as PostgreSQL

  User->>UI: Already unlocked (VK in memory)
  UI->>API: GET /api/v1/vault/items/{id}
  API->>DB: SELECT ciphertext row
  DB-->>API: wrapped DEK + payload ciphertext
  API-->>UI: JSON blobs only

  UI->>Crypto: Unwrap DEK with VK
  Crypto->>Crypto: AES-GCM decrypt payload
  Crypto-->>UI: Plaintext JSON (in memory only)
  UI-->>User: Show credential / note
```

---

## Trust boundary — what the server can and cannot see

| Data | On server | Server reads plaintext? |
|------|-----------|-------------------------|
| Account password | bcrypt/argon hash in `users` | **No** — verify only |
| Sign-in OTP | Hashed challenge row | **No** |
| Session token | HttpOnly cookie + DB hash | Validity only |
| **Unlock secret** | **Not stored** | **Never** |
| **Vault Key (raw)** | **Not stored** | **Never** |
| Wrapped vault key | `vault_profiles` | Ciphertext + IV + tag only |
| Item plaintext | **Not stored** | **Never** |
| Item ciphertext | `vault_items` | Opaque blobs |
| `item_type` metadata | Plaintext column | **Yes** — category label (e.g. `credential:website`) |
| `searchable_words` | Plaintext tokens | **Yes** — search UX trade-off ([docs](docs/vault-crypto-and-data-lifecycle.md)) |

---

## Cryptographic primitives (as implemented)

| Function | Algorithm / library | Notes |
|----------|---------------------|-------|
| Vault unlock KDF | **Argon2id** via `hash-wasm` | Per-user salt + tunable memory/time |
| Symmetric encryption | **AES-256-GCM** (Web Crypto API) | AEAD — confidentiality + integrity |
| Key wrapping | AES-GCM on VK and each DEK | Random 96-bit IV per operation |
| Recovery wrap | SHA-256 lane + AES-GCM | Separate from Argon2 unlock path |
| Password strength | **zxcvbn** | UX feedback at signup/unlock |
| Transport | TLS (HTTPS) | Session cookie `HttpOnly`, `SameSite=Lax` |
| API writes | CSRF token | `hash_equals` on mutating routes |

---

## Security controls beyond crypto

```mermaid
flowchart LR
  subgraph Client
    LOCK[Auto-lock / explicit lock]
    MEM[Clear VK from memory]
    LOCK --> MEM
  end

  subgraph API
    RL[Rate limits]
    OTP[Email OTP at login]
    CSRF[CSRF on writes]
    SZ[Payload size limits]
  end

  Client --> API
```

- **Auto-lock** — vault key cleared from tab memory after idle timeout.
- **Email OTP** — second factor at sign-in (hashed server-side with pepper).
- **CSRF** — mutating API calls require matching session CSRF token.
- **Rate limiting** — auth and recovery endpoints throttled.
- **Separate concerns** — changing account password does **not** re-encrypt vault items automatically.

> Report vulnerabilities privately: [SECURITY.md](SECURITY.md)

---

## Features

| Area | Capabilities |
|------|----------------|
| **Vault** | Credentials, secure notes, cards, identities; categories; search; bulk import (CSV/JSON) |
| **Crypto** | Client-side encrypt/decrypt; profile rotation; recovery artifacts |
| **Auth** | Email + password; sign-in OTP; OAuth (Google, LinkedIn, Facebook); sessions |
| **Admin** | Platform operator dashboard via `ADMIN_EMAIL` |
| **Ops** | Docker Compose dev + production overlay; health checks; Phinx migrations |

---

## Technology stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Vault SPA** | Angular 21+, Tailwind CSS v4, Vitest | [`ui/`](ui/) |
| **API** | Slim 4, PHP-DI, PHP 8.3, PHPUnit 11 | [`api/`](api/) |
| **Database** | PostgreSQL 16+ | [`docker-compose.yml`](docker-compose.yml) |
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
| `ADMIN_EMAIL` | Optional platform admin operator |

Always pass the env file to Compose:

```bash
docker compose --env-file ./api/.env …
```

---

## Testing

| Suite | Command | Scope |
|-------|---------|-------|
| **API (PHPUnit)** | `cd api && composer install && ./vendor/bin/phpunit` | Routes, auth, vault contracts |
| **UI (Vitest)** | `cd ui && npm ci && npm test` | Angular components & services |
| **CI gate** | `.github/workflows/publish-oss.yml` | Builds + API tests before each public release |

The API ships **70+ unit tests** covering auth, OAuth, vault validation, and HTTP middleware.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/self-host.md](docs/self-host.md) | Self-hosting from scratch |
| [docs/system-reference.md](docs/system-reference.md) | Routes, tables, import |
| [docs/vault-crypto-and-data-lifecycle.md](docs/vault-crypto-and-data-lifecycle.md) | Cryptography & key hierarchy |
| [docs/security-program-and-hardening-roadmap.md](docs/security-program-and-hardening-roadmap.md) | Security controls & roadmap |
| [docs/account-recovery.md](docs/account-recovery.md) | Recovery flows |
| [docs/architecture-security-and-threats.md](docs/architecture-security-and-threats.md) | Threat model |

Index: **[docs/README.md](docs/README.md)**

---

## Project structure

```
argoned-vault/
├── ui/                 # Vault Angular SPA (Web Crypto + Argon2id)
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

**Trademark:** *Argoned* is the product name. MIT grants code use, not unrelated use of the Argoned mark. The managed service is at **[argoned.com](https://argoned.com)**.

---

<div align="center">

**Client-side keys · Per-item AEAD · Self-host anywhere · Own your data**

[⬆ Back to top](#argoned-vault)

</div>
