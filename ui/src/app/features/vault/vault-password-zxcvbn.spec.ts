import { describe, expect, it } from 'vitest';

import { isWeakVaultPassword } from './vault-password-zxcvbn';

describe('isWeakVaultPassword (zxcvbn chunk)', () => {
  it('flags empty as non-weak', () => {
    expect(isWeakVaultPassword('')).toBe(false);
    expect(isWeakVaultPassword('   ')).toBe(false);
  });

  it('flags guessable passwords', () => {
    expect(isWeakVaultPassword('password')).toBe(true);
    expect(isWeakVaultPassword('123456')).toBe(true);
    expect(isWeakVaultPassword('qwerty')).toBe(true);
  });

  it('treats strong passphrases and mixed secrets as not weak', () => {
    expect(isWeakVaultPassword('correcthorsebatterystaple')).toBe(false);
    expect(isWeakVaultPassword('goodHorse_battery39!')).toBe(false);
    expect(isWeakVaultPassword('CorrectHorseBatteryStaple2024')).toBe(false);
  });
});
