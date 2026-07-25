import { describe, expect, it } from 'vitest';

import { PUBLIC_PLAN_DISPLAY_PRICES } from './pricing.constants';

describe('PUBLIC_PLAN_DISPLAY_PRICES', () => {
  it('shows Pro at £2.99 per month (keep in sync with website pricing-display.constants.ts)', () => {
    expect(PUBLIC_PLAN_DISPLAY_PRICES.pro.amountLabel).toBe('£2.99');
  });
});
