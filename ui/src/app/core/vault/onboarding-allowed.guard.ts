import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { VaultReadinessService } from './vault-readiness.service';
import { APP_POST_AUTH_LANDING_ROUTE } from './vault-app-paths';

/**
 * Onboarding is only for users without a vault profile; otherwise send them to the app.
 */
export const onboardingAllowedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const readiness = inject(VaultReadinessService);

  return readiness.ensureProfileExists().pipe(
    map((hasProfile) => (hasProfile ? router.createUrlTree([APP_POST_AUTH_LANDING_ROUTE]) : true)),
  );
};
