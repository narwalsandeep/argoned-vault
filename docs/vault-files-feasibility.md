# Vault Files Feasibility (Encrypted Attachments)

## Short answer

Yes, this is doable with the same security level as existing vault items.

If implemented correctly, file encryption/decryption can follow the exact same zero-knowledge model:

- Encrypt on client before upload
- Store ciphertext only on server/object storage
- Decrypt only on client after explicit user action
- Reuse existing key hierarchy (Unlock Key -> Vault Key -> per-item DEK)

---

## Product constraints to enforce

Requested constraints:

- Allowed types only: image, ppt/pptx, doc/docx, txt, xls/xlsx, pdf
- Max file size per file: 20 MB
- Max total storage per user: 1 GB
- No video files, no large files

Recommended policy representation:

- Validate by both extension and MIME type
- Keep a strict allowlist (deny by default)
- Enforce limits at multiple layers:
  - UI pre-check
  - API validation
  - storage-side guard (final gate)

---

## Two best technical solutions

## Solution A (recommended): Client-side encrypted files in object storage

### Flow

1. User selects file in UI.
2. UI checks type/size policy (20 MB, allowlist).
3. UI generates per-file DEK (AES-256-GCM), encrypts file in browser.
4. UI wraps DEK with Vault Key (same as existing items).
5. API issues pre-signed upload URL for object storage.
6. UI uploads encrypted bytes directly to object storage.
7. UI stores file metadata in API DB (cipher metadata, wrapped DEK, size, mime, checksum, object key).
8. Download: API authorizes and returns short-lived read URL; UI downloads ciphertext and decrypts locally.

### Why this is best

- Scales cleanly for many files/users
- Keeps API servers light (no large payload pass-through)
- Strong match with zero-knowledge model
- Easier to enforce 1 GB quota using metadata ledger

### Security notes

- Never send plaintext file bytes to API/storage
- Use authenticated encryption (AES-GCM) with unique nonce per file/chunk
- Store encrypted filename if filename sensitivity matters
- Keep short-lived signed URLs and strict path scoping

---

## Solution B: Store encrypted file blobs directly in Postgres

### Flow

- Same client-side encryption model as Solution A.
- Instead of object storage, encrypted blob is stored in DB (BYTEA/large object).

### Pros

- Simpler infra at very small scale
- Fewer moving pieces initially

### Cons (major)

- DB growth, backup, restore, vacuum, and replication cost increase quickly
- Harder and more expensive to scale
- Can impact core transactional workload

### Verdict

Viable for prototype only. Not recommended for production growth.

---

## How other platforms generally do it

From public product/security docs and architecture guidance:

- **1Password**: encrypted attachments with zero-knowledge model; supports large attachments and per-account storage quotas.
- **Bitwarden/Keeper class products**: client-side encryption, server stores ciphertext, attachment availability and limits depend on plan.
- Common pattern across major products:
  - Zero-knowledge encryption at client
  - Metadata + entitlement in app DB
  - Blob/ciphertext in dedicated object/file storage

So Blackbox should follow the same pattern as Solution A for long-term maintainability.

---

## Quota and limit enforcement design

Implement in three layers:

1. **Client checks** (fast UX):
   - deny unsupported type
   - deny file > 20 MB
2. **API checks** (authoritative):
   - re-validate MIME/extension
   - verify per-user remaining quota before issuing upload URL
3. **Commit checks**:
   - finalize metadata only if uploaded object size matches expected encrypted size
   - maintain `used_bytes` ledger and reject if exceeding 1 GB

### Critical quota correctness (must-have)

To avoid quota bypass during concurrent uploads, use a reservation model instead of only pre-checks:

1. **Init upload** (server transaction):
   - validate plan + type + requested plaintext size (`<= 20MB`)
   - compute expected encrypted size range
   - reserve bytes in `reserved_bytes` (not `used_bytes` yet)
   - issue short-lived upload URL + upload session id
2. **Finalize upload**:
   - verify object exists and exact cipher size matches expected
   - move reservation from `reserved_bytes` to `used_bytes` atomically
   - persist final metadata row
3. **Abort/expire**:
   - release reservation if upload is canceled or lease expires

