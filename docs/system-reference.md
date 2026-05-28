# System reference (API, UI, database, processes)

This document tracks **implemented** behavior. Security rationale, residual risks, and backlog: [security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md). Diagrams, sequences, and extension-threat discussion: [architecture-security-and-threats.md](./architecture-security-and-threats.md).

---

## 1. Repository layout

| Path | Role |
|------|------|
| `ui/` | Angular standalone vault app; crypto in `ui/src/app/core/vault/` |
| `website/` | Angular marketing site (public pages; ships in same Compose stack) |
| `api/` | Slim PHP 8; routes in `api/config/routes.php`, actions under `api/src/Application/Http/Actions/` |
| `docker-compose.yml` (repo root) | Orchestrates `ui`, `website`, `api`, `db` (Postgres) |
| `api/migrations/` | Phinx migrations (schema source of truth) |

---

## 2. HTTP API surface

Base path for versioned API: **`/api/v1`**. Mutating calls under authenticated groups require session cookie **`bb_session`** and header **`X-CSRF-Token`** (see `AuthMiddleware`).

### 2.1 Health (no version prefix)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Postgres connectivity |

### 2.2 Public API group

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1`, `/api/v1/` | API root metadata |
| POST | `/api/v1/auth/signup` | Register; optional terms acceptance fields |
| POST | `/api/v1/auth/login` | Password verify → returns email OTP challenge (not a finished session) |
| POST | `/api/v1/auth/login/email-otp` | Complete login with OTP → session cookie + `csrf_token` |
| POST | `/api/v1/auth/login/email-otp/resend` | Resend login OTP |
| POST | `/api/v1/auth/verify-email` | Token from email |
| POST | `/api/v1/auth/verify-email/resend` | Resend verification |
| POST | `/api/v1/auth/forgot-password` | Start password reset |
| POST | `/api/v1/auth/reset-password` | Complete reset with token |
| POST | `/api/v1/auth/recovery/account-reset` | Account-only recovery (feature-gated; vault data path separate); see [account-recovery.md](./account-recovery.md) |
| GET | `/api/v1/auth/oauth/providers` | JSON: which OAuth providers have client id+secret configured |
| GET | `/api/v1/auth/oauth/{provider}/start` | `provider` ∈ `google`, `linkedin`, `facebook`; 302 to IdP; stores CSRF state in `oauth_login_states` |
| GET | `/api/v1/auth/oauth/callback` | IdP redirect; exchanges code server-side; session cookie; 302 to UI `/login?oauth=success` or `?oauth_error=…` |
| GET | `/api/v1/dev/email-templates` | Dev: list templates |
| GET | `/api/v1/dev/email-templates/view/{slug}` | Dev: preview HTML |
| POST | `/api/v1/billing/webhook` | Stripe webhook (raw body; not behind session auth) |

### 2.3 Authenticated `/api/v1/billing`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/billing/config` | Publishable Stripe price / plan metadata |
| GET | `/billing/summary` | Subscription + lifetime purchase summary |
| GET | `/billing/downgrade-readiness` | Pro→Free guardrails check (`<=8` items and `0` file vault items; lifetime always blocked) |
| GET | `/billing/invoices` | Cached invoice list |
| POST | `/billing/cancel-subscription` | Cancel at period end (Stripe API for real `sub_*` subscriptions) |
| POST | `/billing/downgrade-to-free` | Pro → Free: sets local subscription row to `canceled` only (no Stripe). Same vault pre-checks as cancel (`<=8` non-file items, `0` file vault items) |
| POST | `/billing/sync-checkout-session` | Post-checkout reconciliation |
| POST | `/billing/dev-simulate-pro` | **Local dev only:** `APP_ENV=local`, `BILLING_DEV_SIMULATE_PRO=true`, and `Host` on loopback; inserts a synthetic Pro subscription (no Stripe) |

### 2.4 Authenticated `/api/v1/auth` (session user)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me` | Current user + session flags |
| POST | `/logout` | End session |
| POST | `/password` | Change **account** password |
| GET | `/sessions` | List sessions |
| DELETE | `/sessions/{id}` | Revoke a session |
| POST | `/onboarding/security-guide` | One-time completion email: vault unlock secret + auto-lock / Argon2 settings (client-supplied; not stored server-side) + security guide |
| POST | `/recovery/backup-email` | Trigger recovery backup email |
| POST | `/display-name` | Update display name |

### 2.5 Platform admin `/api/v1/admin` (extra `PlatformAdminMiddleware`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/customers` | List customers |
| DELETE | `/customers/{id}` | Delete customer (destructive) |

