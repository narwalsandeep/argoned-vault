import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Allows `/admin/*` only when the API marked this session as the configured platform admin (ADMIN_EMAIL). */
export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.user()?.platform_admin === true) {
    return true;
  }
  return inject(Router).createUrlTree(['/dashboard']);
};
