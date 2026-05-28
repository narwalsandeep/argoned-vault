# Blackbox Development Plan (Phase by Phase)

This document is the execution plan to build Blackbox using:

- `ui/` for frontend (existing Angular app)
- `api/` for backend (Slim PHP framework)
- `docker-compose.yml` at **project root** (outside `ui/` and `api/`)
- PostgreSQL as primary database

**Documentation map:** [docs/README.md](./README.md) — canonical **system** facts live in [system-reference.md](./system-reference.md); **security controls, gaps, and backlog** in [security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md); diagrams and extensions in [architecture-security-and-threats.md](./architecture-security-and-threats.md); vault field semantics in [vault-crypto-and-data-lifecycle.md](./vault-crypto-and-data-lifecycle.md); runbooks in [operations-runbooks.md](./operations-runbooks.md); legal/product/research in [research-todos-and-backlog.md](./research-todos-and-backlog.md).

This plan is intentionally detailed so engineering can execute in order without ambiguity.

---

## 1) Target Architecture (Final Shape)

### 1.1 Repository structure

```text
blackbox/
  docker-compose.yml
  .env.example
  docs/
  ui/
  api/
    Dockerfile
    composer.json
    public/index.php
    src/
    config/
    migrations/
    tests/
```

### 1.2 Runtime services (Docker Compose at root)

- `ui` service
  - serves Angular app
  - talks to `api` via internal network + configured public URL
- `api` service
  - Slim PHP app (PHP-FPM or Apache/Nginx based image)
  - connects to Postgres
- `db` service
  - PostgreSQL with persistent volume
- optional support services (later phases)
  - `pgadmin` or `adminer` (dev only)
  - `mailhog` (dev email testing)

### 1.3 Security posture

- Zero-knowledge vault default model
- Client-side cryptographic key derivation/unlock
- Server stores encrypted blobs only
- Per-item encryption and decrypt-one-item behavior
- Recovery via dedicated recovery artifacts only

---

## 2) Global Rules Across All Phases

1. Never store plaintext vault content in DB, logs, or analytics.
2. Keep account auth and vault unlock concepts separate.
3. Every phase must include:
   - implementation tasks
   - tests
   - documentation updates
   - security checks
4. All changes must work in Docker first (local parity).
5. No feature is "done" without acceptance criteria passed.

---

## 3) Phase Plan Overview

| Phase | Name | Outcome |
|---|---|---|
| 0 | Project Foundation | Working mono-repo runtime with root docker-compose |
| 1 | API Skeleton (Slim PHP) | Secure API baseline, health checks, config, routing |
| 2 | Database & Migrations | Postgres schema for users, vault profiles, vault items, audit |
| 3 | Authentication & Sessions | Account signup/login/MFA/session management |
| 4 | Vault Crypto Core | Vault initialization, key wrapping model, encrypted item APIs |
| 5 | UI Integration | End-to-end flows from UI to API for create/view vault items |
| 6 | Recovery Implementation | Recovery key flows, emergency kit, account-only recovery |
| 7 | Security Hardening | CSP, rate limits, audit visibility, backup/restore testing |
| 8 | QA, Performance, Release | Test matrix, threat review, go-live checklist |
| 9 | Post-Launch Operations | Monitoring, incident response, rotation and migration paths |

---

## 4) Detailed Phase-by-Phase Execution

## Phase 0 - Project Foundation

### Goal
Create a clean local development baseline with `ui`, `api`, and Postgres orchestrated by root Docker Compose.

### Tasks
- Create root `docker-compose.yml` with:
  - `ui`
  - `api`
  - `db`
- Add root `.env.example` with standard variables:
  - database credentials
  - API base URL
  - UI origin
  - security-related defaults
- Add dev volumes:
  - source mounts for hot reload
  - named volume for Postgres data
- Define shared Docker network
- Add root developer commands in docs:
  - up, down, reset db, logs

### Deliverables
- `docker-compose.yml` at project root
- bootstrapped containers start with one command
- simple architecture diagram in docs

### Acceptance Criteria
- `docker compose up` starts all services
- UI can call API health endpoint
- API can connect to Postgres successfully
- Restarting preserves DB data via volume

---

## Phase 1 - API Skeleton (Slim PHP)

### Goal
Build secure Slim PHP backend skeleton under `api/` with clean structure and environment handling.

### Tasks
- Initialize Slim app in `api/`
- Add base structure:
  - `public/index.php`
  - `src/Application/*`
  - `src/Domain/*`
  - `src/Infrastructure/*`
  - `config/*`
- Add middleware stack:
  - JSON parsing
  - CORS (strict allowlist)
  - request ID
  - error handling
  - security headers baseline
- Add health endpoints:
  - `/health/live`
  - `/health/ready` (checks DB)
- Add dependency injection container config
- Add structured logging (without secrets)

### Deliverables
- Running Slim API with versioned route prefix (for example `/api/v1`)
- Health and readiness endpoints
- Middleware and error handling baseline

