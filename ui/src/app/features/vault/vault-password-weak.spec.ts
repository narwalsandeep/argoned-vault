import { describe, expect, it } from 'vitest';

import { vaultFieldKeyLooksLikePassword } from './vault-password-weak';

describe('vaultFieldKeyLooksLikePassword', () => {
  it('matches flattened credential password keys', () => {
    expect(vaultFieldKeyLooksLikePassword('password')).toBe(true);
    expect(vaultFieldKeyLooksLikePassword('credentials.password')).toBe(true);
    expect(vaultFieldKeyLooksLikePassword('passwd')).toBe(true);
    expect(vaultFieldKeyLooksLikePassword('nested.pwd')).toBe(true);
    expect(vaultFieldKeyLooksLikePassword('client_secret')).toBe(true);
    expect(vaultFieldKeyLooksLikePassword('oauth.passphrase')).toBe(true);
  });

  it('does not match non-password fields', () => {
    expect(vaultFieldKeyLooksLikePassword('username')).toBe(false);
    expect(vaultFieldKeyLooksLikePassword('notes')).toBe(false);
    expect(vaultFieldKeyLooksLikePassword('password_hint')).toBe(false);
    expect(vaultFieldKeyLooksLikePassword('key')).toBe(false);
    expect(vaultFieldKeyLooksLikePassword('key_label')).toBe(false);
  });
});
