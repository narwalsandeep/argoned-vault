import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { isSafeAppInternalPath } from './app-return-path';
import { VAULT_SESSION_ROUTE } from './vault-app-paths';
import { VaultSessionService } from './vault-session.service';

/**
 * Blocks create / vault item routes when the in-memory vault key is not present in this tab.
 * Redirects to {@link VAULT_SESSION_ROUTE} with optional `returnUrl` (safe internal path only).
 */
export const vaultUnlockedGuard: CanActivateFn = (_route, state) => {
  const session = inject(VaultSessionService);
  const router = inject(Router);
  if (session.isUnlocked()) {
    return true;
  }
  const returnUrl = state.url;
  const queryParams: Record<string, string> = {};
  if (isSafeAppInternalPath(returnUrl)) {
    queryParams['returnUrl'] = returnUrl;
  }
  return router.createUrlTree([VAULT_SESSION_ROUTE], { queryParams });
};
