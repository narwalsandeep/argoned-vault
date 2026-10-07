import { describe, expect, it } from 'vitest';

import { READABLE_VAULT_SECRET_WORDS } from './vault-unlock-readable-words';

describe('READABLE_VAULT_SECRET_WORDS', () => {
  it('has 2000 real-word tokens (5-8 letters, no hyphens; spot-check)', () => {
    expect(READABLE_VAULT_SECRET_WORDS.length).toBe(2000);
    const n = READABLE_VAULT_SECRET_WORDS.length;
    const idxs = [0, 1, 2, Math.floor(n / 2) - 1, Math.floor(n / 2), n - 3, n - 2, n - 1];
    for (const i of idxs) {
      const w = READABLE_VAULT_SECRET_WORDS[i]!;
      expect(w).toMatch(/^[a-z]{5,8}$/);
      expect(w).not.toContain('-');
    }
  });
});
