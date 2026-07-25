import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  VAULT_ARGON2_DEFAULTS,
  VAULT_ARGON2_LIMITS,
  assertValidVaultArgon2BootstrapOptions,
  vaultArgon2FormValuesFromProfile,
  vaultArgon2MemoryKiBValidator,
  vaultArgon2MemoryOptions,
} from './vault-argon2-options';

describe('vault-argon2-options', () => {
  const memoryValidator = vaultArgon2MemoryKiBValidator();

  it('memory validator accepts stepped values in range', () => {
    expect(memoryValidator(new FormControl(131072))).toBeNull();
    expect(memoryValidator(new FormControl(65536))).toBeNull();
    expect(memoryValidator(new FormControl(262144))).toBeNull();
  });

  it('memory validator rejects out of range or off-step values', () => {
    expect(memoryValidator(new FormControl(32768))).toEqual({ argon2Memory: true });
    expect(memoryValidator(new FormControl(80000))).toEqual({ argon2MemoryStep: true });
    expect(memoryValidator(new FormControl(999999))).toEqual({ argon2Memory: true });
  });

  it('assertValidVaultArgon2BootstrapOptions enforces laptop bounds', () => {
    expect(() =>
      assertValidVaultArgon2BootstrapOptions({
        timeCost: 3,
        memoryKiB: VAULT_ARGON2_DEFAULTS.memoryKiB,
        parallelism: 1,
      }),
    ).not.toThrow();

    expect(() =>
      assertValidVaultArgon2BootstrapOptions({
        timeCost: 1,
        memoryKiB: VAULT_ARGON2_DEFAULTS.memoryKiB,
        parallelism: 1,
      }),
    ).toThrow();

    expect(() =>
      assertValidVaultArgon2BootstrapOptions({
        timeCost: 3,
        memoryKiB: 32768,
        parallelism: 1,
      }),
    ).toThrow();

    expect(() =>
      assertValidVaultArgon2BootstrapOptions({
        timeCost: 3,
        memoryKiB: 65536,
        parallelism: 3,
      }),
    ).toThrow();
  });

  it('memory options cover min to max with fixed step', () => {
    const opts = vaultArgon2MemoryOptions();
    expect(opts[0]?.kib).toBe(VAULT_ARGON2_LIMITS.memoryKiBMin);
    expect(opts[opts.length - 1]?.kib).toBe(VAULT_ARGON2_LIMITS.memoryKiBMax);
    const steps = opts.slice(1).map((o, i) => o.kib - (opts[i]?.kib ?? 0));
    expect(steps.every((s) => s === VAULT_ARGON2_LIMITS.memoryKiBStep)).toBe(true);
  });

  it('vaultArgon2FormValuesFromProfile maps stored kdf_params_json to form fields', () => {
    const patch = vaultArgon2FormValuesFromProfile('argon2id', {
      time_cost: 5,
      memory_kib: 196608,
      parallelism: 2,
    });
    expect(patch).toEqual({
      argon2_time_cost: 5,
      argon2_memory_kib: 196608,
      argon2_parallelism: 2,
    });
  });

  it('vaultArgon2FormValuesFromProfile returns null for wrong algorithm', () => {
    expect(vaultArgon2FormValuesFromProfile('pbkdf2-sha256', { iterations: 200000 })).toBeNull();
  });

  it('vaultArgon2FormValuesFromProfile snaps off-step memory to nearest ladder rung', () => {
    const patch = vaultArgon2FormValuesFromProfile('argon2id', {
      time_cost: 3,
      memory_kib: 90000,
      parallelism: 1,
    });
    expect(patch?.argon2_memory_kib).toBe(98304);
  });
});
