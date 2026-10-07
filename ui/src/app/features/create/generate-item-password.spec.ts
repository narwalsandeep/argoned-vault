import { describe, expect, it } from 'vitest';

import { generateStrongVaultItemPassword } from './generate-item-password';

describe('generateStrongVaultItemPassword', () => {
  it('returns a password of at least 12 characters with mixed classes', () => {
    const pwd = generateStrongVaultItemPassword();
    expect(pwd.length).toBeGreaterThanOrEqual(20);
    expect(/[a-z]/.test(pwd)).toBe(true);
    expect(/[A-Z]/.test(pwd)).toBe(true);
    expect(/\d/.test(pwd)).toBe(true);
    expect(/[^a-zA-Z0-9]/.test(pwd)).toBe(true);
  });

  it('respects length bounds', () => {
    expect(generateStrongVaultItemPassword(8).length).toBe(12);
    expect(generateStrongVaultItemPassword(24).length).toBe(24);
  });
});
