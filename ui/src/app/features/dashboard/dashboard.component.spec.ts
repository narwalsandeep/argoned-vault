import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { VaultService } from '../../core/vault/vault.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [
        {
          provide: ApiClientService,
          useValue: {
            get: vi.fn(() =>
              of({
                status: 'ok',
                service: 'api',
                check: 'live',
                time: '2026-01-01T00:00:00Z',
              }),
            ),
          },
        },
        {
          provide: AuthService,
          useValue: {
            user: () => ({
              id: 'u1',
              email: 'alice@example.com',
              display_name: 'Alice',
              email_verified: true,
            }),
            csrfToken: () => 'csrf-token',
          },
        },
        {
          provide: VaultService,
          useValue: {
            listItems: vi.fn(() =>
              of([
                { item_type: 'note', deleted_at: null },
                { item_type: 'credential_website', deleted_at: null },
                { item_type: 'note', deleted_at: null },
              ]),
            ),
            getProfile: vi.fn(() =>
              of({
                status: 'ok',
                profile: {
                  kdf_algo: 'argon2id',
                  kdf_params_json: { time_cost: 3, memory_kib: 131072, parallelism: 1 },
                  kdf_salt: 'AQIDBAUGBwg=',
                  wrapped_vault_key: 'w',
                  wrapped_vault_key_nonce: 'n',
                  wrapped_vault_key_tag: 't',
                  crypto_version: 1,
                },
              }),
            ),
            getRecoveryArtifact: vi.fn(() => throwError(() => ({ status: 404 }))),
          },
        },
        {
          provide: WebCryptoService,
          useValue: {
            isVaultUnlocked: vi.fn(() => true),
            getAutoLockTimeoutMs: vi.fn(() => 300000),
            getAutoLockDeadlineEpochMs: vi.fn(() => null),
          },
        },
        { provide: VaultSessionService, useValue: { vaultKeyCleared$: of(null) } },
      ],
    });
  });

  it('renders useful live stats and marks missing recovery artifact', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect(cmp.itemCount).toBe(3);
    expect(cmp.itemDistinctTypes).toBe(2);
    expect(cmp.recoveryArtifactStatus).toBe('missing');
    expect(cmp.accountIdentityLabel).toBe('Alice');
    expect(cmp.emailVerificationLabel).toBe('verified');
  });
});
