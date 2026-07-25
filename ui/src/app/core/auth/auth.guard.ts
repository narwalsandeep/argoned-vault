import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return of(true);
  }

  return auth.tryRestoreSession().pipe(
    map((ok) => {
      if (ok) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};

