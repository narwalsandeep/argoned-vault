# Security program, residual risks, and hardening roadmap

**Audience:** Engineering, security review, operations  
**Scope:** Argoned / Blackbox vault monorepo (`ui/` Angular SPA, `api/` Slim PHP, Postgres). Covers **implemented controls**, **known residual risks**, and **prioritized remediation** across cryptography, authentication, application abuse, transport, infrastructure, and SDLC.  

**Companion (architecture & diagrams):** [architecture-security-and-threats.md](./architecture-security-and-threats.md).  
**Companion (recovery semantics):** [account-recovery.md](./account-recovery.md), [vault-crypto-and-data-lifecycle.md](./vault-crypto-and-data-lifecycle.md).  
**Operational procedures:** [operations-runbooks.md](./operations-runbooks.md).

---

## Disclaimer

This document **does not** constitute a penetration test, certification, or legal opinion. It inventories controls visible in the codebase and documents gaps candidly. **Engage independent security assessment before asserting enterprise-grade assurance.**

---

## 1. Security objectives (what “strong” means here)

| Objective | Design stance |
|-----------|----------------|
| **Zero-knowledge vault data** | Vault plaintext and master key material are derived and used **in the browser**; the server stores ciphertext, IVs, tags, and wrapping blobs only. |
| **Separation of account vs vault** | Account password (API/auth) is distinct from vault unlock secret (client crypto). Changing login password does not rotate vault keys automatically. |
| **Integrity & confidentiality in transit** | HTTPS for browser ↔ API; dependency on TLS configuration at the reverse proxy / edge. |
| **Session integrity** | HttpOnly session cookie + CSRF double-submit on mutating API calls. |
| **Abuse resistance** | Rate limits on authentication and high-impact recovery routes (with documented limitations below). |

Residual exposure from **endpoints** (malware, XSS, malicious extensions, physical access) is **not** fully eliminated by cryptography alone—see §7.

---

## 2. Implemented controls (inventory)

### 2.1 Vault cryptography (browser)

| Area | Implementation notes |
|------|----------------------|
| Unlock key | Argon2id via `hash-wasm`; salt + tunable params stored on profile (`web-crypto.service.ts`). |
| Vault key / DEKs | AES-256-GCM (Web Crypto); per-item DEKs wrapped by vault key; versioning fields for migration. |
| Recovery lane | Optional recovery secret → SHA-256 imported as AES-GCM key wrapping vault key (distinct from Argon2 unlock path); artifact stored as ciphertext only. |
| Memory | Vault `CryptoKey` held in tab memory while unlocked; auto-lock clears (best effort in JS). |

### 2.2 Authentication & session (API)

| Area | Implementation notes |
|------|----------------------|
| Account password | PHP `password_hash` / `password_verify` with **Argon2id** (`AuthService`). |
| Step-up | Email OTP completes login; OTP challenges stored server-side (hashed/peppered per settings). |
| Session token | Opaque token; **SHA-256 hash** stored in `auth_sessions`; raw token only in HttpOnly cookie. |
| CSRF | `AuthMiddleware`: `hash_equals` between session CSRF and `X-CSRF-Token` on `POST`/`PUT`/`PATCH`/`DELETE`. |
| Cookie | Configurable `Secure` flag (`SESSION_SECURE_COOKIE`); `SameSite` behavior via cookie factory / Slim config. |

### 2.3 Authorization

Vault and billing routes resolve **`user_id` from the authenticated session**—avoid trusting client-supplied user identifiers for cross-tenant access. *(Routine regression: verify new authenticated handlers always scope by session user.)*

### 2.4 API transport & abuse

| Control | Detail |
|---------|--------|
| CORS | Allowlist from `UI_ORIGINS` / `UI_ORIGIN` (`settings.php`). |
| Security headers (API) | `SecurityHeadersMiddleware`: `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`CSP` suitable for JSON responses; dev-only mail preview exceptions documented in code. |
| Request size | `PayloadSizeMiddleware` / `MAX_REQUEST_BYTES` (~1 MiB default). |
| Rate limiting | `AbuseProtectionMiddleware`: file-backed counters under `/tmp` for auth + recovery routes (`RATE_LIMIT_*`). |
| Stripe webhooks | Raw body preserved for signature verification (`StripeWebhookRawPayloadMiddleware`); rejects missing/invalid signatures. |

### 2.5 Dangerous / dev-only surfaces

| Surface | Mitigation |
|---------|------------|
| Billing dev simulate | Gated to **localhost** + `APP_ENV=local` + env flag (`DevSimulateProBillingAction`). Must stay **disabled** in production. |
| Dev email template previews | CSP tuned for iframe previews; must not be exposed on production hosts without equivalent controls. |

### 2.6 Static SPA (production nginx image)

| Control | Detail |
|---------|--------|
| CSP & companion headers | `ui/nginx/default.conf.template`: **Content-Security-Policy**, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; **`connect-src`** includes **`NGINX_UI_CONNECT_SRC`** (Compose env; default `https://api.argoned.com`). |
| Build tweak | `Dockerfile.prod` strips `media="print" onload="…"` from built `index.html` so **`script-src`** does not require `'unsafe-inline'` for scripts. |

