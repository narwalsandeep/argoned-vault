import { provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { VAULT_SESSION_ROUTE } from './vault-app-paths';
import { VaultSessionService } from './vault-session.service';
import { vaultUnlockedGuard } from './vault-unlocked.guard';

describe('vaultUnlockedGuard', () => {
  it('returns true when vault is unlocked in this tab', () => {
    const session = { isUnlocked: vi.fn(() => true) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: VaultSessionService, useValue: session as unknown as VaultSessionService }],
    });
    const result = TestBed.runInInjectionContext(() =>
      vaultUnlockedGuard(
        null as never,
        { url: '/new' } as RouterStateSnapshot,
      ),
    );
    expect(result).toBe(true);
    expect(session.isUnlocked).toHaveBeenCalled();
  });

  it('redirects to session with returnUrl when locked', () => {
    const session = { isUnlocked: vi.fn(() => false) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: VaultSessionService, useValue: session as unknown as VaultSessionService }],
    });
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() =>
      vaultUnlockedGuard(
        null as never,
        { url: '/new/credentials' } as RouterStateSnapshot,
      ),
    );
    const expected = router.createUrlTree([VAULT_SESSION_ROUTE], { queryParams: { returnUrl: '/new/credentials' } });
    expect(result).toEqual(expected);
  });
});
