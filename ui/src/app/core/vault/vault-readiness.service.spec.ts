import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../ui/toast.service';
import { VaultService } from './vault.service';
import { VaultReadinessService } from './vault-readiness.service';

describe('VaultReadinessService', () => {
  let vault: { getProfile: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vault = { getProfile: vi.fn() };
    toast = { error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        VaultReadinessService,
        { provide: VaultService, useValue: vault as unknown as VaultService },
        { provide: ToastService, useValue: toast as unknown as ToastService },
      ],
    });
  });

  it('returns true and caches when profile GET succeeds', async () => {
    vault.getProfile.mockReturnValue(of({ status: 'ok', profile: {} as never }));

    const service = TestBed.inject(VaultReadinessService);
    expect(await firstValueFrom(service.ensureProfileExists())).toBe(true);
    expect(await firstValueFrom(service.ensureProfileExists())).toBe(true);
    expect(vault.getProfile).toHaveBeenCalledTimes(1);
  });

  it('returns false and caches on profile_not_found 404', async () => {
    const err = new HttpErrorResponse({
      status: 404,
      error: { error: 'profile_not_found' },
    });
    vault.getProfile.mockReturnValue(throwError(() => err));

    const service = TestBed.inject(VaultReadinessService);
    expect(await firstValueFrom(service.ensureProfileExists())).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('fail-open with toast on 500 and caches true', async () => {
    const err = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
    vault.getProfile.mockReturnValue(throwError(() => err));

    const service = TestBed.inject(VaultReadinessService);
    expect(await firstValueFrom(service.ensureProfileExists())).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });

  it('invalidate clears cache so the next check calls the API again', async () => {
    vault.getProfile.mockReturnValue(of({ status: 'ok', profile: {} as never }));

    const service = TestBed.inject(VaultReadinessService);
    await firstValueFrom(service.ensureProfileExists());
    service.invalidate();
    await firstValueFrom(service.ensureProfileExists());
    expect(vault.getProfile).toHaveBeenCalledTimes(2);
  });
});
