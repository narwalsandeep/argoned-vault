import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CredentialFormComponent } from './credential-form.component';

describe('CredentialFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialFormComponent],
      providers: [provideRouter([{ path: 'new/credentials/:subtype', component: CredentialFormComponent }])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CredentialFormComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows header delete control when vault inline edit payload is set', () => {
    const fixture = TestBed.createComponent(CredentialFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineCredentialSubtype', 'website');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        name: 'Bank',
        url: 'https://example.com',
        username: '',
        password: '',
        tags: '',
        category: '',
        alternative_url: '',
        notes: '',
      },
      searchableWords: 'finance',
    });
    fixture.detectChanges();

    const del = fixture.nativeElement.querySelector('button[aria-label="Delete this vault item"]') as HTMLButtonElement | null;
    expect(del).not.toBeNull();
  });

  it('uses a single-line text input for searchable words in inline edit layout', () => {
    const fixture = TestBed.createComponent(CredentialFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineCredentialSubtype', 'website');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        name: 'Bank',
        url: 'https://example.com',
        username: '',
        password: '',
        tags: '',
        category: '',
        alternative_url: '',
        notes: '',
      },
      searchableWords: 'finance',
    });
    fixture.detectChanges();

    const field = fixture.nativeElement.querySelector('#vault-item-searchable-words') as HTMLInputElement | null;
    expect(field?.tagName).toBe('INPUT');
    expect(field?.type).toBe('text');
  });

  it('shows Change type in inline footer when editing from vault', () => {
    const fixture = TestBed.createComponent(CredentialFormComponent);
    fixture.componentRef.setInput('formLayout', 'inline');
    fixture.componentRef.setInput('vaultInlineCredentialSubtype', 'website');
    fixture.componentRef.setInput('vaultInlineEdit', {
      itemId: 'item-1',
      decrypted: {
        name: 'Bank',
        url: 'https://example.com',
        username: '',
        password: '',
        tags: '',
        category: '',
        alternative_url: '',
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
});
