import type { CredentialSubtype } from '../credential.types';
import { getCredentialFormSchema } from '../credential-form-schema';
import { getSimpleVaultItemFormSchema } from '../simple-vault-item-form-schema';
import type { SimpleVaultItemKind } from '../../vault/vault-item-display';

/** Legacy sentinel; mapping UI no longer offers this; {@link sanitizeImportKeyMapValues} strips it. */
export const IMPORT_KEY_MAP_IGNORE = '_ignore' as const;

export interface ImportFieldTargetOption {
  value: string;
  label: string;
}

/** Bump when form schemas add/remove field keys so cached target lists refresh. */
const IMPORT_FIELD_TARGET_CACHE_VERSION = 4;

const TARGET_CACHE = new Map<string, readonly ImportFieldTargetOption[]>();

function asSimpleKind(itemType: string): SimpleVaultItemKind | null {
  if (itemType === 'password' || itemType === 'key' || itemType === 'id' || itemType === 'secure_note') {
    return itemType;
  }
  return null;
}

function credentialSubtypeFromItemType(itemType: string): CredentialSubtype | null {
  if (itemType === 'credential') {
    return 'website';
  }
  if (itemType.startsWith('credential:')) {
    return itemType.slice('credential:'.length) as CredentialSubtype;
  }
  return null;
}

function buildTargetOptions(itemType: string): readonly ImportFieldTargetOption[] {
  const simple = asSimpleKind(itemType);
  if (simple) {
    return getSimpleVaultItemFormSchema(simple).fields.map((f) => ({ value: f.key, label: f.label }));
  }
  const sub = credentialSubtypeFromItemType(itemType);
  if (sub) {
    const schema = getCredentialFormSchema(sub);
    if (schema) {
      return schema.fields.map((f) => ({ value: f.key, label: f.label }));
    }
  }
  const generic = getCredentialFormSchema('generic');
  return generic ? generic.fields.map((f) => ({ value: f.key, label: f.label })) : [];
}

/**
 * Selectable vault fields for import key mapping (one row per target field).
 * Cached by `item_type` string.
 */
export function getImportFieldTargetOptions(itemType: string): readonly ImportFieldTargetOption[] {
  const cacheKey = `${IMPORT_FIELD_TARGET_CACHE_VERSION}\u0001${itemType}`;
  let row = TARGET_CACHE.get(cacheKey);
  if (!row) {
    row = buildTargetOptions(itemType);
    TARGET_CACHE.set(cacheKey, row);
  }
  return row;
}

/**
 * Options for the per-key mapping `<select>`; every source key must map to one of these (no “skip”).
 */
export function getImportFieldSelectOptions(itemType: string): ImportFieldTargetOption[] {
  return [...getImportFieldTargetOptions(itemType)];
}

/** When a value is missing or not a valid field for this type, map here so nothing is dropped. */
export function getImportFieldFallbackTarget(itemType: string): string {
  const opts = getImportFieldTargetOptions(itemType);
  if (opts.length === 0) {
    return 'notes';
  }
  if (itemType === 'secure_note') {
    const body = opts.find((o) => o.value === 'body');
    if (body) {
      return 'body';
    }
  }
  const notes = opts.find((o) => o.value === 'notes');
  if (notes) {
    return 'notes';
  }
  return opts[opts.length - 1].value;
}

/** Ensures `<select>` / `[selected]` always use a value that exists in {@link getImportFieldSelectOptions}. */
export function coerceImportMapSelectValue(itemType: string, value: string | undefined): string {
  if (value === undefined || value === '' || value === IMPORT_KEY_MAP_IGNORE) {
    return getImportFieldFallbackTarget(itemType);
  }
  const opts = getImportFieldSelectOptions(itemType);
  return opts.some((o) => o.value === value) ? value : getImportFieldFallbackTarget(itemType);
}

/** Coerce every target in a key map so it matches this vault type’s field list (no `_ignore`). */
export function sanitizeImportKeyMapValues(itemType: string, map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = coerceImportMapSelectValue(itemType, v);
  }
  return out;
}

/** How many distinct vault fields exist for import mapping for this `item_type`. */
export function getImportFieldTargetCount(itemType: string): number {
  return getImportFieldTargetOptions(itemType).length;
}
