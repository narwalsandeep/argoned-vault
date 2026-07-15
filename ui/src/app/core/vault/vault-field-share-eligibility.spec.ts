import { describe, expect, it } from 'vitest';

import { isVaultFieldShareEligible } from './vault-field-share-eligibility';

describe('isVaultFieldShareEligible', () => {
  it('allows password fields', () => {
    expect(isVaultFieldShareEligible('password', 'secret-value')).toBe(true);
  });

  it('rejects name and url', () => {
    expect(isVaultFieldShareEligible('name', 'My login')).toBe(false);
    expect(isVaultFieldShareEligible('url', 'https://example.com')).toBe(false);
  });

  it('rejects empty values', () => {
    expect(isVaultFieldShareEligible('secret', '   ')).toBe(false);
  });
});
