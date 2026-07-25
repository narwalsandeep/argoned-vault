import { buildSuggestedKeyMap, extractImportSourceKeys } from '../../create/import-vault-items/import-key-map';

const IGNORED_DECRYPTED_KEYS = new Set(['credential_subtype', 'vault_simple_kind']);

/**
 * Keys from decrypted JSON for the change-type field map.
 * Uses the same extraction as import ({@link extractImportSourceKeys}) so ordering and `__importKey` / `value` rows match import.
 */
export function sourceKeysForVaultChangeType(decrypted: Record<string, unknown>): string[] {
  return extractImportSourceKeys(decrypted).filter((k) => !IGNORED_DECRYPTED_KEYS.has(k));
}

/** Suggested source key → target vault field map for the chosen `targetItemType`. */
export function buildChangeTypeKeyMap(
  decrypted: Record<string, unknown>,
  targetItemType: string,
): Record<string, string> {
  const keys = sourceKeysForVaultChangeType(decrypted);
  return buildSuggestedKeyMap(targetItemType, keys, decrypted);
}
