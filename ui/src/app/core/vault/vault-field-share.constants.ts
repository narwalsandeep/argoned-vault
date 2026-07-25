/** Fixed Argon2id parameters for ephemeral field shares (server allowlist; keep in sync with API ShareKdfConfig). */
export const SHARE_ARGON2_PARAMS = {
  timeCost: 3,
  memoryKiB: 65536,
  parallelism: 1,
} as const;

export const SHARE_CRYPTO_VERSION = 1;
export const SHARE_MAX_PAYLOAD_BYTES = 4096;
export const SHARE_ACCESS_CODE_GROUPS = 4;
export const SHARE_ACCESS_CODE_GROUP_LENGTH = 4;

/** Default share lifetime when user picks preset (48 hours). */
export const SHARE_DEFAULT_EXPIRY_HOURS = 48;

export const SHARE_EXPIRY_PRESETS = [
  { id: '1h', label: '1 hour', hours: 1 },
  { id: '24h', label: '24 hours', hours: 24 },
  { id: '48h', label: '48 hours', hours: 48 },
  { id: '7d', label: '7 days', hours: 168 },
] as const;

export const SHARE_REDEEM_IDLE_CLEAR_MS = 60_000;

/** Canonical expires_at for AES-GCM AAD (encrypt + decrypt must use the same instant). */
export function normalizeShareExpiresAtForAad(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return trimmed;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }
  return new Date(parsed).toISOString();
}

export interface VaultFieldSharePayload {
  v: number;
  field_key: string;
  field_label: string;
  item_type: string;
  value: string;
}

export interface VaultFieldShareEncryptedBlob {
  crypto_version: number;
  kdf_salt: string;
  ciphertext: string;
  payload_nonce: string;
  payload_tag: string;
}

export interface VaultFieldShareFetchResponse {
  crypto_version: number;
  kdf_algo: string;
  kdf_params: { timeCost: number; memoryKiB: number; parallelism: number };
  kdf_salt: string;
  ciphertext: string;
  payload_nonce: string;
  payload_tag: string;
  expires_at: string;
}
