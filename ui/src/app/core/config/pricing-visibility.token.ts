import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * When false, the Pricing page hides the Lifetime tier card; mirror
 * `UI_SHOW_LIFETIME_PRICING` in `api/.env` (rebuild the UI after changing `environment.*.ts`).
 */
export const SHOW_LIFETIME_ON_PRICING = new InjectionToken<boolean>('SHOW_LIFETIME_ON_PRICING', {
  providedIn: 'root',
  factory: () => environment.showLifetimeOnPricing,
});
