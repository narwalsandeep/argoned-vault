import { FormBuilder } from '@angular/forms';

import {
  backfillSearchableFromDisplayNameIfEmpty,
  clipVaultSearchableWords,
  isVaultSearchableWordsEmpty,
  resolveSearchableWordsForSave,
  vaultDisplayNameFieldKey,
  wireVaultSearchableWordsFromDisplayName,
} from './vault-searchable-words-form';
import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from './vault-searchable-words';

describe('vaultDisplayNameFieldKey', () => {
  it('prefers name over title when both exist', () => {
    expect(vaultDisplayNameFieldKey([{ key: 'title' }, { key: 'name' }])).toBe('name');
  });

  it('returns title when name is absent', () => {
    expect(vaultDisplayNameFieldKey([{ key: 'title' }, { key: 'notes' }])).toBe('title');
  });
});

describe('wireVaultSearchableWordsFromDisplayName', () => {
  it('mirrors name into searchable while searchable is empty', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: [''], name: [''] });
    wireVaultSearchableWordsFromDisplayName(form, 'name');

    form.get('name')?.setValue('My Bank');
    expect(form.get('searchable_words')?.value).toBe('My Bank');
  });

  it('does not overwrite searchable once it has content', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: ['custom hint'], name: [''] });
    wireVaultSearchableWordsFromDisplayName(form, 'name');

    form.get('name')?.setValue('My Bank');
    expect(form.get('searchable_words')?.value).toBe('custom hint');
  });

  it('resumes mirroring when searchable is cleared to empty', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: ['custom'], name: ['Old'] });
    wireVaultSearchableWordsFromDisplayName(form, 'name');

    form.get('searchable_words')?.setValue('');
    form.get('name')?.setValue('New name');
    expect(form.get('searchable_words')?.value).toBe('New name');
  });

  it('clips mirrored value to max length', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: [''], title: [''] });
    wireVaultSearchableWordsFromDisplayName(form, 'title');

    form.get('title')?.setValue('x'.repeat(VAULT_SEARCHABLE_WORDS_MAX_LENGTH + 10));
    expect(form.get('searchable_words')?.value).toHaveLength(VAULT_SEARCHABLE_WORDS_MAX_LENGTH);
  });
});

describe('backfillSearchableFromDisplayNameIfEmpty', () => {
  it('fills searchable from name when searchable is empty on load', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: [''], name: ['Bank login'] });
    backfillSearchableFromDisplayNameIfEmpty(form, 'name');
    expect(form.get('searchable_words')?.value).toBe('Bank login');
  });

  it('does not replace existing searchable on load', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: ['finance'], name: ['Bank login'] });
    backfillSearchableFromDisplayNameIfEmpty(form, 'name');
    expect(form.get('searchable_words')?.value).toBe('finance');
  });
});

describe('resolveSearchableWordsForSave', () => {
  it('returns trimmed searchable words', () => {
    expect(resolveSearchableWordsForSave({ searchable_words: '  bank prod  ' })).toBe('bank prod');
  });

  it('returns null for blank searchable words', () => {
    expect(resolveSearchableWordsForSave({ searchable_words: '   ' })).toBeNull();
  });
});

describe('isVaultSearchableWordsEmpty', () => {
  it('treats whitespace-only as empty', () => {
    expect(isVaultSearchableWordsEmpty('  ')).toBe(true);
    expect(isVaultSearchableWordsEmpty('x')).toBe(false);
  });
});

describe('clipVaultSearchableWords', () => {
  it('clips without trimming typed content', () => {
    const long = 'a'.repeat(VAULT_SEARCHABLE_WORDS_MAX_LENGTH + 5);
    expect(clipVaultSearchableWords(long)).toHaveLength(VAULT_SEARCHABLE_WORDS_MAX_LENGTH);
  });
});
