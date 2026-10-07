import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Argon2id parameters tuned for typical laptops (~4 to 32 GB RAM): bounded ranges only, no arbitrary values.
 * Memory is stepped in 32 MiB increments between 64 MiB and 256 MiB to stay predictable on lower-RAM machines.
 */
export const VAULT_ARGON2_LIMITS = {
  timeMin: 2,
  timeMax: 6,
  /** KiB, 64 MiB floor (safer than 32 MiB for consumer devices). */
  memoryKiBMin: 65536,
  /** KiB, 256 MiB cap so derivation stays viable on ~4 GB systems with browser overhead. */
  memoryKiBMax: 262144,
  memoryKiBStep: 32768,
  parallelismMin: 1,
  /** Laptops: 1 recommended; 2 allowed for newer multi-core machines. */
  parallelismMax: 2,
} as const;

export const VAULT_ARGON2_DEFAULTS = {
  timeCost: 3,
  memoryKiB: 131072,
  parallelism: 1,
} as const;

export function vaultArgon2TimeOptions(): readonly number[] {
  const out: number[] = [];
  for (let t = VAULT_ARGON2_LIMITS.timeMin; t <= VAULT_ARGON2_LIMITS.timeMax; t += 1) {
    out.push(t);
  }
  return out;
}

export interface VaultArgon2MemoryOption {
  kib: number;
  label: string;
}

export function vaultArgon2MemoryOptions(): readonly VaultArgon2MemoryOption[] {
  const { memoryKiBMin, memoryKiBMax, memoryKiBStep } = VAULT_ARGON2_LIMITS;
  const recommended = VAULT_ARGON2_DEFAULTS.memoryKiB;
  const options: VaultArgon2MemoryOption[] = [];
  for (let kib: number = memoryKiBMin; kib <= memoryKiBMax; kib += memoryKiBStep) {
    const mib = kib / 1024;
    const base = `${mib} MiB`;
    const label = kib === recommended ? `${base} (recommended)` : base;
    options.push({ kib, label });
  }
  return options;
}

export function vaultArgon2ParallelismOptions(): readonly number[] {
  const out: number[] = [];
  for (let p = VAULT_ARGON2_LIMITS.parallelismMin; p <= VAULT_ARGON2_LIMITS.parallelismMax; p += 1) {
    out.push(p);
  }
  return out;
}

/** Reactive forms: memory must be within range and on the KiB step from {@link VAULT_ARGON2_LIMITS.memoryKiBMin}. */
export function vaultArgon2MemoryKiBValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    const v = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(v)) {
      return { argon2Memory: true };
    }
    const { memoryKiBMin, memoryKiBMax, memoryKiBStep } = VAULT_ARGON2_LIMITS;
    if (v < memoryKiBMin || v > memoryKiBMax) {
      return { argon2Memory: true };
    }
    if ((v - memoryKiBMin) % memoryKiBStep !== 0) {
      return { argon2MemoryStep: true };
    }
    return null;
  };
}

/**
 * Throws if options are outside {@link VAULT_ARGON2_LIMITS}. Used by {@link WebCryptoService.bootstrapVaultProfile}.
 */
export function assertValidVaultArgon2BootstrapOptions(options: {
  timeCost: number;
  memoryKiB: number;
  parallelism: number;
}): void {
  const {
    timeMin,
    timeMax,
    memoryKiBMin,
    memoryKiBMax,
    memoryKiBStep,
    parallelismMin,
    parallelismMax,
  } = VAULT_ARGON2_LIMITS;
  const t = Math.floor(options.timeCost);
  const m = Math.floor(options.memoryKiB);
  const p = Math.floor(options.parallelism);
  if (
    t < timeMin ||
    t > timeMax ||
    m < memoryKiBMin ||
    m > memoryKiBMax ||
    (m - memoryKiBMin) % memoryKiBStep !== 0 ||
    p < parallelismMin ||
    p > parallelismMax
  ) {
    throw new Error('Invalid Argon2id parameters');
  }
}

export interface VaultArgon2FormValuePatch {
  argon2_time_cost: number;
  argon2_memory_kib: number;
  argon2_parallelism: number;
}

/**
 * Maps server-stored vault profile `kdf_params_json` to reactive form fields used by Argon2 controls.
 * Returns null for non-argon2id profiles. Clamps time and parallelism; snaps memory to the allowed KiB ladder
 * when the stored value is slightly off-step.
 */
export function vaultArgon2FormValuesFromProfile(
  kdfAlgo: string,
  kdfParams: Record<string, unknown> | undefined | null,
): VaultArgon2FormValuePatch | null {
  if (kdfAlgo !== 'argon2id' || kdfParams == null || typeof kdfParams !== 'object') {
    return null;
  }

  const timeRaw = kdfParams['time_cost'];
  const memoryRaw = kdfParams['memory_kib'];
  const parallelRaw = kdfParams['parallelism'];
  const timeCost = typeof timeRaw === 'number' ? timeRaw : Number(timeRaw);
  const memoryKiB = typeof memoryRaw === 'number' ? memoryRaw : Number(memoryRaw);
  const parallelism = typeof parallelRaw === 'number' ? parallelRaw : Number(parallelRaw);
  if (!Number.isFinite(timeCost) || !Number.isFinite(memoryKiB) || !Number.isFinite(parallelism)) {
    return null;
  }

  const { timeMin, timeMax, memoryKiBMin, memoryKiBMax, memoryKiBStep, parallelismMin, parallelismMax } =
    VAULT_ARGON2_LIMITS;

  const t = Math.min(timeMax, Math.max(timeMin, Math.floor(timeCost)));
  const p = Math.min(parallelismMax, Math.max(parallelismMin, Math.floor(parallelism)));

  let m = Math.floor(memoryKiB);
  m = Math.min(memoryKiBMax, Math.max(memoryKiBMin, m));
  const maxSteps = (memoryKiBMax - memoryKiBMin) / memoryKiBStep;
  const stepFloat = (m - memoryKiBMin) / memoryKiBStep;
  const stepIndex = Math.max(0, Math.min(maxSteps, Math.round(stepFloat)));
  const snapped = memoryKiBMin + stepIndex * memoryKiBStep;

  return {
    argon2_time_cost: t,
    argon2_memory_kib: snapped,
    argon2_parallelism: p,
  };
}
