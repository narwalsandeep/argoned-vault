# Research, TODOs, and backlog

Items here are **intentionally preserved** for review: release checklists, legal follow-ups, industry comparisons, and design discussions. **Implemented truth** for routes and schema: [system-reference.md](./system-reference.md).

---

## 1. Pending security and release checklist

**Canonical document:** **[security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md)** — consolidated residual risks (§3), prioritized remediation, and merged release backlog (§4).

Keep high-level themes here only (MFA, recovery proof, SPA CSP, Redis rate limits, CI audits, pentest). **Do not fork duplicate checklists** into this file—update the security program doc when priorities change.

Legal/GDPR and non-security backlog remain in later sections of this file.

---

## 2. Phase 7 / 7.1 hardening (historical summary)

**Phase 7 (API):** Strict CORS allowlist; `PayloadSizeMiddleware` / `MAX_REQUEST_BYTES`; `AbuseProtectionMiddleware` on auth + recovery; account recovery feature gate + `X-Account-Recovery-Token`; security headers middleware. Files: `CorsMiddleware.php`, `SecurityHeadersMiddleware.php`, `AbuseProtectionMiddleware.php`, `settings.php`, `bootstrap/app.php`.

**Phase 7.1 (client crypto):** Real VK in memory; Argon2id UK; DEK wrap per item; auto-lock timers; recovery artifact helpers. Primary file: `ui/src/app/core/vault/web-crypto.service.ts`.

---

## 3. TODO — Shutdown / wind-down vault email export

**Priority:** Not urgent (policy may appear in Terms & Privacy; delivery path not implemented).

Terms/Privacy may state that if the service is discontinued, customers receive advance notice and a **vault data export** to the account email. **That pipeline is not implemented**—legal/product commitment and copy only.

**Later work:** define export format (encrypted bundle vs JSON), signed URL / attachment limits, second-factor for download, admin trigger, idempotent sends, bounce handling, audit without plaintext in logs. Align scheduling with [development-phases-plan.md](./development-phases-plan.md).

**References:** `/terms`, `/privacy`, `/pricing` (Lifetime), `/subscription`.

---

## 4. TODO — Legal pages (counsel finalisation)

Before treating Terms/Privacy as legally final:

- Add **Companies House** number and **registered office** where counsel recommends (see comment in `ui/src/app/features/legal/legal.constants.ts`).
- Confirm **effective date** in UI constants matches published policy after each change.
- On material Terms/Privacy changes, bump **`LEGAL_SIGNUP_DOCS_VERSION`** in UI **and** API `legal.signup_docs_version` together.
- Reconcile Stripe/AWS processor wording with actual agreements.

---

## 5. GDPR operational checklist (non-legal)

**Implemented baseline:** Terms + Privacy in UI; signup checkbox; API stores `terms_privacy_accepted_at` + `terms_privacy_docs_version` (sync with `LEGAL_SIGNUP_DOCS_VERSION` on material changes).

**Typical next steps:** ROPA; subprocessor list; DPIA; DSR process; breach process; international transfer paperwork; cookie consent if non-essential analytics added; marketing email opt-in separation; legacy accounts with NULL acceptance — prompt re-acceptance policy.

**References:** `ui/src/app/features/legal/`, `api/migrations/20260416180000_users_terms_privacy_acceptance.php`, `api/config/settings.php` legal block.

---

## 6. Vault security recommendations (industry + design research)

This section preserves the standalone research doc (PIN+sentence product ideas, competitor patterns, “application secret” critique, recovery options). **Note:** Current product uses a **single unlock secret** + Argon2id; multi-field unlock remains a **possible future** alignment with this research.

### 6.1 Goals recap

| Goal | Implication |
|------|-------------|
| Extremely safe | Audited primitives, client-side encryption, minimal trust in DB operators. |
| Postgres | Ciphertext + metadata only. |
| 6-digit + sentence (historical brief) | User-held secrets for KDF—with entropy caveats. |
| Forget = lose data | True zero-knowledge path. |
| Encrypt per item | DEK per row; decrypt one item when needed. |
| Attacker has PIN + sentence + DB | Should still be hard without another factor—motivates **second user-held secret** (e.g. Secret Key) or strong passphrase. |

### 6.2 How major products do it (short)

- **Bitwarden:** Master password never sent in a form that decrypts vaults; Argon2id/PBKDF2; server holds blobs only; lose master password = lose vault without separate recovery key.
- **1Password:** Account password + **Secret Key**; both needed to derive keys.
- **iCloud Keychain:** Often device + identity proof; may use escrow—different trade-offs.

**Takeaway:** Strong vaults combine **client-side derivation**, **per-item or wrapped keys**, and **no server copy of decrypting secrets**. A **second user-held secret** improves “DB + one password” resistance.

### 6.3 Recommended building blocks

