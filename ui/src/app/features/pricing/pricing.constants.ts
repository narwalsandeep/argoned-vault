/** Public Git repository for the open-source story (update if the canonical URL changes). */
export const PRICING_OPEN_SOURCE_REPO_URL = 'https://github.com/switchcodes/argoned';

export type AppPlanKey = 'free' | 'pro' | 'lifetime';

export interface AppPlanCatalogEntry {
  key: AppPlanKey;
  title: string;
  itemLimit: number;
  features: readonly string[];
}

/**
 * Single source of truth for plan limits/features shown in the vault UI.
 * Keep this aligned with product decisions; both Pricing and Subscription pages read from this map.
 */
export const APP_PLAN_CATALOG: Record<AppPlanKey, AppPlanCatalogEntry> = {
  free: {
    key: 'free',
    title: 'Free',
    itemLimit: 8,
    features: [
      'Up to 8 vault items',
      'Full encryption pipeline (same as paid)',
      'All future updates included',
      'Bulk import (CSV / JSON) is reserved for Pro & Lifetime',
    ],
  },
  pro: {
    key: 'pro',
    title: 'Pro',
    itemLimit: 512,
    features: [
      'Up to 512 vault items',
      'Bulk vault import: guided CSV & JSON pipelines',
      'Same security & recovery options as Free',
      'All future updates included',
    ],
  },
  lifetime: {
    key: 'lifetime',
    title: 'Lifetime',
    itemLimit: 512,
    features: [
      'Up to 512 vault items',
      'Bulk vault import: same CSV & JSON migration tools as Pro',
      'No recurring charge after purchase',
      'All future updates included',
    ],
  },
};
