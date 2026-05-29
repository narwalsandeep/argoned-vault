/** Public MIT-licensed repository for self-hosting and community review. */
export const PRICING_OPEN_SOURCE_REPO_URL = 'https://github.com/narwalsandeep/argoned-vault';

/** Short GitHub path shown in links and copy. */
export const PRICING_OPEN_SOURCE_REPO_LABEL = 'narwalsandeep/argoned-vault';

/**
 * GBP list prices shown on vault `/pricing`.
 * Keep in sync with `website/src/app/pricing-display.constants.ts`.
 * Stripe checkout amounts come from Stripe products; keep these labels aligned with billing.
 */
export const PUBLIC_PLAN_DISPLAY_PRICES = {
  free: { amountLabel: '£0', periodLabel: 'forever' },
  pro: { amountLabel: '£1.99', periodLabel: '/ month · GBP' },
  lifetime: { amountLabel: '£99', periodLabel: 'one-time · GBP' },
} as const;

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
