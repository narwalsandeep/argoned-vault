import { describe, expect, it } from 'vitest';

import { shouldClearVaultKeyOnNavigation } from './vault-route-lock';

describe('shouldClearVaultKeyOnNavigation', () => {
  it('clears only for public auth/legal routes', () => {
    expect(shouldClearVaultKeyOnNavigation('/login')).toBe(true);
    expect(shouldClearVaultKeyOnNavigation('/signup')).toBe(true);
    expect(shouldClearVaultKeyOnNavigation('/terms')).toBe(true);
  });

  it('does not clear when moving inside the app (vault, create, dashboard)', () => {
    expect(shouldClearVaultKeyOnNavigation('/vault')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/vault/items')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/new')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/new/credentials/website')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/dashboard')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/settings')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/profile')).toBe(false);
    expect(shouldClearVaultKeyOnNavigation('/home')).toBe(false);
  });
});
