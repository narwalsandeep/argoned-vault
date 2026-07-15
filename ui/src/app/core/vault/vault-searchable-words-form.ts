import { FormGroup } from '@angular/forms';
import type { ValidatorFn } from '@angular/forms';
import { Subscription } from 'rxjs';

import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from './vault-searchable-words';

/** Primary display label field in vault item schemas (`name` or `title`). */
export function vaultDisplayNameFieldKey(fields: readonly { key: string }[]): 'name' | 'title' | null {
  if (fields.some((f) => f.key === 'name')) {
    return 'name';
  }
  if (fields.some((f) => f.key === 'title')) {
    return 'title';
  }
  return null;
}

export function clipVaultSearchableWords(value: string): string {
  return String(value).slice(0, VAULT_SEARCHABLE_WORDS_MAX_LENGTH);
}

export function isVaultSearchableWordsEmpty(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/** Required validator: rejects empty/whitespace searchable words. */
export const vaultSearchableWordsRequiredValidator: ValidatorFn = (control) => {
  return isVaultSearchableWordsEmpty(control.value) ? { required: true } : null;
};

/** Copies display name into searchable when searchable is still empty (e.g. after inline edit load). */
export function backfillSearchableFromDisplayNameIfEmpty(form: FormGroup, displayNameKey: string): void {
  const searchableCtrl = form.get('searchable_words');
  const nameCtrl = form.get(displayNameKey);
  if (searchableCtrl === null || nameCtrl === null) {
    return;
  }
  if (!isVaultSearchableWordsEmpty(searchableCtrl.value)) {
    return;
  }
  const nameValue = nameCtrl.value;
  if (typeof nameValue !== 'string' || nameValue === '') {
    return;
  }
  searchableCtrl.setValue(clipVaultSearchableWords(nameValue), { emitEvent: false });
}

/**
 * While the user types in the display name, mirror into searchable only when searchable is empty.
 * Stops mirroring once searchable has any non-whitespace content.
 */
export function wireVaultSearchableWordsFromDisplayName(
  form: FormGroup,
  displayNameKey: string | null,
): Subscription | null {
  if (displayNameKey === null) {
    return null;
  }
  const nameCtrl = form.get(displayNameKey);
  const searchableCtrl = form.get('searchable_words');
  if (nameCtrl === null || searchableCtrl === null) {
    return null;
  }

  return nameCtrl.valueChanges.subscribe((nameValue) => {
    if (!isVaultSearchableWordsEmpty(searchableCtrl.value)) {
      return;
    }
    const next = typeof nameValue === 'string' ? clipVaultSearchableWords(nameValue) : '';
    searchableCtrl.setValue(next, { emitEvent: false });
  });
}

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
