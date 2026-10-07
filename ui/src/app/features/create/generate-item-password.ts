import cryptoRandomString from 'crypto-random-string';

/** Default length for generated item passwords (credentials, password items, etc.). */
export const VAULT_ITEM_PASSWORD_DEFAULT_LENGTH = 20;

/** Symbols that work on most sites; excludes quotes and backslash. */
const PASSWORD_SYMBOLS = '!@#$%^&*()-_=+[]{}|:;,.<>?/~';

function shuffleChars(chars: string[]): string[] {
  const out = [...chars];
  for (let i = out.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Strong random password for vault item fields (uses `crypto-random-string` — Web Crypto in the browser).
 * Ensures at least one lowercase, uppercase, digit, and symbol.
 */
export function generateStrongVaultItemPassword(length = VAULT_ITEM_PASSWORD_DEFAULT_LENGTH): string {
  const safeLength = Math.max(12, Math.min(128, Math.floor(length)));

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const all = lower + upper + digits + PASSWORD_SYMBOLS;

  const required = [
    cryptoRandomString({ length: 1, characters: lower }),
    cryptoRandomString({ length: 1, characters: upper }),
    cryptoRandomString({ length: 1, characters: digits }),
    cryptoRandomString({ length: 1, characters: PASSWORD_SYMBOLS }),
  ];

  const remainder = cryptoRandomString({ length: safeLength - required.length, characters: all });
  return shuffleChars((required.join('') + remainder).split('')).join('');
}
