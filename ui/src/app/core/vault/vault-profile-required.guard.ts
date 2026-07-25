import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { VaultReadinessService } from './vault-readiness.service';

/**
 * Requires a vault profile for every child of the authenticated shell.
 * New accounts are redirected to `/onboarding` with a safe `returnUrl`.
 */
export const vaultProfileRequiredGuard: CanActivateChildFn = (_route, state) => {
  const router = inject(Router);
  const readiness = inject(VaultReadinessService);

  return readiness.ensureProfileExists().pipe(
    map((hasProfile) => {
      if (hasProfile) {
        return true;
      }
      return router.createUrlTree(['/onboarding'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
