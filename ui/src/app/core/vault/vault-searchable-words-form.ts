import type { ValidatorFn } from '@angular/forms';

import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from './vault-searchable-words';

export function isVaultSearchableWordsEmpty(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/** Required validator: rejects empty/whitespace searchable words. */
export const vaultSearchableWordsRequiredValidator: ValidatorFn = (control) => {
  return isVaultSearchableWordsEmpty(control.value) ? { required: true } : null;
};

/** Trimmed searchable words for API save, or null when missing/blank. */
export function resolveSearchableWordsForSave(values: Record<string, unknown>): string | null {
  const raw = values['searchable_words'];
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed.length > VAULT_SEARCHABLE_WORDS_MAX_LENGTH
    ? trimmed.slice(0, VAULT_SEARCHABLE_WORDS_MAX_LENGTH)
    : trimmed;
}

export function vaultSearchableWordsFormControlConfig(): [string, ValidatorFn[]] {
  return ['', [vaultSearchableWordsRequiredValidator]];
}
