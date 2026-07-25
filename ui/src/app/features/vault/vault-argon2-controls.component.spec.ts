import { FormBuilder, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import {
  VAULT_ARGON2_DEFAULTS,
  VAULT_ARGON2_LIMITS,
  vaultArgon2MemoryKiBValidator,
} from '../../core/vault/vault-argon2-options';
import { VaultArgon2ControlsComponent } from './vault-argon2-controls.component';

describe('VaultArgon2ControlsComponent', () => {
  function buildArgonForm() {
    const fb = new FormBuilder();
    return fb.group({
      argon2_time_cost: [
        VAULT_ARGON2_DEFAULTS.timeCost,
        [
          Validators.required,
          Validators.min(VAULT_ARGON2_LIMITS.timeMin),
          Validators.max(VAULT_ARGON2_LIMITS.timeMax),
        ],
      ],
      argon2_memory_kib: [VAULT_ARGON2_DEFAULTS.memoryKiB, [Validators.required, vaultArgon2MemoryKiBValidator()]],
      argon2_parallelism: [
        VAULT_ARGON2_DEFAULTS.parallelism,
        [
          Validators.required,
          Validators.min(VAULT_ARGON2_LIMITS.parallelismMin),
          Validators.max(VAULT_ARGON2_LIMITS.parallelismMax),
        ],
      ],
    });
  }

  it('setTimeCost updates argon2_time_cost', () => {
    const form = buildArgonForm();
    const comp = new VaultArgon2ControlsComponent();
    comp.form = form;
    comp.field = 'time';
    comp.layout = 'settings';
    comp.setTimeCost(5);
    expect(form.get('argon2_time_cost')?.value).toBe(5);
  });

  it('setParallelism updates argon2_parallelism', () => {
    const form = buildArgonForm();
    const comp = new VaultArgon2ControlsComponent();
    comp.form = form;
    comp.field = 'parallel';
    comp.layout = 'settings';
    comp.setParallelism(2);
    expect(form.get('argon2_parallelism')?.value).toBe(2);
  });

  it('memorySliderIndex maps memory kib to option index', () => {
    const form = buildArgonForm();
    const comp = new VaultArgon2ControlsComponent();
    comp.form = form;
    comp.field = 'memory';
    comp.layout = 'settings';
    expect(comp.memorySliderIndex()).toBeGreaterThanOrEqual(0);
    form.patchValue({ argon2_memory_kib: VAULT_ARGON2_DEFAULTS.memoryKiB });
    expect(comp.selectedMemoryLabel()).toContain('MiB');
  });
});
