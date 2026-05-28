import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { BillingApiService } from './billing-api.service';

/** Allows `/new/import` when billing summary grants `capabilities.vault_import`. */
export const vaultImportEntitledGuard: CanActivateFn = () => {
  const billing = inject(BillingApiService);
  const router = inject(Router);

  return billing.getSummary().pipe(
    take(1),
    map((res) => {
      const allowed = res.summary.capabilities?.vault_import !== false;
      if (allowed) {
        return true;
      }
      return router.createUrlTree(['/subscription'], { queryParams: { from: 'import' } });
    }),
  );
};
