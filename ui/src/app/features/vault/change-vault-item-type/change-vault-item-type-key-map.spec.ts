import { describe, expect, it } from 'vitest';

import { buildSuggestedKeyMap } from '../../create/import-vault-items/import-key-map';

import { buildChangeTypeKeyMap, sourceKeysForVaultChangeType } from './change-vault-item-type-key-map';

describe('change-vault-item-type-key-map', () => {
  it('sourceKeysForVaultChangeType omits internal keys', () => {
    expect(
      sourceKeysForVaultChangeType({
        name: 'X',
        password: 'p',
        vault_simple_kind: 'password',
        credential_subtype: 'website',
      }).sort(),
    ).toEqual(['name', 'password']);
  });

  it('sourceKeysForVaultChangeType unwraps import-style { __importKey, value } like extractImportSourceKeys', () => {
    const wrapped = { __importKey: 'login', value: { url: 'https://a.test', user: 'u' } } as Record<string, unknown>;
    expect(sourceKeysForVaultChangeType(wrapped).sort()).toEqual(['url', 'user']);
  });

  it('buildChangeTypeKeyMap maps website-like keys toward password item', () => {
    const decrypted = { name: 'Acme', url: 'https://a.test', username: 'u', password: 'pw' };
    const m = buildChangeTypeKeyMap(decrypted, 'password');
    expect(m['password']).toBe('password');
    expect(m['username']).toBe('username');
  });

  it('buildChangeTypeKeyMap matches import buildSuggestedKeyMap for the same keys and raw payload', () => {
    const decrypted = { password: 'a', secret: 'b', url: 'http://x.example' };
    const keys = sourceKeysForVaultChangeType(decrypted);
    expect(buildChangeTypeKeyMap(decrypted, 'credential:website')).toEqual(
      buildSuggestedKeyMap('credential:website', keys, decrypted),
    );
  });
});
