import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { VaultReadinessService } from './vault-readiness.service';

/**
 * Onboarding is only for users without a vault profile; otherwise send them to the app.
 */
export const onboardingAllowedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const readiness = inject(VaultReadinessService);

  return readiness.ensureProfileExists().pipe(
    map((hasProfile) => (hasProfile ? router.createUrlTree(['/dashboard']) : true)),
  );
};
