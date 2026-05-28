import { FormGroup } from '@angular/forms';

import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from '../../core/vault/vault-searchable-words';
import type { CredentialSubtype } from '../create/credential.types';
import type { SimpleVaultItemKind } from './vault-item-display';
import { isSimpleVaultItemType } from './vault-item-display';
import { credentialSubtypeFromItemType } from './vault-credential-category';

/** Passed from vault list/detail into create forms when editing in-place. */
export interface VaultInlineEditPayload {
  itemId: string;
  decrypted: Record<string, unknown>;
  searchableWords: string | null;
}

export type VaultItemEditClassification =
  | { category: 'simple'; kind: SimpleVaultItemKind }
  | { category: 'credential'; subtype: CredentialSubtype }
  | { category: 'unsupported'; itemType: string };

export function classifyVaultItemForEdit(itemType: string): VaultItemEditClassification {
  if (isSimpleVaultItemType(itemType)) {
    return { category: 'simple', kind: itemType };
  }
  const subtype = credentialSubtypeFromItemType(itemType);
  if (subtype !== null) {
    return { category: 'credential', subtype };
  }
  return { category: 'unsupported', itemType };
}

/** Fills `searchable_words` and schema field keys from decrypted JSON (scalar → string; objects/arrays → JSON). */
export function patchVaultFieldsFormFromDecrypted(
  form: FormGroup,
  fieldKeys: readonly { key: string }[],
  decrypted: Record<string, unknown>,
  searchableWords: string | null,
): void {
  const swRaw = searchableWords === null || searchableWords === undefined ? '' : String(searchableWords);
  const patch: Record<string, string> = {
    searchable_words: swRaw.slice(0, VAULT_SEARCHABLE_WORDS_MAX_LENGTH),
  };
  for (const f of fieldKeys) {
    const v = decrypted[f.key];
    if (v === null || v === undefined) {
      patch[f.key] = '';
    } else if (typeof v === 'string') {
      patch[f.key] = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      patch[f.key] = String(v);
    } else {
      patch[f.key] = JSON.stringify(v);
    }
  }
  form.patchValue(patch);
}
