/**
 * Client-only helpers for vault detail rows (lightweight). Heavy `@zxcvbn-ts` scorer stays in
 * `vault-password-zxcvbn.ts`, lazy-loaded after decrypt.
 */

/** Segments that correspond to credential password fields in flattened item JSON. */
const PASSWORD_SEGMENT = /^(password|passwd|pwd)$/i;

/** Other schema keys that store password-type material (see credential-form-schema). */
const PASSWORD_MATERIAL_SEGMENT = /^(client_secret|passphrase)$/i;

/**
 * True when the flattened key path targets a password-type field (schema keys like `password`).
 */
export function vaultFieldKeyLooksLikePassword(keyPath: string): boolean {
  return keyPath.split('.').some((seg) => {
    const s = seg.trim();
    return PASSWORD_SEGMENT.test(s) || PASSWORD_MATERIAL_SEGMENT.test(s);
  });
}
