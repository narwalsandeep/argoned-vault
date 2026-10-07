import { APP_PLAN_CATALOG, type AppPlanKey } from '../pricing/pricing.constants';

export interface VaultCreateLimitSnapshot {
  plan: string;
  activeItemCount: number;
  itemLimit: number;
  blocked: boolean;
}

export function normalizeBillingPlanKey(plan: string): AppPlanKey {
  if (plan === 'pro' || plan === 'lifetime') {
    return plan;
  }
  return 'free';
}

/** Mirrors API `userMayCreateVaultItems`: no room for one more item at the plan limit. */
export function userAtVaultItemCreateLimit(plan: string, activeItemCount: number): boolean {
  const planKey = normalizeBillingPlanKey(plan);
  const limit = APP_PLAN_CATALOG[planKey].itemLimit;
  return activeItemCount >= limit;
}

export function buildVaultCreateLimitSnapshot(plan: string, activeItemCount: number): VaultCreateLimitSnapshot {
  const planKey = normalizeBillingPlanKey(plan);
  const itemLimit = APP_PLAN_CATALOG[planKey].itemLimit;
  return {
    plan: planKey,
    activeItemCount,
    itemLimit,
    blocked: activeItemCount >= itemLimit,
  };
}
