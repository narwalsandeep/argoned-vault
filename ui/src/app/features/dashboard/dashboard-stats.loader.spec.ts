import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { VaultService } from '../../core/vault/vault.service';
import { DashboardStatsLoader } from './dashboard-stats.loader';

describe('DashboardStatsLoader', () => {
  let vault: {
    listItems: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
    getRecoveryArtifact: ReturnType<typeof vi.fn>;
  };
  let api: { get: ReturnType<typeof vi.fn> };
  let auth: { isLoggedIn: ReturnType<typeof vi.fn>; csrfToken: ReturnType<typeof vi.fn>; tryRestoreSession: ReturnType<typeof vi.fn> };
  let loader: DashboardStatsLoader;

  beforeEach(() => {
    vault = {
      listItems: vi.fn(() => of([{ item_type: 'note', deleted_at: null }])),
      getProfile: vi.fn(() =>
        of({
          status: 'ok',
          profile: {
            kdf_algo: 'argon2id',
            kdf_params_json: { time_cost: 3 },
            kdf_salt: 'AQIDBAUGBwg=',
            crypto_version: 1,
          },
        }),
      ),
      getRecoveryArtifact: vi.fn(() =>
        of({
          status: 'ok',
          artifact: { created_at: '2026-01-01T00:00:00Z' },
        }),
      ),
    };
    api = {
      get: vi.fn(() =>
        of({
          status: 'ok',
          service: 'api',
          check: 'live',
          time: '2026-01-01T00:00:00Z',
        }),
      ),
    };
    auth = {
      isLoggedIn: vi.fn(() => true),
      csrfToken: vi.fn(() => 'csrf'),
      tryRestoreSession: vi.fn(() => of(true)),
    };

    loader = new DashboardStatsLoader(
      vault as unknown as VaultService,
      api as unknown as ApiClientService,
      auth as unknown as AuthService,
    );
  });

  it('loadVaultSnapshot reuses vault list, profile, and recovery APIs', async () => {
    const snapshot = await firstValueFrom(loader.loadVaultSnapshot());

    expect(vault.listItems).toHaveBeenCalled();
    expect(vault.getProfile).toHaveBeenCalled();
    expect(vault.getRecoveryArtifact).toHaveBeenCalled();
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.profile?.profile.kdf_algo).toBe('argon2id');
    expect(snapshot.recovery.status).toBe('present');
  });

  it('loadVaultSnapshot maps missing recovery artifact to missing', async () => {
    vault.getRecoveryArtifact.mockReturnValue(throwError(() => ({ status: 404 })));
    const snapshot = await firstValueFrom(loader.loadVaultSnapshot());
    expect(snapshot.recovery.status).toBe('missing');
  });

  it('probeLiveHealth calls public health endpoint', async () => {
    const result = await firstValueFrom(loader.probeLiveHealth());
    expect(api.get).toHaveBeenCalledWith('/health/live');
    expect(result.state).toBe('ok');
    expect(result.payloadStatus).toBe('ok');
  });

  it('ensureAuthSessionReady skips restore when CSRF is present', async () => {
    const ok = await firstValueFrom(loader.ensureAuthSessionReady());
    expect(ok).toBe(true);
    expect(auth.tryRestoreSession).not.toHaveBeenCalled();
  });

  it('ensureAuthSessionReady restores session when user exists without CSRF', async () => {
    auth.csrfToken.mockReturnValue(null);
    await firstValueFrom(loader.ensureAuthSessionReady());
    expect(auth.tryRestoreSession).toHaveBeenCalled();
  });
});
