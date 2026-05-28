import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ToastService } from '../../core/ui/toast.service';
import { UiSpinnerComponent } from '../../core/ui/ui-spinner.component';
import {
  VAULT_ARGON2_DEFAULTS,
  VAULT_ARGON2_LIMITS,
  vaultArgon2FormValuesFromProfile,
  vaultArgon2MemoryKiBValidator,
} from '../../core/vault/vault-argon2-options';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultService } from '../../core/vault/vault.service';
import { VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP } from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultArgon2ControlsComponent } from './vault-argon2-controls.component';

/**
 * One-time / rare server profile bootstrap (KDF + wrapped vault key). First-run onboarding uses the same limits via {@link vault-argon2-options}.
 */
@Component({
  selector: 'app-vault-profile-bootstrap',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiSpinnerComponent, VaultArgon2ControlsComponent],
  template: `
    @if (profileLoading()) {
      <section
        class="settings-section-card mb-8 flex min-h-[14rem] flex-col items-center justify-center gap-4 p-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <app-ui-spinner variant="accent" size="lg" label="Loading vault profile" [decorative]="true" />
        <p class="max-w-sm text-center text-sm leading-relaxed text-app-text-muted">
          Loading vault profile from the server…
        </p>
      </section>
    } @else {
    <section class="mb-8 w-full rounded-xl border border-app-border bg-app-surface p-6">
      <h2 class="tab-panel-heading">
        <span class="tab-panel-heading-title">Vault profile</span>
        <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
        <span class="tab-panel-heading-kicker">Server wrap &amp; Argon2id</span>
      </h2>
      <div
        class="mb-4 flex items-start gap-2 rounded-lg border border-app-main-accent/35 bg-app-main-accent/10 px-3 py-2 text-xs leading-relaxed text-white"
      >
        <span aria-hidden="true" class="mt-0.5 shrink-0">
          <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <p>
          Leave unlock secret empty to keep current profile unchanged. To save Argon2 settings, enter unlock secret; this is
          allowed only when no vault items exist.
        </p>
      </div>
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="control-form-grid">
        <div class="control-split">
          <label class="control-split-label" for="settings-profile-unlock-secret">Unlock secret</label>
          <input
            id="settings-profile-unlock-secret"
            class="control-split-input"
            type="password"
            [attr.placeholder]="vaultSecretMin + '+ characters; derives your vault key'"
            formControlName="unlock_secret"
            autocomplete="off"
          />
        </div>
        <div class="control-split">
          <label class="control-split-label">Argon2id time cost</label>
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-2 py-2 sm:px-3 sm:py-2.5">
            <app-vault-argon2-controls [form]="profileForm" field="time" layout="settings" />
          </div>
        </div>
        <div class="control-split">
          <label class="control-split-label" for="settings-profile-argon2-memory">Argon2id memory</label>
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-2 py-2 sm:px-3 sm:py-2.5">
            <app-vault-argon2-controls
              [form]="profileForm"
              field="memory"
              layout="settings"
              memoryRangeId="settings-profile-argon2-memory"
            />
          </div>
        </div>
        <div class="control-split">
          <label class="control-split-label">Argon2id parallelism</label>
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-2 py-2 sm:px-3 sm:py-2.5">
            <app-vault-argon2-controls [form]="profileForm" field="parallel" layout="settings" />
          </div>
        </div>
        <div class="control-actions-row">
          <div class="control-actions-group">
            <button class="control-btn-primary w-max" type="submit" aria-label="Update vault profile on server">
              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Update</span>
            </button>
          </div>
        </div>
      </form>
    </section>
    }
  `,
})
export class VaultProfileBootstrapComponent implements OnInit {
  public readonly vaultSecretMin = VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP;

  /** True while the initial `getProfile()` request is in flight (Settings → Vault profile). */
  public readonly profileLoading = signal(true);

  public readonly profileForm;

