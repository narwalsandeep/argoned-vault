import { describe, expect, it } from 'vitest';

import { listChangeVaultItemTypeTargets } from './change-vault-item-type-targets';

describe('listChangeVaultItemTypeTargets', () => {
  it('excludes the current item_type', () => {
    const types = listChangeVaultItemTypeTargets('password').map((t) => t.itemType);
    expect(types).not.toContain('password');
    expect(types).toContain('credential:website');
    expect(types).toContain('key');
  });

  it('returns no targets for file vault items (attachments forbid type changes)', () => {
    expect(listChangeVaultItemTypeTargets('file')).toEqual([]);
  });
});
