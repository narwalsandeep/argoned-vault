import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.service';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultQuickUnlockDialogComponent } from './vault-quick-unlock-dialog.component';

describe('VaultQuickUnlockDialogComponent', () => {
  const mockProfile = {
    kdf_algo: 'argon2id',
    kdf_params_json: {},
    kdf_salt: 'salt',
    wrapped_vault_key: 'wrapped',
    wrapped_vault_key_nonce: 'nonce',
    wrapped_vault_key_tag: 'tag',
    crypto_version: 1,
  };

  let vaultService: { getProfile: ReturnType<typeof vi.fn> };
  let webCryptoService: {
    unlockVaultFromProfile: ReturnType<typeof vi.fn>;
    setAutoLockTimeout: ReturnType<typeof vi.fn>;
  };
  let toastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vaultService = { getProfile: vi.fn() };
    webCryptoService = {
      unlockVaultFromProfile: vi.fn(),
      setAutoLockTimeout: vi.fn(),
    };
    toastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VaultQuickUnlockDialogComponent],
      providers: [
        { provide: VaultService, useValue: vaultService as unknown as VaultService },
        { provide: WebCryptoService, useValue: webCryptoService as unknown as WebCryptoService },
        { provide: ToastService, useValue: toastService as unknown as ToastService },
      ],
    }).compileComponents();
  });

  it('renders unlock secret input without auto-lock input', () => {
    const fixture = TestBed.createComponent(VaultQuickUnlockDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const secret = el.querySelector('#vault-quick-unlock-secret') as HTMLInputElement | null;
    expect(secret).not.toBeNull();
    expect(secret?.getAttribute('placeholder')).toBeNull();
    expect(el.querySelector('#vault-quick-auto-lock')).toBeNull();
    expect(el.textContent).not.toContain('Auto-lock idle');
  });

  it('focuses the secret input after the modal opens', async () => {
    const fixture = TestBed.createComponent(VaultQuickUnlockDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const secret = (fixture.nativeElement as HTMLElement).querySelector('#vault-quick-unlock-secret') as HTMLInputElement;
    expect(document.activeElement).toBe(secret);
  });

  it('clears unlock secret whenever the modal is opened again', () => {
    const fixture = TestBed.createComponent(VaultQuickUnlockDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ unlock_secret: 'must-not-persist' });
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('unlock_secret')?.value).toBe('');
  });

  it('unlocks vault using only unlock secret from modal', async () => {
    vaultService.getProfile.mockReturnValue(of({ status: 'ok', profile: mockProfile }));
    webCryptoService.unlockVaultFromProfile.mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(VaultQuickUnlockDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn(component.unlocked, 'emit');
    component.form.patchValue({ unlock_secret: 'correct secret value' });
    component.submit();
    await Promise.resolve();
    await Promise.resolve();

    expect(vaultService.getProfile).toHaveBeenCalledTimes(1);
    expect(webCryptoService.unlockVaultFromProfile).toHaveBeenCalledWith('correct secret value', mockProfile);
    expect(webCryptoService.setAutoLockTimeout).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalledWith('Vault unlocked');
  });
});
