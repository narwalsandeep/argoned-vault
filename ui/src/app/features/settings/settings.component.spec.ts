import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent (recovery load flow)', () => {
  let getRecoveryArtifact: ReturnType<typeof vi.fn>;
  let toastInfo: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getRecoveryArtifact = vi.fn();
    toastInfo = vi.fn();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        {
          provide: VaultService,
          useValue: {
            getRecoveryArtifact,
            getProfile: vi.fn(() => throwError(() => new Error('no profile in test'))),
            listItems: vi.fn(() => of([])),
            createRecoveryArtifact: vi.fn(),
            rotateRecoveryArtifact: vi.fn(),
            upsertProfile: vi.fn(),
          },
        },
        {
          provide: WebCryptoService,
          useValue: {
            isVaultUnlocked: vi.fn(() => false),
            buildRecoveryArtifact: vi.fn(),
            unlockFromRecoveryArtifact: vi.fn(),
            bootstrapVaultProfile: vi.fn(),
          },
        },
        { provide: VaultReadinessService, useValue: { markProfilePresent: vi.fn() } },
        { provide: ToastService, useValue: { info: toastInfo, success: vi.fn(), error: vi.fn() } },
        { provide: AuthService, useValue: { sendRecoveryBackupEmail: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();
  });

  it('starts with recovery server load state idle and does not fetch artifact on init', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.recoveryServerLoadState()).toBe('idle');
    expect(getRecoveryArtifact).not.toHaveBeenCalled();
  });

  it('sets loaded and latestArtifact when load returns ciphertext fields', () => {
    getRecoveryArtifact.mockReturnValue(
      of({
        status: 'ok',
        artifact: {
          id: '1',
          user_id: 'u1',
          artifact_type: 'recovery_key_wrap',
          wrapped_vault_key_recovery: 'wk',
          nonce: 'n',
          tag: 't',
          created_at: '2020-01-01',
          revoked_at: null,
        },
      }),
    );
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.loadArtifact();
    expect(fixture.componentInstance.recoveryServerLoadState()).toBe('loaded');
    expect(fixture.componentInstance.latestArtifact()).toEqual({
      artifact_type: 'recovery_key_wrap',
      wrapped_vault_key_recovery: 'wk',
      nonce: 'n',
      tag: 't',
    });
  });

  it('sets missing when artifact row lacks ciphertext fields', () => {
    getRecoveryArtifact.mockReturnValue(
      of({
        status: 'ok',
        artifact: {
          id: '1',
          user_id: 'u1',
          artifact_type: 'recovery_key_wrap',
          created_at: '2020-01-01',
          revoked_at: null,
        },
      }),
    );
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.loadArtifact();
    expect(fixture.componentInstance.recoveryServerLoadState()).toBe('missing');
    expect(fixture.componentInstance.latestArtifact()).toBeNull();
  });

  it('saveArtifact shows guidance when vault is locked', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    await fixture.componentInstance.saveArtifact();
    expect(toastInfo).toHaveBeenCalledWith('Unlock the vault first, then create a recovery backup.');
  });

  it('saveArtifact shows guidance when passphrase is missing', async () => {
    const crypto = TestBed.inject(WebCryptoService) as unknown as { isVaultUnlocked: ReturnType<typeof vi.fn> };
    crypto.isVaultUnlocked.mockReturnValue(true);
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    await fixture.componentInstance.saveArtifact();
    expect(toastInfo).toHaveBeenCalledWith(
      'Enter a recovery passphrase (12+ characters), different from your login password.',
    );
  });

  it('sets missing and clears preview when server has no artifact', () => {
    getRecoveryArtifact.mockReturnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.loadArtifact();
    expect(fixture.componentInstance.recoveryServerLoadState()).toBe('missing');
    expect(fixture.componentInstance.artifactJson()).toBe('');
    expect(fixture.componentInstance.latestArtifact()).toBeNull();
  });
});
