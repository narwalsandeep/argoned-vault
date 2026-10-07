import { describe, expect, it } from 'vitest';

import {
  SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS,
  SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS,
  VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES,
  buildSuggestedVaultUnlockSecret,
  isVaultSessionAutoLockIdleMinuteValue,
  nearestVaultSessionAutoLockMinutes,
} from './vault-unlock-policy';

describe('nearestVaultSessionAutoLockMinutes', () => {
  it('snaps legacy 5-minute default toward the nearest preset', () => {
    expect(nearestVaultSessionAutoLockMinutes(5)).toBe(4);
  });

  it('returns default for non-positive or non-finite input', () => {
    expect(nearestVaultSessionAutoLockMinutes(0)).toBe(VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES);
    expect(nearestVaultSessionAutoLockMinutes(-3)).toBe(VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES);
    expect(nearestVaultSessionAutoLockMinutes(Number.NaN)).toBe(VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES);
  });

  it('preserves exact preset values', () => {
    expect(nearestVaultSessionAutoLockMinutes(64)).toBe(64);
    expect(nearestVaultSessionAutoLockMinutes(2)).toBe(2);
  });
});

describe('isVaultSessionAutoLockIdleMinuteValue', () => {
  it('accepts only allowed minute presets', () => {
    expect(isVaultSessionAutoLockIdleMinuteValue(8)).toBe(true);
    expect(isVaultSessionAutoLockIdleMinuteValue(5)).toBe(false);
    expect(isVaultSessionAutoLockIdleMinuteValue('8')).toBe(true);
  });
});

describe('buildSuggestedVaultUnlockSecret', () => {
  it('returns hyphenated lowercase words, min length and min word count', () => {
    for (let k = 0; k < 32; k++) {
      const s = buildSuggestedVaultUnlockSecret();
      expect(s.length).toBeGreaterThanOrEqual(SUGGESTED_VAULT_PASSPHRASE_MIN_CHARS);
      const parts = s.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(SUGGESTED_VAULT_PASSPHRASE_MIN_WORDS);
      expect(parts.every((p) => /^[a-z]+$/.test(p))).toBe(true);
      expect(new Set(parts).size).toBe(parts.length);
    }
  });

  it('completes quickly with a large word list (no infinite loop)', () => {
    const t0 = performance.now();
    for (let k = 0; k < 80; k++) {
      buildSuggestedVaultUnlockSecret();
    }
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