### 2.6 Authenticated `/api/v1/vault`

| Method | Path | Purpose |
|--------|------|---------|
| POST, PUT | `/profile` | Upsert encrypted vault profile (client-generated ciphertext) |
| GET | `/profile` | Fetch profile for unlock |
| POST | `/items` | Create one encrypted item |
| POST | `/items/bulk` | Bulk create (import); validates each item |
| GET | `/items/export` | Export encrypted vault items as JSON (excludes `item_type: file`) |
| POST | `/files` | Create one encrypted file; body includes `vault_item_id` (must be an existing `item_type: file` row; max 64 files per item; 20MB/file, 1GB/user) |
| GET | `/files/usage` | Per-user encrypted-file bytes used + policy limits (no filenames) |
| GET | `/files` | List file metadata for one vault item; **query** `vault_item_id` (required) |
| GET | `/files/{id}` | Fetch one encrypted file payload (must belong to user’s file vault item) |
| DELETE | `/files/{id}` | Soft-delete one encrypted file |
| GET | `/items` | List items (metadata + ciphertext fields per contract) |
| GET | `/items/{id}` | Single item |
| PUT | `/items/{id}` | Update item |
| DELETE | `/items/{id}` | Delete item |
| POST | `/items/delete-all` | Erase all items for user |
| POST | `/recovery/artifact` | Store recovery artifact |
| GET | `/recovery/artifact` | Latest artifact |
| POST | `/recovery/rotate-unlock-material` | Rotate recovery-related material (server + client flow) |

---

## 3. Angular routes (`ui/src/app/app.routes.ts`)

| Path | Component / behavior |
|------|----------------------|
| `/login`, `/signup`, `/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/recovery` | Guest-gated auth; **`/login`** handles `?oauth=success` / `?oauth_error=` after OAuth callback; **`AuthOAuthButtonsComponent`** on login + signup when providers are configured |
| `/terms`, `/privacy` | Legal |
| `/onboarding` | First-run vault profile (auth + onboarding guard) |
| `/logout` | Auth-only sign-out before vault shell |
| `/dashboard`, `/settings`, `/profile`, `/vault/items`, `/vault/session`, `/new/...`, `/new/import`, `/pricing`, `/subscription`, `/subscription/downgrade`, `/status`, `/docs`, `/alert` | Inside `MasterLayoutComponent`; child routes use `vaultProfileRequiredGuard` except where noted |
| `/new/import` | **Also** `vaultImportEntitledGuard` (billing) |
| `/admin/customers` | `platformAdminGuard` |

Default redirect: `''` → `login`; unknown → `login`.

---

## 4. Authentication and session process

1. **Signup** → user row + verification email (`auth_email_tokens`).
2. **Login** `POST /auth/login`: verifies **account** password; issues short-lived **email OTP challenge** (`auth_login_email_otp_challenges`); response includes `mfa_challenge_token` (client uses this for step 2).
3. **Login complete** `POST /auth/login/email-otp`: verifies OTP; creates **`auth_sessions`** row (hashed token, CSRF secret, expiry); sets **HttpOnly** session cookie; returns `csrf_token` for SPA.
4. **OAuth (optional)**: browser hits **`GET /auth/oauth/{provider}/start`** → IdP → **`GET /auth/oauth/callback`**; API validates state, exchanges **authorization code** for tokens, reads verified email from IdP userinfo, links or creates **`user_oauth_identities`** / **`users`** (OAuth-only users may have **null** `auth_password_hash`). Redirects to SPA **`/login?oauth=success`**; login page calls **`GET /auth/me`** to load `csrf_token`. Env: **`API_PUBLIC_BASE_URL`**, **`OAUTH_*`** (see `api/.env.example`). Email+password accounts with the same email are not auto-linked (`oauth_email_password_account`).
5. **Authenticated writes**: cookie + `X-CSRF-Token` matching stored CSRF (`hash_equals`).

Account password hashing: PHP **`password_hash`** / **`password_verify`** with **`PASSWORD_ARGON2ID`** (`AuthService`) when a password is set. This is **independent** of vault unlock KDF.

---

## 5. Vault and import (end-to-end)

1. **Onboarding** (`/onboarding`): user chooses **vault unlock secret** (minimum length 12, see `VAULT_UNLOCK_SECRET_MIN_LENGTH` in `vault-unlock-policy.ts`), Argon2id parameters (bounded), and idle auto-lock preset. Client calls `WebCryptoService.bootstrapVaultProfile` → `PUT /vault/profile`.
2. **Unlock**: `GET /vault/profile` → client `unlockVaultFromProfile` → `CryptoKey` in tab memory only.
3. **Items**: create/update encrypt per-item DEK with vault key in browser; API stores ciphertext only (`VaultContractValidator`).
   - JSON export: `GET /vault/items/export` returns non-file encrypted items in one response for download workflows.
