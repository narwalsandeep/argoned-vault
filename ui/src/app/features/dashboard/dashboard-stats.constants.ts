/**
 * Static dashboard / docs copy: matches {@link WebCryptoService} and vault item payload shape in this repo.
 */
export type DashboardStatIconId =
  | 'aes'
  | 'argon'
  | 'envelope'
  | 'nonce'
  | 'version'
  | 'browser'
  | 'routes'
  | 'recovery';

export interface DashboardStaticStat {
  readonly icon: DashboardStatIconId;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export const DASHBOARD_CRYPTO_STATS: readonly DashboardStaticStat[] = [
  {
    icon: 'aes',
    label: 'Symmetric cipher',
    value: 'AES-256-GCM',
    detail:
      'Browser AES-GCM with a 256-bit key, 12-byte IV, and 128-bit auth tag on each protected payload so tampering is rejected.',
  },
  {
    icon: 'argon',
    label: 'Vault key derivation',
    value: 'Argon2id',
    detail:
      'hash-wasm runs Argon2id to a 32-byte digest that becomes your in-memory vault key; time, memory, and threads live on your profile.',
  },
  {
    icon: 'envelope',
    label: 'Item envelope',
    value: 'DEK + wrap',
    detail:
      'Each item draws a random data key, encrypts its body with AES-GCM, then wraps that key with your vault master key only.',
  },
  {
    icon: 'nonce',
    label: 'IV length',
    value: '96-bit (12 B)',
    detail:
      'Twelve-byte IVs are generated fresh for every wrap and every item write so ciphertext never reuses the same nonce pattern.',
  },
  {
    icon: 'version',
    label: 'Item crypto version',
    value: 'v1',
    detail:
      'The v1 tag marks the row format your client expects so future upgrades can migrate safely without guessing older layouts.',
  },
  {
    icon: 'browser',
    label: 'Vault key residence',
    value: 'Tab memory only',
    detail:
      'Key material stays in this tab’s memory and is cleared on lock, idle timeout, logout, or when you end the session deliberately.',
  },
  {
    icon: 'routes',
    label: 'Shell surface',
    value: '11 routes',
    detail:
      'Major areas load on demand: Stats, Create, Vault, Session, Settings, Account, alerts, status, docs, billing, and sign-out.',
  },
  {
    icon: 'recovery',
    label: 'Recovery lane',
    value: 'Artifact + secret',
    detail:
      'The server stores your wrapped recovery blob while the passphrase stays only with you; adjust it under Settings → Recovery.',
  },
] as const;