### Acceptance Criteria
- API boots in Docker with no fatal errors
- `/health/live` returns ok without DB
- `/health/ready` returns fail if DB unavailable, ok if available
- Unhandled exceptions return safe JSON errors, no stack traces in prod mode

---

## Phase 2 - Database & Migrations

### Goal
Implement all core Postgres schema and migration workflow.

### Tasks
- Add migration tool and migration scripts in `api/migrations/`
- Create tables:
  - `users`
  - `vault_profiles`
  - `vault_items`
  - `vault_recovery_artifacts`
  - `audit_events`
- Add indexes:
  - unique email
  - user-scoped indexes for item fetch performance
- Add DB constraints:
  - foreign keys
  - not-null and type constraints
  - crypto version fields
- Add seed scripts for dev/test users (non-sensitive dummy data)
- Add migration CI check

### Deliverables
- reproducible migrations (up/down strategy documented)
- Schema reference in [system-reference.md](./system-reference.md) (keep aligned with `api/migrations/`)

### Acceptance Criteria
- Full DB can be created from zero with one migration command
- Roll-forward path validated in CI
- Basic performance checks on item lookup by `user_id + id`

---

## Phase 3 - Authentication & Sessions

### Goal
Ship account-level identity, session, and **step-up verification** (email OTP after password) before vault crypto flows. Strong MFA (TOTP/WebAuthn) remains backlog ([research-todos-and-backlog.md](./research-todos-and-backlog.md)).

### Tasks
- Signup/login/logout endpoints
- Password hashing policy (Argon2id or approved equivalent)
- Session strategy:
  - secure httpOnly cookies
  - CSRF protection
  - session expiry and renewal
- Mandatory **email OTP** on every sign-in (after password); TOTP/WebAuthn backlog
- Device/session list + revoke endpoint
- Rate limiting and brute-force protections on auth routes

### Deliverables
- stable auth API with tests
- authentication UX integrated in UI

### Acceptance Criteria
- User can create account, complete email OTP sign-in, logout
- Failed login attempts trigger throttling/lock policy
- Session cookies are secure/sameSite/httpOnly
- Audit events record auth activities without sensitive fields

---

## Phase 4 - Vault Crypto Core

### Goal
Implement zero-knowledge vault cryptographic protocol and encrypted item API contract.

### Tasks
- Define API contracts for:
  - vault bootstrap/profile creation
  - upload wrapped vault key metadata
  - create encrypted item
  - fetch encrypted item by id
  - list item metadata (non-sensitive)
  - update encrypted item
  - delete encrypted item
- Ensure API only accepts/stores encrypted payload components:
  - ciphertext
  - nonce
  - auth tag
  - wrapped keys
  - crypto version
- Client-side key lifecycle rules in UI:
  - derive unlock key locally
  - unwrap vault key in memory
  - decrypt only selected item
  - clear memory on lock/logout/timeout
- Add crypto versioning strategy for future migrations

### Deliverables
- end-to-end encrypted item CRUD in dev
- crypto protocol docs with request/response samples

### Acceptance Criteria
- Server cannot decrypt vault data by design
- DB inspection shows no plaintext vault content
- Decrypt-one-item behavior validated
- Tampered payload/tag is rejected

---

## Phase 5 - UI Integration and Product Flows

### Goal
Wire current Angular UI to real API and complete key user journeys.

### Tasks
- Integrate API client layer in `ui/`
- Implement flows:
  - account signup/login (email OTP step-up after password)
  - vault setup (single **unlock secret** + Argon2id tuning + auto-lock defaults; see `vault-crypto-and-data-lifecycle.md`)
  - create item
  - bulk JSON/CSV import (classify + map + `POST /vault/items/bulk`; see `system-reference.md`)
  - list items (metadata only)
  - view single item decrypt
  - update/delete
- Implement vault lock/unlock UX:
  - idle timeout auto-lock
  - manual lock
  - lock on logout
- Add error UX for cryptographic and network failures

### Deliverables
- fully working app path from login to secure item management

### Acceptance Criteria
- New user can setup vault and save/read single item
- Existing user can relock/unlock vault in same session
- No plaintext payloads in browser storage

---

## Phase 6 - Recovery Implementation

### Goal
Provide strong recovery without weakening base zero-knowledge model.

### Tasks
- Implement Recovery Key generation and storage model:
  - generate on client
  - wrap vault key with Recovery Key
  - upload only wrapped recovery artifact
- Emergency Kit UX:
  - display once
  - download/print options
  - forced confirmation step
- Recovery flow:
  - auth + step-up (today: email OTP at login; future: TOTP/WebAuthn per backlog)
  - provide Recovery Key
  - unwrap vault key client-side
  - rotate unlock / recovery material
- Account-only recovery lane:
  - recover login access
  - explicit warning that old vault is unrecoverable without recovery key

### Deliverables
- production-grade recovery journey docs + UX copy

