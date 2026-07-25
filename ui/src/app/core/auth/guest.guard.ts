import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * For routes that are only for signed-out users (login, signup, forgot password, …).
 * If a session exists, sends the user to the app home instead.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return router.parseUrl('/dashboard');
  }

  return auth.tryRestoreSession().pipe(
    map((ok) => (ok ? router.parseUrl('/dashboard') : true)),
  );
};
