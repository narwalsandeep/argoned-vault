import { describe, expect, it } from 'vitest';

import {
  buildVaultCreateLimitSnapshot,
  normalizeBillingPlanKey,
  userAtVaultItemCreateLimit,
} from './vault-create-item-limit';

describe('vault-create-item-limit', () => {
  it('should normalize unknown plans to free', () => {
    expect(normalizeBillingPlanKey('free')).toBe('free');
    expect(normalizeBillingPlanKey('pro')).toBe('pro');
    expect(normalizeBillingPlanKey('lifetime')).toBe('lifetime');
    expect(normalizeBillingPlanKey('unknown')).toBe('free');
  });

  it('should block create when active count reaches the free limit', () => {
    expect(userAtVaultItemCreateLimit('free', 7)).toBe(false);
    expect(userAtVaultItemCreateLimit('free', 8)).toBe(true);
    expect(userAtVaultItemCreateLimit('free', 100)).toBe(true);
  });

  it('should block create when active count reaches the paid limit', () => {
    expect(userAtVaultItemCreateLimit('pro', 511)).toBe(false);
    expect(userAtVaultItemCreateLimit('pro', 512)).toBe(true);
  });

  it('should build a snapshot with blocked flag', () => {
    expect(buildVaultCreateLimitSnapshot('free', 100)).toEqual({
      plan: 'free',
      activeItemCount: 100,
      itemLimit: 8,
      blocked: true,
    });
    expect(buildVaultCreateLimitSnapshot('pro', 3).blocked).toBe(false);
  });
});