---

## 3. Residual risks & loopholes (prioritized)

Issues are grouped by domain. **P0** = material exposure or common exploit path before broader hardening; **P1** = important for multi-instance / production scale; **P2** = defense-in-depth or operational maturity.

### 3.1 Web application & XSS / injection

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **W1** | **SPA CSP still allows large inline `<style>` blocks** | Production nginx (`ui/nginx/default.conf.template`) sets **Content-Security-Policy** + related headers; Dockerfile strips Angular’s async stylesheet `onload` so **`script-src 'self'`** (plus **`wasm-unsafe-eval`** for `hash-wasm`). **`style-src 'self' 'unsafe-inline'`** remains required because the production build **inlines critical CSS** in `index.html`. XSS via injected styles is less severe than arbitrary script but not eliminated. | Tighten styles over time (self-hosted fonts, reduce inlined CSS); optional nonce pipeline for styles; keep lint ban on dangerous DOM APIs (`innerHTML`, etc.). |
| **W2** | **Template injection / unsafe DOM** | No current `innerHTML` / `bypassSecurityTrust` hits in `ui/src`; **keep** lint/CI grep for these APIs; prefer Angular sanitization. | Mandatory review for any future rich HTML (email rendering in-app, markdown). |
| **W3** | **Third-party scripts** | Google Fonts loaded from CDN in `index.html`—supply-chain / integrity considerations. | Consider **self-hosted fonts** or **SRI** if policy requires; subresource integrity where applicable. |

### 3.2 Transport & edge

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **T1** | **HSTS / TLS policy not defined in-repo for UI/API** | Depends on host nginx / ALB / CloudFront. Misconfiguration → downgrade / cookie exposure. | Document required TLS versions/ciphers; enable **HSTS** at edge for production apex; enforce HTTPS redirects; align `SESSION_SECURE_COOKIE=true`. |
| **T2** | **`X-Forwarded-For` trust** | Rate limiting uses first XFF hop (`AbuseProtectionMiddleware`). Spoofing matters **only if** the edge does not strip/set trusted forwarded headers—typical misconfiguration increases abuse bypass risk. | Configure reverse proxy to **overwrite** `X-Forwarded-For` from client TCP connection; document trusted proxy hops. |

### 3.3 Sessions & authentication

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **A1** | **Second factor limited to email OTP** | Strong against password-only reuse; weaker against **SIM swap / mailbox compromise** vs TOTP/WebAuthn. | Roadmap: **WebAuthn** (preferred) or **TOTP** for account login; optional step-up for vault-sensitive actions (documented in backlog). |
| **A2** | **Session binding** | IP and User-Agent hashes are **stored** at session creation but **not re-validated** on each request—stolen cookie usable until expiry/revocation from another network fingerprint. | Consider optional **rotation on IP/UA change** (careful with mobile/WAF); shorten TTL; device/session management UX already partially supported—expand anomaly alerts. |
| **A3** | **Login OTP pepper empty in production** | If `LOGIN_OTP_PEPPER` unset in production, OTP challenge hashing strength follows schema defaults—ensure env validation **fails boot** when weak/missing in prod (policy decision). | Enforce non-empty **high-entropy pepper** in production boot checks; rotate only with OTP invalidation strategy. |

### 3.4 Vault cryptography & metadata

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **V1** | **`searchable_words` metadata** | Server stores **plaintext-derived tokens** for list/search UX—**not** zero-knowledge for that column (see architecture doc). Insider/DB leak exposes relationship metadata. | Minimize token granularity; document user-visible trade-off; consider encrypted search alternatives long-term; optional user toggle “no search hints”. |
| **V2** | **Recovery key derivation (SHA-256 of UTF-8)** | Recovery lane uses fast transformation vs Argon2 unlock path—acceptable if recovery secret is **high entropy**, weaker if users pick short secrets. | Enforce **minimum entropy policy** in UI; document recommendation for generated recovery secrets; optional Argon2-based recovery KDF for parity (migration-heavy). |
| **V3** | **Bulk import** | Large batch uploads (`POST /vault/items/bulk`) rely on auth + CSRF + existing limits—**bulk abuse** could stress DB/storage. | Stricter per-user rate/size limits; anomaly detection; CAPTCHA or proof-of-work only if abuse observed. |

### 3.5 Account recovery & break-glass

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **R1** | **`X-Account-Recovery-Token` is a shared secret** | Suitable for **operator / controlled** use; must **never** ship to public SPA bundles. Compromise = destructive reset capability for gated endpoint. | Replace with **per-user signed challenges**, email OTP proof, or operator backend tool with mTLS; keep token **server-side only** until then (see [account-recovery.md](./account-recovery.md)). |