### Acceptance Criteria
- User with Recovery Key can recover vault access
- User without Recovery Key cannot decrypt old vault
- Messaging is explicit and legally/product approved

---

## Phase 7 - Security Hardening

### Goal
Reduce exploitable risk before release.

### Tasks
- CSP hardening and third-party script minimization
- Strict CORS origin policy per environment
- Input validation and payload size limits
- API abuse controls:
  - rate limits
  - anomaly detection thresholds
- Security logging review:
  - redact all sensitive fields
  - verify no accidental secret logging
- Backup and restore drills:
  - encrypted backups
  - documented restore runbook
- Dependency and image scanning in CI

### Deliverables
- hardened production config
- security checklist sign-off

### Acceptance Criteria
- Security test suite passes
- Backup restore tested successfully
- Pre-release security review completed

---

## Phase 8 - QA, Performance, and Release Readiness

### Goal
Prove correctness, reliability, and operational readiness.

### Tasks
- Test strategy execution:
  - unit tests (ui/api)
  - API integration tests
  - end-to-end flow tests
  - negative crypto tests (tampered tag, wrong key, wrong version)
- Performance tests:
  - unlock latency budgets
  - item decrypt latency
  - DB query profiling
- Threat model review with security team
- Release checklist:
  - config parity
  - secrets management
  - rollback strategy
  - on-call plan

### Deliverables
- release candidate build
- go-live report

### Acceptance Criteria
- Test pass rate meets threshold
- SLO targets met in staging
- Final go/no-go signoff from engineering + security + product

---

## Phase 9 - Post-Launch Operations

### Goal
Operate safely and plan future crypto agility.

### Tasks
- Monitoring dashboards:
  - auth failures
  - recovery attempts
  - API error rates
  - DB health
- Incident response playbooks:
  - credential leak response
  - suspicious account activity
  - outage handling
- Rotate operational secrets and review access controls
- Introduce crypto migration framework for future algorithm updates
- Schedule periodic external pentest and internal security review

### Deliverables
- operational runbook
- quarterly security maintenance plan

### Acceptance Criteria
- Alerting works for high-severity events
- Incident drills completed
- Maintenance calendar committed and owned

---

## 5) API surface (Slim PHP)

The **authoritative route list** (including billing, admin, dev templates, and bulk import) is maintained in [system-reference.md](./system-reference.md) and `api/config/routes.php`. Update that doc whenever routes change.

---

## 6) Docker and Environment Plan

## 6.1 Root docker-compose responsibilities

- Build and run all local services
- Define service dependencies and health checks
- Expose only required ports
- Use named volumes for DB persistence
- Provide isolated network for internal service communication

## 6.2 Environment file strategy

- Root `.env.example` with only placeholders
- Real env files never committed
- Separate env sets:
  - local
  - staging
  - production

## 6.3 Container security baseline

- Run non-root users in containers where possible
- Pin base images and patch regularly
- Disable debug features in production images
- Use read-only filesystem where practical (later hardening)

---

## 7) Testing Strategy by Layer

### UI
- component/unit tests for vault forms and flows
- integration tests for lock/unlock behavior
- e2e tests for primary user journeys

### API (Slim PHP)
- route tests
- service/unit tests
- repository/DB integration tests
- contract tests for encrypted payload schema

### Security tests
- invalid token/session scenarios
- replay/tamper attempts
- rate-limit and brute-force tests
- secret logging regression checks

---

## 8) Roles and Ownership (Recommended)

- **Frontend owner:** UI flows, key lifecycle in client, secure UX
- **Backend owner:** Slim architecture, API contracts, auth/session, DB
- **Security owner:** threat model, security checks, pentest coordination
- **DevOps owner:** Docker, CI/CD, secrets handling, monitoring
- **Product owner:** recovery policy copy, user warnings, onboarding clarity

Each phase should have one directly accountable owner.

---

## 9) Major Risks and Mitigations

1. **Weak passphrase quality**
- Mitigation: generator-first UX + entropy checks + user education

2. **XSS compromises client-side keys**
- Mitigation: strict CSP, audit render paths, avoid unsafe HTML execution

3. **Recovery confusion**
- Mitigation: explicit irreversible warnings, forced emergency kit confirmation

4. **Scope creep before security baseline**
- Mitigation: freeze non-essential features until Phase 7 minimum hardening

5. **Docker/local drift from production**
- Mitigation: parity rules, env discipline, staging mirrors

---

## 10) Definition of Done (Global)

A phase is complete only when all are true:

1. Acceptance criteria passed
2. Tests added and passing
3. Docs updated
4. Security checks performed
5. Demo completed with stakeholder signoff

---

## 11) Recommended Build Order (Practical)

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9

Do not start recovery implementation before core vault crypto and auth are stable.

---

## 12) Maintenance

When implementation catches up or diverges from a phase description, update **this plan** for roadmap intent and update **[system-reference.md](./system-reference.md)** for concrete contracts (routes, schema, limits).

