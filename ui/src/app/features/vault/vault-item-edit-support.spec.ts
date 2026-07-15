import { FormBuilder } from '@angular/forms';

import { VAULT_SEARCHABLE_WORDS_MAX_LENGTH } from '../../core/vault/vault-searchable-words';
import { classifyVaultItemForEdit, patchVaultFieldsFormFromDecrypted } from './vault-item-edit-support';

describe('classifyVaultItemForEdit', () => {
  it('classifies simple item types', () => {
    expect(classifyVaultItemForEdit('password')).toEqual({ category: 'simple', kind: 'password' });
    expect(classifyVaultItemForEdit('secure_note')).toEqual({ category: 'simple', kind: 'secure_note' });
  });

  it('classifies credential subtypes', () => {
    expect(classifyVaultItemForEdit('credential:website')).toEqual({ category: 'credential', subtype: 'website' });
    expect(classifyVaultItemForEdit('credential:api-key')).toEqual({ category: 'credential', subtype: 'api-key' });
  });

  it('marks legacy credential as unsupported', () => {
    expect(classifyVaultItemForEdit('credential')).toEqual({ category: 'unsupported', itemType: 'credential' });
  });

  it('marks unknown types as unsupported', () => {
    expect(classifyVaultItemForEdit('custom:thing')).toEqual({ category: 'unsupported', itemType: 'custom:thing' });
  });
});

describe('patchVaultFieldsFormFromDecrypted', () => {
  it('patches searchable words and fields', () => {
    const fb = new FormBuilder();
    const form = fb.group({
      searchable_words: [''],
      title: [''],
      notes: [''],
    });
    patchVaultFieldsFormFromDecrypted(
      form,
      [{ key: 'title' }, { key: 'notes' }],
      { title: 'Hello', notes: { a: 1 } },
      'alpha beta',
    );
    expect(form.get('searchable_words')?.value).toBe('alpha beta');
    expect(form.get('title')?.value).toBe('Hello');
    expect(form.get('notes')?.value).toBe('{"a":1}');
  });

  it('clips searchable_words to max length when patching the form', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: [''], title: [''] });
    const longSw = 'x'.repeat(VAULT_SEARCHABLE_WORDS_MAX_LENGTH + 12);
    patchVaultFieldsFormFromDecrypted(form, [{ key: 'title' }], { title: 't' }, longSw);
    expect(form.get('searchable_words')?.value).toHaveLength(VAULT_SEARCHABLE_WORDS_MAX_LENGTH);
  });

  it('backfills searchable from display name when searchable is empty on patch', () => {
    const fb = new FormBuilder();
    const form = fb.group({ searchable_words: [''], name: [''] });
    patchVaultFieldsFormFromDecrypted(form, [{ key: 'name' }], { name: 'Bank login' }, null);
    expect(form.get('searchable_words')?.value).toBe('Bank login');
  });
});