### 3.6 API abuse controls — implementation limits

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **L1** | **Rate limiter fail-open** | If `/tmp/blackbox-rate-limit.json` cannot be locked/read (`fopen`/`flock` failure), middleware **allows** the request (`allowed => true`). Availability-first; weak under disk pressure or permission errors. | Fail-closed for auth routes **or** migrate to **Redis** / shared store with health checks; alert on fail-open paths. |
| **L2** | **File-based rate limits not HA** | Multi-instance deployments: each host maintains **separate** counters—effective allowance scales with instances. | Shared Redis (or equivalent) + sticky-less-safe compensation (global limits). |
| **L3** | **Limited route coverage** | Abuse middleware applies to enumerated auth/recovery paths—not all potentially spammy endpoints (mail triggers, etc.). | Expand coverage based on abuse telemetry; per-route budgets in settings. |

### 3.7 Infrastructure & containers

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **I1** | **Postgres network exposure** | Host port mapping (e.g. **5454**) exposes DB if firewall rules are permissive. | Bind to localhost or SG-only in cloud; **no public** Postgres; TLS to DB if traffic crosses networks. |
| **I2** | **Container hardening** | Default Docker images may run as root; broad writable FS. | Non-root users, read-only root FS where possible, minimal capabilities (see backlog). |
| **I3** | **Secrets in env** | `.env` files on disk—standard pattern but sensitive to host compromise. | Use secret manager / systemd credentials in production; restrict file ACLs; audit `.env` never committed. |

### 3.8 SDLC & supply chain

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **S1** | **Dependency vulnerabilities** | npm / Composer ecosystem churn. | CI: **`npm audit`**, **`composer audit`**, lockfile-only installs; periodic upgrades; SCA tooling. |
| **S2** | **Image vulnerabilities** | Base images (`node`, `nginx`, `php`) require periodic rebuilds. | Registry scanning; pin patch versions; rebuild on CVE disclosure. |
| **S3** | **Deterministic crypto regression tests** | Cross-layer drift risk between TS client and stored formats. | Automated vectors for wrap/unwrap, tampered tag rejection, version mismatch (tracked in backlog). |

### 3.9 Operational readiness

| ID | Risk | Detail | Remediation |
|----|------|--------|-------------|
| **O1** | **Incident response** | No substitute for playbooks for session theft, recovery abuse, suspected DB leak. | Draft **IR runbooks**, on-call rotation, backup/restore drills (encrypted backups—keys offline per policy). |
| **O2** | **Logging hygiene** | Vault plaintext must never hit logs; structured logging should classify fields. | Periodic audit of log pipelines; redaction middleware if needed. |

---

## 4. Consolidated backlog (from engineering checklist)

The following merges and **supersedes** duplicate “security checklist” bullets previously scattered across [research-todos-and-backlog.md](./research-todos-and-backlog.md) §1 for **release-oriented** items. Product/legal/backlog sections **remain** in that file.

**Must-have before asserting broad production readiness**

- [ ] Strong **MFA** beyond email OTP (WebAuthn or TOTP) + enforcement policy.
- [ ] Replace or augment account-recovery break-glass token with **ownership proof** (signed/expiry/replay-safe challenges).
- [ ] **Audit trail & alerting** for recovery attempts and sensitive auth events.
- [ ] **Deterministic crypto compatibility tests** (profile/items/tamper/version mismatch).
- [ ] **Production env validation**: `SESSION_SECURE_COOKIE=true`, strict `UI_ORIGINS`, strong `LOGIN_OTP_PEPPER`, `ACCOUNT_RECOVERY_*` policy, HTTPS + **HSTS** at edge.
- [ ] **SPA CSP** + nginx hardening for static UI.
- [ ] External **penetration test** or equivalent structured assessment.

**Should-have (scale & resilience)**

- [ ] Replace file rate limiter with **Redis** (or similar) for multi-instance parity; revisit fail-open behavior.
- [ ] Container **non-root**, read-only FS where feasible; Postgres firewall posture documented per environment.
- [ ] Backup/restore drill with evidence in runbook.

**SDL**

- [ ] CI security gates: lockfile audits, container scan, optional SAST/DAST.

---

## 5. Related documents

| Document | Role |
|----------|------|
| [architecture-security-and-threats.md](./architecture-security-and-threats.md) | Diagrams, sequences, trust boundaries, extension threat discussion—**not** the primary backlog list (see §4 above). |
| [research-todos-and-backlog.md](./research-todos-and-backlog.md) | Legal/GDPR, product research, import design archive; **§1** points here for security release summary. |
| [system-reference.md](./system-reference.md) | Routes, tables, implemented behavior. |

---

*Maintainers: when fixing or intentionally accepting risk on any §3 item, update this document or linked specs in the same PR.*
