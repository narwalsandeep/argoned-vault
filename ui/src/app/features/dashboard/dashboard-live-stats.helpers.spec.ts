import { describe, expect, it } from 'vitest';

import {
  formatArgonProfileTune,
  summarizeVaultItemTypes,
  type VaultItemTypeRow,
} from './dashboard-live-stats.helpers';

describe('summarizeVaultItemTypes', () => {
  it('ignores soft-deleted rows', () => {
    const items: VaultItemTypeRow[] = [
      { item_type: 'a', deleted_at: null },
      { item_type: 'a', deleted_at: '2020-01-01' },
    ];
    expect(summarizeVaultItemTypes(items)).toEqual({
      activeCount: 1,
      distinctTypes: 1,
      sortedEntries: [{ type: 'a', count: 1 }],
    });
  });

  it('sorts by count then type', () => {
    const items: VaultItemTypeRow[] = [
      { item_type: 'credential_website', deleted_at: null },
      { item_type: 'note', deleted_at: null },
      { item_type: 'credential_website', deleted_at: null },
    ];
    const s = summarizeVaultItemTypes(items);
    expect(s.activeCount).toBe(3);
    expect(s.distinctTypes).toBe(2);
    expect(s.sortedEntries[0]).toEqual({ type: 'credential_website', count: 2 });
    expect(s.sortedEntries[1]).toEqual({ type: 'note', count: 1 });
  });
});

describe('formatArgonProfileTune', () => {
  it('returns No profile when empty', () => {
    expect(formatArgonProfileTune(undefined, undefined)).toBe('No profile');
  });

  it('formats known Argon2id params', () => {
    expect(
      formatArgonProfileTune('argon2id', {
        time_cost: 3,
        memory_kib: 131072,
        parallelism: 1,
      }),
    ).toBe('argon2id · t=3 · m=131072 KiB · p=1');
  });
});
