import { catchError, map, Observable, of } from 'rxjs';

import { BillingApiService } from '../../core/billing/billing-api.service';
import { buildVaultCreateLimitSnapshot, type VaultCreateLimitSnapshot } from './vault-create-item-limit';

/** Server-backed create limit for the create hub; defaults permissive when billing is unavailable. */
export function loadVaultCreateLimitSnapshot(billing: BillingApiService): Observable<VaultCreateLimitSnapshot> {
  return billing.getDowngradeReadiness().pipe(
    map((res) => buildVaultCreateLimitSnapshot(res.downgrade.from_plan, res.downgrade.active_item_count)),
    catchError(() =>
      of(
        buildVaultCreateLimitSnapshot('free', 0),
      ),
    ),
  );
}
