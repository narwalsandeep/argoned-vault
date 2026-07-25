import { READABLE_VAULT_SECRET_WORDS } from './vault-unlock-readable-words';

/**
 * Minimum vault unlock secret length everywhere (onboarding, profile bootstrap, unlock modals/panels).
 * Length is the raw string length; spaces count toward the minimum.
 */
export const VAULT_UNLOCK_SECRET_MIN_LENGTH = 12;

/** Minimum character count for onboarding “suggest passphrase” (hyphenated words). */
export const SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS = 18;

/** Minimum word count for that passphrase. */
export const SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS = 3;

/**
 * @deprecated Passphrases can exceed this; use {@link SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS} for minimum length checks.
 * Kept for older test imports that treated suggestions as fixed-length.
 */
export const SUGGESTED_VAULT_UNLOCK_SECRET_LENGTH = SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS;

/**
 * Uniform index in [0, maxExclusive). Uses 32-bit rejection sampling so it works for any list length (the naive
 * 8-bit approach has limit 0 when maxExclusive > 256 and would spin forever).
 */
function pickUnbiasedIndex(maxExclusive: number, cryptoRef: Crypto): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    throw new Error('pickUnbiasedIndex: invalid maxExclusive');
  }
  if (maxExclusive === 1) {
    return 0;
  }
  const max = 0x1_0000_0000; // 2^32
  const limit = max - (max % maxExclusive);
  const buf = new Uint32Array(1);
  for (;;) {
    cryptoRef.getRandomValues(buf);
    const r = buf[0]!;
    if (r < limit) {
      return r % maxExclusive;
    }
  }
}

function pickDistinctWord(cryptoRef: Crypto, avoid: ReadonlySet<string>): string {
  const n = READABLE_VAULT_SECRET_WORDS.length;
  for (let attempt = 0; attempt < 64; attempt++) {
    const w = READABLE_VAULT_SECRET_WORDS[pickUnbiasedIndex(n, cryptoRef)]!;
    if (!avoid.has(w)) {
      return w;
    }
  }
  return READABLE_VAULT_SECRET_WORDS[pickUnbiasedIndex(n, cryptoRef)]!;
}

/**
 * Builds a random readable vault secret: lowercase words from {@link READABLE_VAULT_SECRET_WORDS}, separated by `-`,
 * at least {@link SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS} words and total length at least {@link SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS}.
 * No word repeats within one suggestion. Users may still choose any other secret that meets {@link VAULT_UNLOCK_SECRET_MIN_LENGTH}.
 *
 * **Same phrase as another user** does not share vault encryption: onboarding derives keys with a per-profile random
 * salt and random vault key (`WebCryptoService.bootstrapVaultProfile`).
 */
export function buildSuggestedVaultUnlockSecret(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef === undefined || typeof cryptoRef.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available');
  }
  const used = new Set<string>();
  const words: string[] = [];
  const pushWord = (): void => {
    const w = pickDistinctWord(cryptoRef, used);
    used.add(w);
    words.push(w);
  };
  while (words.length < SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS) {
    pushWord();
  }
  let phrase = words.join('-');
  let guard = 0;
  while (phrase.length < SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS && guard < 32) {
    pushWord();
    phrase = words.join('-');
    guard++;
  }
  if (phrase.length < SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS) {
    throw new Error('readable word list cannot satisfy minimum passphrase length');
  }
  return phrase;
}

/** @deprecated Use {@link VAULT_UNLOCK_SECRET_MIN_LENGTH}. */
export const VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP = VAULT_UNLOCK_SECRET_MIN_LENGTH;

/** @deprecated Use {@link VAULT_UNLOCK_SECRET_MIN_LENGTH}. */
export const VAULT_UNLOCK_SECRET_MIN_UNLOCK = VAULT_UNLOCK_SECRET_MIN_LENGTH;

/** Client-side idle auto-lock presets (minutes); chosen on Vault → Session. */
export const VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS = [2, 4, 8, 16, 32, 64] as const;

export type VaultSessionAutoLockIdleMinutes = (typeof VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS)[number];

/** Default when none is set or current minutes map to an invalid legacy value. */
export const VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES: VaultSessionAutoLockIdleMinutes = 8;

const PRESET_NUMBERS: readonly number[] = VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS;

export function isVaultSessionAutoLockIdleMinuteValue(value: unknown): value is VaultSessionAutoLockIdleMinutes {
  const n = Number(value);
  return Number.isFinite(n) && PRESET_NUMBERS.includes(n);
}

/** Maps arbitrary minute counts (e.g. legacy defaults) to the nearest allowed preset. */
export function nearestVaultSessionAutoLockMinutes(minutes: number): VaultSessionAutoLockIdleMinutes {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES;
  }
  let best: VaultSessionAutoLockIdleMinutes = VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS[0];
  let bestDist = Math.abs(minutes - best);
  for (const p of VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS) {
    const d = Math.abs(minutes - p);
    if (d < bestDist || (d === bestDist && p < best)) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