4. **Import** (`ImportVaultItemsComponent`, route `/new/import`): paste **JSON or CSV** (`import-vault-paste.ts`, `import-vault-csv.ts`) → preview → classify (`import-classifier.ts`) → user field map → normalize → encrypt (`import-encrypt.ts`) → **`POST /vault/items/bulk`** in chunks of up to **`VAULT_BULK_CREATE_MAX_ITEMS` (512)** (`vault.service.ts`). Optional correlation: `import_batch_id` stored on rows.
   - Plan gates apply server-side: Free cannot bulk import; item creation is capped by plan (`free=8`, `pro=512`, `lifetime=512`).
5. **Search hints**: server column `vault_items.searchable_words` holds **plaintext-derived search tokens** for list filtering—**not** zero-knowledge for that metadata (see architecture doc).

---

## 6. Billing (Stripe)

- Tables: `billing_customers`, `billing_subscriptions`, `billing_invoices`, `billing_event_log`, `billing_one_time_purchases` (`20260322120000_billing_stripe.php`).
- Webhook: `POST /api/v1/billing/webhook` processes Stripe events; no card PAN storage in schema.
  - `refund.created`: audit/event-log only (refund initiated).
  - `charge.refunded`: if fully refunded and linked to a one-time lifetime payment intent, the lifetime purchase row is removed.
- Plan enforcement:
  - Vault item caps are server-enforced by effective plan: Free `8`, Pro `512`, Lifetime `512`.
  - Free plan cannot use bulk import (`POST /vault/items/bulk`) and receives `vault_import_requires_upgrade`.
  - Create/import requests that exceed plan capacity receive `vault_item_limit_reached`.
  - **Planned (downgrade / over-cap):** product policy for “**choose N active items** on Free while retaining ciphertext for the rest” is in [free-tier-active-items-policy.md](./free-tier-active-items-policy.md) (server-gated access; export/upgrade; file items on Free out of scope for that model).
- UI: `/pricing`, `/subscription`; entitlement guard for import reads billing summary client-side pattern.
- UI plan copy consistency: `ui/src/app/features/pricing/pricing.constants.ts` (`APP_PLAN_CATALOG`) is the single source for displayed plan item limits/features in both Pricing and Subscription views.

---

## 7. Database tables (migrations)

| Table | Migration / notes |
|-------|-------------------|
| `users` | Core auth; columns added: `first_name`, `last_name`, `email_verified_at`, `terms_privacy_accepted_at`, `terms_privacy_docs_version`, `display_name`; **`auth_password_hash` nullable** for OAuth-only accounts |
| `user_oauth_identities` | Linked IdP subject per user (`provider`, `provider_subject`, unique per provider+subject) |
| `oauth_login_states` | Short-lived OAuth CSRF `state` (hashed), `provider`, `expires_at` |
| `auth_sessions` | Session token hash, CSRF, expiry, revoke |
| `auth_email_tokens` | Email verify + password reset tokens |
| `auth_login_email_otp_challenges` | Login OTP state |
| `vault_profiles` | One row per user; KDF + wrapped vault key |
| `vault_items` | Encrypted items + `deleted_at`, `import_batch_id`, `searchable_words`, `display_number` |
| `vault_item_display_counters` | Per-user monotonic display numbers |
| `vault_recovery_artifacts` | Wrapped vault key under recovery secret |
| `audit_events` | Security/audit metadata |
| `billing_*` | Stripe mirror tables |

Extensions: `pgcrypto` enabled in init migration.

---

## 8. Key source files (navigation)

| Area | Files |
|------|--------|
| Routes | `api/config/routes.php` |
| Auth | `api/src/Application/Http/Actions/Auth/*`, `Domain/Auth/AuthService.php`, `OAuthLoginService.php`, `SessionService.php` |
| Vault API | `api/src/Application/Http/Actions/Vault/*`, `Domain/Vault/VaultService.php` |
| Vault contract | `api/src/Domain/Vault/VaultContractValidator.php` |
| Client crypto | `ui/src/app/core/vault/web-crypto.service.ts` |
| Session UX | `ui/src/app/core/vault/vault-session.service.ts` |
| API client | `ui/src/app/core/vault/vault.service.ts`, `ui/src/app/core/auth/auth.service.ts` |

---

*Regenerate this document’s factual tables whenever `routes.php`, `app.routes.ts`, or migrations change materially.*