1. **KDF:** Argon2id + per-user salt; tune cost for web.
2. **Key hierarchy:** Master/vault key wraps per-item DEKs; AES-256-GCM (or ChaCha20-Poly1305) with unique nonce per encryption.
3. **Decrypt one item** at a time; clear buffers after use (best effort in JS).
4. **Integrity:** AEAD tags required on decrypt.
5. **Postgres:** BYTEA ciphertext + nonces + version; blind search indexes are a **separate** easy-to-get-wrong design.

### 6.4 Two-step user secret — strengths and limits

- **6-digit PIN** alone is weak offline (~10⁶).
- **Long passphrase** adds entropy if random-like (generated phrase); famous quotes are weaker.

**Recommendations:** Treat long secret as primary entropy; salt per user; meaningful Argon2 cost; prefer generated passphrases.

### 6.5 “Application secret” in the browser

If a secret is **shipped in JS**, attackers can extract it—**little offline protection** against DB + user secrets.

Models that help: **second user-held secret** (not in DB); server-held key (breaks zero-knowledge); session-bound material (helps offline-only attackers, not malware on logged-in device); org HSM (enterprise).

**Practical suggestion:** User secrets → Argon2id; optional **Secret Key** not stored in Postgres in recoverable form; any “app pepper” for **auth only**, not vault decryption, unless accepting different trust model.

### 6.6 Recovery options (zero-knowledge aware)

1. Emergency kit / recovery key wrapping MK or VK.  
2. Shamir splits.  
3. Account recovery with identity proof → **new** vault, old data not decryptable—honest messaging.  
4. Escrow to provider key—major trust trade-off.  
5. Encrypted export for user-controlled backup.

**Recommendation:** Offer **(1)** + **(5)**; if user loses everything, state **data is unrecoverable**.

### 6.7 Web + Postgres checklist

TLS; secure cookies; CSRF; rate limits; never log secrets; separate auth password from vault secrets; `user_id` on all vault rows; encrypted backups; audit metadata; threat model for XSS, malware, phishing, insider DB.

### 6.8 Summary

- Best “safest web vault” alignment: Argon2id from **high-entropy** material + AES-GCM per item + decrypt in memory only.  
- To beat “DB + single password”: add **second user-held secret** or accept weaker model with clear disclosure.  
- Recovery: emergency key + exports; communicate irreversibility.

*Engage professional security review before production.*

---

## 7. Import — design archive and open questions

**Status (code today):** `/new/import` implements paste **JSON or CSV** → preview → classify → field map → normalize → encrypt → **`POST /vault/items/bulk`** in batches (max **512**). Server validates ciphertext only. `import_batch_id` on rows. See `import-vault-items.component.ts`, `import-vault-paste.ts`, `import-vault-csv.ts`, `BulkCreateItemsAction.php`.

**Design ideas retained for review:**

- **Solution A (deterministic local):** scoring + confidence + per-row overrides + canonical field maps + `extra` bag for unknown keys—**shipped** in spirit via classifier + mapper.
- **Solution B (optional AI):** schema-only vs full-value modes; opt-in; cache by schema fingerprint—**not required** for current product.
- **Dynamic UX ideas:** format packs (versioned declarative profiles), masked preview, worker offload for huge pastes, bulk-apply overrides, two-phase commit before upload.
- **Security checklist (ongoing):** no plaintext in logs; no plaintext in `localStorage`; vault unlock required before encrypt; duplicate-import warnings; safe errors; rate limits for bulk if abused.

**Open questions (from design reviews):**

1. How coarse should default `item_type` be for metadata privacy?  
2. Server-side `item_type` allowlist vs pattern only?  
3. Fingerprint duplicate warnings: client-only vs privacy-preserving server equality?  
4. Where do import “profiles” live (bundle vs user-editable vs signed remote)?  
5. Credential subtype inference: always user-chosen vs safe heuristics?

---

## 8. 1Password CSV → vault import (operator notes)

**Implemented:** Import textarea accepts JSON **or** CSV (if paste does not start with `{` or `[`, CSV path). Auto-batches at 512. Code: `import-vault-paste.ts`, `import-vault-csv.ts`, `import-vault-items.component.ts`.

### Observed 1Password CSV columns (format only)

| Column | Role |
|--------|------|
| `Title` | Name / sometimes URL |
| `Url` | Login URL |
| `Username` | Identifier |
| `Password` | Secret (may be quoted) |
| `OTPAuth` | `otpauth://` when present |
| `Favorite` / `Archived` | flags |
| `Tags` | optional |
| `Notes` | free text |

### Hygiene

Treat export as live credentials—never commit to git. Chunk large imports. Verify counts after each batch. Do not drop `OTPAuth` silently—map to notes or dedicated field when product supports it.

### Column → JSON key mapping (for offline converters)

`Title`→`title`, `Url`→`url`, `Username`→`username`, `Password`→`password`, `Tags`→`tags`, `Notes`→`notes`; `OTPAuth` often folded into `notes` with label until first-class TOTP exists.

---

*When closing backlog items, move factual “implemented” statements into [system-reference.md](./system-reference.md) and shorten this file.*
