import { resolveSearchableWordsForSave, isVaultSearchableWordsEmpty } from './vault-searchable-words-form';
import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from './vault-searchable-words';

describe('resolveSearchableWordsForSave', () => {
  it('returns trimmed searchable words', () => {
    expect(resolveSearchableWordsForSave({ searchable_words: '  bank prod  ' })).toBe('bank prod');
  });

  it('returns null for blank searchable words', () => {
    expect(resolveSearchableWordsForSave({ searchable_words: '   ' })).toBeNull();
  });

  it('clips to max length', () => {
    const long = 'a'.repeat(VAULT_SEARCHABLE_WORDS_MAX_LENGTH + 5);
    expect(resolveSearchableWordsForSave({ searchable_words: long })).toHaveLength(VAULT_SEARCHABLE_WORDS_MAX_LENGTH);
  });
});

describe('isVaultSearchableWordsEmpty', () => {
  it('treats whitespace-only as empty', () => {
    expect(isVaultSearchableWordsEmpty('  ')).toBe(true);
    expect(isVaultSearchableWordsEmpty('x')).toBe(false);
  });
});
