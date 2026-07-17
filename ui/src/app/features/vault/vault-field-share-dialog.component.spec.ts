import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { VaultFieldShareCryptoService } from '../../core/vault/vault-field-share-crypto.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultFieldShareDialogComponent } from './vault-field-share-dialog.component';

describe('VaultFieldShareDialogComponent', () => {
  let fixture: ComponentFixture<VaultFieldShareDialogComponent>;
  let shareApi: {
    prepare: ReturnType<typeof vi.fn>;
    finalize: ReturnType<typeof vi.fn>;
  };
  let shareCrypto: {
    generateAccessCode: ReturnType<typeof vi.fn>;
    encryptFieldShare: ReturnType<typeof vi.fn>;
  };
  let webCrypto: {
    noteActivity: ReturnType<typeof vi.fn>;
    unlockVaultFromProfile: ReturnType<typeof vi.fn>;
    isVaultUnlocked: ReturnType<typeof vi.fn>;
  };

  const context = {
    vaultItemId: 'item-1',
    itemType: 'credential:website',
    fieldKey: 'password',
    fieldLabel: 'Password',
    fieldValue: 'secret-value',
  };

  beforeEach(async () => {
    shareApi = {
      prepare: vi.fn(() =>
        of({
          share_id: 'abc123',
          expires_at: '2099-01-01T00:00:00.000Z',
          max_views: 1,
        }),
      ),
      finalize: vi.fn(() =>
        of({
          id: 'share-row-1',
          share_id: 'abc123',
          expires_at: '2099-01-01T00:00:00.000Z',
          max_views: 1,
          redeem_url: 'https://example.com/share/abc123',
        }),
      ),
    };
    shareCrypto = {
      generateAccessCode: vi.fn(() => 'ABCD-EFGH-IJKL-MNOP'),
      encryptFieldShare: vi.fn(async () => ({
        crypto_version: 1,
        kdf_salt: 'c2FsdA==',
        ciphertext: 'Y2lw',
        payload_nonce: 'bm9uY2U=',
        payload_tag: 'dGFn',
      })),
    };
    webCrypto = {
      noteActivity: vi.fn(),
      unlockVaultFromProfile: vi.fn(),
      isVaultUnlocked: vi.fn(() => false),
    };

    await TestBed.configureTestingModule({
      imports: [VaultFieldShareDialogComponent],
      providers: [
        { provide: VaultFieldShareApiService, useValue: shareApi },
        { provide: VaultFieldShareCryptoService, useValue: shareCrypto },
        { provide: WebCryptoService, useValue: webCrypto },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultFieldShareDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('context', context);
    fixture.detectChanges();
  });

  it('prevents native form submit so the vault session is not lost', () => {
    const event = { preventDefault: vi.fn() } as unknown as SubmitEvent;
    fixture.componentInstance.onCreateSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('creates a share from the snapshotted field value without vault unlock', async () => {
    await fixture.componentInstance.onCreate();

    expect(webCrypto.noteActivity).toHaveBeenCalled();
    expect(webCrypto.unlockVaultFromProfile).not.toHaveBeenCalled();
    expect(shareCrypto.encryptFieldShare).toHaveBeenCalledWith(
      'ABCD-EFGH-IJKL-MNOP',
      'abc123',
      '2099-01-01T00:00:00.000Z',
      expect.objectContaining({ value: 'secret-value' }),
    );
    expect(fixture.componentInstance.createdLink()).toBe('https://example.com/share/abc123');
  });

  it('uses the snapshotted value even if live context changes after open', async () => {
    fixture.componentRef.setInput('context', { ...context, fieldValue: 'changed-later' });
    fixture.detectChanges();

    await fixture.componentInstance.onCreate();

    expect(shareCrypto.encryptFieldShare).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ value: 'secret-value' }),
    );
  });

  it('shows an error when prepare fails without requesting vault unlock', async () => {
    shareApi.prepare.mockReturnValueOnce(throwError(() => new Error('network')));

    await fixture.componentInstance.onCreate();

    expect(webCrypto.unlockVaultFromProfile).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toContain('Unable to create share');
  });
});