This prevents race conditions where multiple parallel uploads exceed the 1GB cap.

Suggested DB fields (new table, example):

- `vault_files`: `id`, `user_id`, `vault_item_id` (optional), `object_key`, `cipher_size_bytes`, `plaintext_size_bytes`, `mime_type`, `wrapped_dek`, `nonce`, `tag`, `crypto_version`, `created_at`, `deleted_at`
- `vault_file_quota_usage`: `user_id`, `used_bytes`, `updated_at`

Recommended additions for robustness:

- `vault_file_upload_sessions`: `id`, `user_id`, `object_key`, `reserved_bytes`, `status` (`pending|uploaded|finalized|expired|aborted`), `expires_at`, `created_at`, `updated_at`
- extend `vault_file_quota_usage` with `reserved_bytes` to support in-flight uploads safely

### Orphan cleanup and lifecycle

Direct-to-storage uploads can leave orphaned ciphertext when clients drop or crash.

- Run scheduled cleanup for stale `pending`/`expired` sessions.
- Delete orphaned objects and release reservations.
- Add object lifecycle rules as a safety net (expiry for temp/pending prefixes).

---

## Cryptography model (same safety level as current vault)

- KDF: Argon2id (already in vault profile flow)
- File DEK: random 256-bit key per file (or per chunk)
- File encryption: AES-256-GCM
- DEK wrapping: with user Vault Key
- Decryption scope: only requested file, in-memory only
- Clear sensitive buffers and revoke blob URLs after use (best effort in browser)

### Metadata integrity binding (recommended)

Protect against metadata tampering/replay confusion by cryptographically binding critical fields:

- include AAD (or equivalent authenticated metadata) covering at least:
  - `file_id` (or upload session id)
  - `object_key`
  - `plaintext_size_bytes`
  - `mime_type`
  - `crypto_version`

If metadata changes, decryption/authentication must fail.

For larger future limits, chunk encryption can be added without changing trust model.

---

## Should we do this now?

## Recommendation

Yes, but ship in controlled steps:

1. MVP with Solution A, 20 MB cap, strict allowlist, 1 GB quota
2. No sharing/public links in first version
3. Add operational controls before broad rollout (malware scanning workflow, abuse detection, storage lifecycle rules)

## Why not delay too long

- Feature demand is high and technically aligned with existing architecture.
- Current vault crypto model already provides most primitives needed.

## Main future challenges

- Storage cost management and quota accounting correctness
- Secure upload/download token design
- MIME spoofing and content validation
- Browser memory pressure on low-end devices
- Key rotation and crypto migration for stored files

Additional challenges to explicitly plan for:

- Quota race conditions under concurrent uploads
- Orphaned ciphertext objects from interrupted flows
- Replay/misuse risk for signed upload/download URLs

### Type validation hardening

- Keep deny-by-default allowlist.
- Validate by:
  - extension,
  - declared MIME,
  - file signature/magic bytes (client-side before encrypt + server-side policy checks on declared type and expected format rules).
- Publish one canonical list of accepted MIME types/extensions and reject all others.

### Signed URL hardening

- Short TTL for upload/download URLs.
- Scope each URL to exact object key and operation.
- Prefer single-use semantics for finalize/download where practical.
- Log issuance and completion for audit trail and anomaly detection.

### Malware scanning note

In strict zero-knowledge design, server-side malware scanning of plaintext is not possible because server only sees ciphertext.

- Keep MVP fully zero-knowledge (recommended).
- If scanning is ever required, document trade-off clearly because it introduces a trust and privacy model change.

---

## Phase placement and delivery advice

Given current roadmap, this belongs after core stability and hardening gates:

- Build core feature after current vault baseline is stable
- Include security hardening tasks in same delivery slice (upload controls, logging hygiene, abuse/rate limits)
- Add tests and docs in same phase:
  - unit tests (type/size/quota checks)
  - integration tests (upload/commit/download/deny paths)
  - threat-focused tests (tampered metadata, unauthorized object access, replay URLs)

---

## Final recommendation

Proceed with **Solution A (client-side encrypted object storage)**.

It is the best balance of:

- security parity with existing vault model,
- operational scalability,
- and clean product evolution for future file capabilities.