  private readonly destroyRef = inject(DestroyRef);

  public constructor(
    private readonly fb: FormBuilder,
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly toast: ToastService,
    private readonly vaultReadiness: VaultReadinessService,
  ) {
    this.profileForm = this.fb.group({
      unlock_secret: ['', [Validators.minLength(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP)]],
      argon2_time_cost: [
        VAULT_ARGON2_DEFAULTS.timeCost,
        [
          Validators.required,
          Validators.min(VAULT_ARGON2_LIMITS.timeMin),
          Validators.max(VAULT_ARGON2_LIMITS.timeMax),
        ],
      ],
      argon2_memory_kib: [
        VAULT_ARGON2_DEFAULTS.memoryKiB,
        [Validators.required, vaultArgon2MemoryKiBValidator()],
      ],
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

  public ngOnInit(): void {
    this.profileLoading.set(true);
    this.vault
      .getProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.profileLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          const patch = vaultArgon2FormValuesFromProfile(
            res.profile.kdf_algo,
            res.profile.kdf_params_json as Record<string, unknown>,
          );
          if (patch) {
            // Form is built with default literals; runtime values are any valid Argon2 option in range.
            this.profileForm.patchValue(patch as never, { emitEvent: false });
          }
        },
        error: () => {
          // No profile yet (404) or transient error; keep constructor defaults for first-time bootstrap.
        },
      });
  }

  public async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toast.error(
        `Check the form: if provided, unlock secret needs ${VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP}+ characters (spaces count); Argon2 time ${VAULT_ARGON2_LIMITS.timeMin} to ${VAULT_ARGON2_LIMITS.timeMax}; memory ${VAULT_ARGON2_LIMITS.memoryKiBMin} to ${VAULT_ARGON2_LIMITS.memoryKiBMax} KiB in steps of ${VAULT_ARGON2_LIMITS.memoryKiBStep}; parallelism ${VAULT_ARGON2_LIMITS.parallelismMin} to ${VAULT_ARGON2_LIMITS.parallelismMax}.`,
      );
      return;
    }

    const value = this.profileForm.getRawValue();
    const unlockSecret = (value.unlock_secret ?? '').trim();
    if (unlockSecret.length === 0) {
      this.toast.info('Unlock secret is empty, so profile key material was not changed.');
      return;
    }

    if (!(await this.canRotateUnlockSecret())) {
      this.toast.error('Cannot update unlock secret while vault items exist. Delete items first to avoid data corruption.');
      return;
    }

    this.toast.info(
      'Deriving keys with Argon2… This can take 30 to 90 seconds. Please keep this tab open.',
      120_000,
    );

    try {
      const payload = await this.crypto.bootstrapVaultProfile(
        unlockSecret,
        {
          timeCost: Number(value.argon2_time_cost ?? VAULT_ARGON2_DEFAULTS.timeCost),
          memoryKiB: Number(value.argon2_memory_kib ?? VAULT_ARGON2_DEFAULTS.memoryKiB),
          parallelism: Number(value.argon2_parallelism ?? VAULT_ARGON2_DEFAULTS.parallelism),
        },
      );
      this.vault.upsertProfile(payload).subscribe({
        next: () => {
          this.vaultReadiness.markProfilePresent();
          this.toast.success(
            'Vault profile saved. Unlock when the app prompts (for example opening vault or Add); use the same unlock secret.',
          );
        },
        error: (err: unknown) => {
          const body = err as { error?: { error?: string } };
          this.toast.error(body?.error?.error ?? 'Failed to save profile');
        },
      });
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Failed to create secure vault profile');
    }
  }

  private async canRotateUnlockSecret(): Promise<boolean> {
    try {
      const items = await firstValueFrom(this.vault.listItems());
      return items.length === 0;
    } catch {
      this.toast.error('Failed to verify vault item count before updating unlock secret.');
      return false;
    }
  }
}
