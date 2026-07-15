import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SimpleVaultItemFormComponent } from './simple-vault-item-form.component';
import { VAULT_INLINE_EDIT_FORM_ID } from '../../vault/vault-item-edit-support';

describe('SimpleVaultItemFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleVaultItemFormComponent],
      providers: [provideRouter([{ path: 'new/item/:kind', component: SimpleVaultItemFormComponent }])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows header delete control when vault inline edit payload is set', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineSimpleKind', 'id');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        title: 'Passport',
        id_kind: '',
        identifier: '',
        issuer: '',
        expires: '',
        tags: '',
        notes: '',
      },
      searchableWords: 'alpha',
    });
    fixture.detectChanges();

    const del = fixture.nativeElement.querySelector('button[aria-label="Delete this vault item"]') as HTMLButtonElement | null;
    expect(del).not.toBeNull();
  });

  it('uses a single-line text input for searchable words in inline edit layout', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineSimpleKind', 'id');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        title: 'Passport',
        id_kind: '',
        identifier: '',
        issuer: '',
        expires: '',
        tags: '',
        notes: '',
      },
      searchableWords: 'alpha',
    });
    fixture.detectChanges();

    const field = fixture.nativeElement.querySelector('#vault-item-searchable-words') as HTMLInputElement | null;
    expect(field?.tagName).toBe('INPUT');
    expect(field?.type).toBe('text');
  });

  it('shows Change type in inline footer when editing from vault', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineSimpleKind', 'id');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        title: 'Passport',
        id_kind: '',
        identifier: '',
        issuer: '',
        expires: '',
        tags: '',
        notes: '',
      },
      searchableWords: null,
    });
    fixture.detectChanges();

    const buttons = [...fixture.nativeElement.querySelectorAll('.control-actions-row button')].map(
      (b) => (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(buttons.some((t) => t === 'Change type')).toBe(true);
  });

  it('hides inline header/footer actions when external toolbar is enabled', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('inlineExternalToolbar', true);
    fixture.componentRef.setInput('vaultInlineSimpleKind', 'id');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        title: 'Passport',
        id_kind: '',
        identifier: '',
        issuer: '',
        expires: '',
        tags: '',
        notes: '',
      },
      searchableWords: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Delete this vault item"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.control-actions-row')).toBeNull();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement | null;
    expect(form?.id).toBe(VAULT_INLINE_EDIT_FORM_ID);
  });

  it('mirrors title into searchable while searchable is empty', () => {
    const fixture = TestBed.createComponent(SimpleVaultItemFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineSimpleKind', 'id');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        title: '',
        id_kind: '',
        identifier: '',
        issuer: '',
        expires: '',
        tags: '',
        notes: '',
      },
      searchableWords: null,
    });
    fixture.detectChanges();

    fixture.componentInstance.form.get('title')?.setValue('Passport');
    expect(fixture.componentInstance.form.get('searchable_words')?.value).toBe('Passport');
  });
});
