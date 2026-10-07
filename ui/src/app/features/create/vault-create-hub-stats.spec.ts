import { describe, expect, it } from 'vitest';

import {
  buildCreateHubCategoryCounts,
  buildCredentialSubtypeCounts,
  countForCreateHubOption,
} from './vault-create-hub-stats';

describe('vault-create-hub-stats', () => {
  it('buildCreateHubCategoryCounts groups credential and credential:* as credentials', () => {
    const items = [
      { item_type: 'credential:website' },
      { item_type: 'credential' },
      { item_type: 'password' },
      { item_type: 'key' },
      { item_type: 'id' },
      { item_type: 'secure_note' },
    ];
    expect(buildCreateHubCategoryCounts(items)).toEqual({
      credentials: 2,
      password: 1,
      key: 1,
      id: 1,
      secureNote: 1,
      file: 0,
    });
  });

  it('buildCredentialSubtypeCounts maps bare credential to website and unknown subtype to generic', () => {
    const items = [
      { item_type: 'credential:ssh' },
      { item_type: 'credential' },
      { item_type: 'credential:unknown' },
      { item_type: 'password' },
    ];
    const c = buildCredentialSubtypeCounts(items);
    expect(c['ssh']).toBe(1);
    expect(c['website']).toBe(1);
    expect(c['generic']).toBe(1);
  });

  it('countForCreateHubOption reads Create hub ids', () => {
    const counts = buildCreateHubCategoryCounts([{ item_type: 'secure_note' }, { item_type: 'secure_note' }]);
    expect(countForCreateHubOption('secure-note', counts)).toBe(2);
  });
});
