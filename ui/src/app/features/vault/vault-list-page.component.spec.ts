import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { VaultService } from '../../core/vault/vault.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultListPageComponent } from './vault-list-page.component';

describe('VaultListPageComponent', () => {
  let exportItemsJson: ReturnType<typeof vi.fn>;
  let decryptItemPayload: ReturnType<typeof vi.fn>;
  let toastSuccess: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    exportItemsJson = vi.fn(() =>
      of([
        {
          id: '11111111-1111-1111-1111-111111111111',
          user_id: 'u1',
          item_type: 'secure_note',
          searchable_words: null,
          label_ciphertext: null,
          wrapped_dek: 'wrapped',
          wrapped_dek_nonce: 'nonce',
          wrapped_dek_tag: 'tag',
          payload_ciphertext: 'payload',
          payload_nonce: 'payload_nonce',
          payload_tag: 'payload_tag',
          crypto_version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]),
    );
    decryptItemPayload = vi.fn(async () => ({ title: 'Example title', username: 'user@example.com' }));
    toastSuccess = vi.fn();
    toastError = vi.fn();

    await TestBed.configureTestingModule({
      imports: [VaultListPageComponent],
      providers: [
        { provide: VaultService, useValue: { exportItemsJson } },
        { provide: WebCryptoService, useValue: { decryptItemPayload } },
        { provide: VaultSessionService, useValue: { isUnlocked: () => true } },
        { provide: ToastService, useValue: { success: toastSuccess, error: toastError } },
      ],
    })
      .overrideComponent(VaultListPageComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('exports decrypted non-file vault items as a json download', async () => {
    const fixture = TestBed.createComponent(VaultListPageComponent);
    const component = fixture.componentInstance;
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.fn();
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue({ click: clickSpy } as unknown as HTMLAnchorElement);

    await component.exportVaultAsJson();

    expect(exportItemsJson).toHaveBeenCalledTimes(1);
    expect(decryptItemPayload).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test');
    expect(toastSuccess).toHaveBeenCalled();
    expect(component.exportBusy()).toBe(false);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it('shows an error toast when export fails', async () => {
    exportItemsJson.mockReturnValueOnce(throwError(() => new Error('nope')));
    const fixture = TestBed.createComponent(VaultListPageComponent);
    const component = fixture.componentInstance;

    await component.exportVaultAsJson();

    expect(toastError).toHaveBeenCalledWith('Unable to export decrypted vault items right now.');
    expect(component.exportBusy()).toBe(false);
  });

  it('shows unlock error when vault is locked', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VaultListPageComponent],
      providers: [
        { provide: VaultService, useValue: { exportItemsJson } },
        { provide: WebCryptoService, useValue: { decryptItemPayload } },
        { provide: VaultSessionService, useValue: { isUnlocked: () => false } },
        { provide: ToastService, useValue: { success: toastSuccess, error: toastError } },
      ],
    })
      .overrideComponent(VaultListPageComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(VaultListPageComponent);
    await fixture.componentInstance.exportVaultAsJson();

    expect(exportItemsJson).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Unlock vault before exporting decrypted JSON.');
  });
});

