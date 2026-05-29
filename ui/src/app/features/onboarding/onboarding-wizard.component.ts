import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import {
  VAULT_ARGON2_DEFAULTS,
  VAULT_ARGON2_LIMITS,
  vaultArgon2MemoryKiBValidator,
} from '../../core/vault/vault-argon2-options';
import { VaultReadinessService } from '../../core/vault/vault-readiness.service';
import { VaultService } from '../../core/vault/vault.service';
import {
  VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES,
  VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS,
  VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP,
  buildSuggestedVaultUnlockSecret,
  isVaultSessionAutoLockIdleMinuteValue,
} from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultArgon2ControlsComponent } from '../vault/vault-argon2-controls.component';

/**
 * First-login flow: unlock secret → Argon2id tuning (bounded for laptops) → session auto-lock defaults.
 */
@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, VaultArgon2ControlsComponent],
  template: `
    <div class="auth-shell">
      <div class="auth-shell-body">
        <div class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8">
          <div class="mb-6 flex justify-center">
            <div class="auth-brand" aria-label="Argoned brand">
              <span class="auth-brand-b">a</span><span class="auth-brand-rest">rgoned</span><span class="auth-brand-dot">.</span>
            </div>
          </div>

          <nav class="mb-6 w-full" aria-label="Setup steps">
            <ol class="grid grid-cols-3 gap-1 sm:gap-3">
              @for (s of stepRail; track s.n) {
                <li class="flex flex-col items-center gap-1.5 text-center">
                  <div
                    class="flex size-10 items-center justify-center rounded-full border-2 transition sm:size-11"
                    [class.border-app-main-accent]="step() >= s.n"
                    [class.bg-app-main-accent]="step() > s.n"
                    [class.text-white]="step() > s.n"
                    [class.bg-app-main-accent/15]="step() === s.n"
                    [class.text-app-main-accent]="step() === s.n"
                    [class.border-app-border]="step() < s.n"
                    [class.bg-app-surface]="step() < s.n"
                    [class.text-app-text-muted]="step() < s.n"
                    [attr.aria-current]="step() === s.n ? 'step' : null"
                  >
                    @if (step() > s.n) {
                      <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fill-rule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    } @else {
                      @switch (s.n) {
                        @case (1) {
                          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H3v-2.834c0-.612.07-1.212.204-1.796a6 6 0 011.718-3.042l.431-.431a1.125 1.125 0 00-1.591-1.591l-1.432 1.432a8.25 8.25 0 0011.318 0l-1.432-1.432a1.125 1.125 0 00-1.591 1.591l.431.431a6 6 0 011.718 3.042 48.774 48.774 0 00.204 1.796c.134.584.204 1.184.204 1.796V21H18v-2.25h-2.25v-2.25h-2.25l-.431-.431a1.125 1.125 0 00-1.563-.43 6 6 0 01-7.029-5.912z" />
                          </svg>
                        }
                        @case (2) {
                          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        }
                        @default {
                          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        }
                      }
                    }
                  </div>
                  <span
                    class="max-w-[4rem] text-[0.65rem] font-semibold uppercase leading-tight tracking-wide sm:max-w-none sm:text-xs"
                    [class.text-app-main-accent]="step() === s.n"
                    [class.text-app-text-muted]="step() !== s.n"
                  >
                    {{ s.label }}
                  </span>
                </li>
              }
            </ol>
          </nav>

          <form [formGroup]="onboardingForm" (ngSubmit)="$event.preventDefault()">
            @switch (step()) {
              @case (1) {
                <section
                  class="rounded-2xl border border-app-border bg-app-surface px-6 py-6 shadow-sm sm:px-10 sm:py-7"
                  aria-labelledby="onboarding-secret-title"
                >
                  <div class="mb-5 flex items-start gap-4">
                    <div
                      class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-app-main-accent/15 text-app-main-accent"
                      aria-hidden="true"
                    >
                      <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H3v-2.834c0-.612.07-1.212.204-1.796a6 6 0 011.718-3.042l.431-.431a1.125 1.125 0 00-1.591-1.591l-1.432 1.432a8.25 8.25 0 0011.318 0l-1.432-1.432a1.125 1.125 0 00-1.591 1.591l.431.431a6 6 0 011.718 3.042 48.774 48.774 0 00.204 1.796c.134.584.204 1.184.204 1.796V21H18v-2.25h-2.25v-2.25h-2.25l-.431-.431a1.125 1.125 0 00-1.563-.43 6 6 0 01-7.029-5.912z" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h1 id="onboarding-secret-title" class="text-lg font-semibold tracking-tight text-app-text sm:text-xl">
                        Vault secret
                      </h1>
                      <p class="mt-1 text-xs text-app-text-muted sm:text-sm">
                        Three quick steps—keep this tab open. Not your account password. Minimum {{ minVaultSecretLength }}
                        characters (spaces count); longer is safer. You can suggest random hyphenated words (easy to read, at
                        least three words and 18+ characters) or type your own passphrase.
                      </p>
                    </div>
                  </div>
                  <div class="control-form-grid gap-4">
                    <div class="w-full">
                      <label class="mb-1.5 block text-sm font-medium text-app-text" for="onboarding-unlock-secret">
                        Unlock secret
                      </label>
                      <div class="control-input-shell">
                        <input
                          id="onboarding-unlock-secret"
                          class="control-input-shell-input"
                          [type]="secretVisible() ? 'text' : 'password'"
                          formControlName="unlock_secret"
                          autocomplete="new-password"
                          [attr.placeholder]="minVaultSecretLength + '+ characters (recommended)'"
                        />
                        <div class="control-input-shell-actions">
                          <button
                            type="button"
                            class="control-input-shell-action-btn"
                            [attr.aria-label]="secretVisible() ? 'Hide secret' : 'Show secret'"
                            [attr.aria-pressed]="secretVisible()"
                            (click)="toggleSecretVisible()"
                          >
                            @if (secretVisible()) {
                              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                />
                              </svg>
                            } @else {
                              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            }
                          </button>
                          <button
                            type="button"
                            class="control-input-shell-action-btn"
                            aria-label="Copy vault secret to clipboard"
                            (click)="copyUnlockSecret()"
                          >
                            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div class="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                        <button type="button" class="control-btn-secondary w-max" (click)="suggestUnlockSecret()">
                          <span>Suggest random words</span>
                        </button>
                        <span class="text-xs text-app-text-muted">
                          Example style: ability-absence-active (random real dictionary words). Save it somewhere private.
                        </span>
                      </div>
                    </div>
                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm leading-snug text-app-text shadow-sm transition hover:border-app-border"
                    >
                      <input
                        type="checkbox"
                        formControlName="secret_confirmed"
                        class="mt-0.5 size-4 shrink-0 rounded border-app-border"
                        [style.accent-color]="'var(--color-app-main-accent)'"
                      />
                      <span>
                        I have copied or securely saved this vault secret, I will keep it private, and I will not share it with
                        anyone.
                      </span>
                    </label>
                    <div class="control-actions-row">
                      <button type="button" class="control-btn-primary w-max" (click)="goToStep(2)">
                        <span>Continue</span>
                      </button>
                    </div>
                  </div>
                </section>
              }
              @case (2) {
                <section
                  class="rounded-2xl border border-app-border bg-app-surface px-6 py-6 shadow-sm sm:px-10 sm:py-7"
                  aria-labelledby="onboarding-argon-title"
                >
                  <div class="mb-5 flex items-start gap-4">
                    <div
                      class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-app-main-accent/15 text-app-main-accent"
                      aria-hidden="true"
                    >
                      <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h1 id="onboarding-argon-title" class="text-lg font-semibold tracking-tight text-app-text sm:text-xl">
                        Key derivation
                      </h1>
                      <p class="mt-1 text-xs text-app-text-muted sm:text-sm">Argon2id, adjust if your laptop is slow or fast.</p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-5">
                    <app-vault-argon2-controls [form]="onboardingForm" field="all" layout="onboarding" memoryRangeId="onboarding-argon-memory" />
                    <div class="control-actions-row-split">
                      <button type="button" class="control-btn-secondary w-max" (click)="restoreArgonDefaults()">
                        Set Defaults
                      </button>
                      <div class="control-actions-row-split-trailing">
                        <button type="button" class="control-btn-secondary w-max" (click)="goToStep(1)">Back</button>
                        <button
                          type="button"
                          class="control-btn-primary w-max"
                          [disabled]="profileSaveBusy()"
                          (click)="generateAndSaveProfile()"
                        >
                          <span>{{ profileSaveBusy() ? 'Working…' : 'Generate vault profile' }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              }
              @case (3) {
                <section
                  class="rounded-2xl border border-app-border bg-app-surface px-6 py-6 shadow-sm sm:px-10 sm:py-7"
                  aria-labelledby="onboarding-session-title"
                >
                  <div class="mb-5 flex items-start gap-4">
                    <div
                      class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-app-main-accent/15 text-app-main-accent"
                      aria-hidden="true"
                    >
                      <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h1 id="onboarding-session-title" class="text-lg font-semibold tracking-tight text-app-text sm:text-xl">
                        Auto-lock
                      </h1>
                      <p class="mt-1 text-xs text-app-text-muted sm:text-sm">Idle minutes before this tab forgets the key.</p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-5">
                    <div>
                      <span class="mb-2 block text-xs font-medium uppercase tracking-wide text-app-text-muted">Minutes</span>
                      <div class="flex flex-wrap gap-2" role="group" aria-label="Auto-lock after idle">
                        @for (m of autoLockPresets; track m) {
                          <button
                            type="button"
                            class="control-choice-btn"
                            [class.border-app-main-accent]="isAutoLockSelected(m)"
                            [class.bg-app-main-accent/15]="isAutoLockSelected(m)"
                            [class.text-app-main-accent]="isAutoLockSelected(m)"
                            [class.border-app-border]="!isAutoLockSelected(m)"
                            [class.bg-app-elevated]="!isAutoLockSelected(m)"
                            [class.text-app-text]="!isAutoLockSelected(m)"
                            [attr.aria-pressed]="isAutoLockSelected(m)"
                            (click)="setAutoLockMinutes(m)"
                          >
                            {{ m }}
                          </button>
                        }
                      </div>
                    </div>
                    <div class="control-actions-row">
                      <button type="button" class="control-btn-primary w-max" (click)="completeOnboarding()">
                        <span>Open app</span>
                      </button>
                    </div>
                  </div>
                </section>
              }
            }
          </form>
        </div>
      </div>
      <nav class="auth-legal-footer" aria-label="Legal and account">
        <a routerLink="/logout">
          <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign out</span>
        </a>
        <a routerLink="/terms">
          <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Terms</span>
        </a>
        <a routerLink="/privacy">
          <svg class="auth-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Privacy</span>
        </a>
      </nav>
    </div>
  `,
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  public readonly step = signal<1 | 2 | 3>(1);

  public readonly secretVisible = signal(false);

  public readonly minVaultSecretLength = VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP;

  public readonly onboardingForm;

  public readonly profileSaveBusy = signal(false);

  public readonly stepRail: ReadonlyArray<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: 'Secret' },
    { n: 2, label: 'Keys' },
    { n: 3, label: 'Lock' },
  ];

  public readonly autoLockPresets: readonly number[] = [...VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS];

  private returnUrl = '/dashboard';

  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly crypto = inject(WebCryptoService);
  private readonly vault = inject(VaultService);
  private readonly vaultReadiness = inject(VaultReadinessService);
  private readonly toast = inject(ToastService);

  public constructor() {
    this.onboardingForm = this.fb.group({
      unlock_secret: ['', [Validators.required, Validators.minLength(VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP)]],
      secret_confirmed: [false, Validators.requiredTrue],
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
      auto_lock_minutes: [
        VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES,
        [
          Validators.required,
          (c: AbstractControl): ValidationErrors | null =>
            isVaultSessionAutoLockIdleMinuteValue(Number(c.value)) ? null : { autoLockPreset: true },
        ],
      ],
    });

    this.onboardingForm
      .get('unlock_secret')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        (this.onboardingForm.get('secret_confirmed') as AbstractControl<boolean> | null)?.setValue(false, {
          emitEvent: false,
        });
      });
  }

  public ngOnInit(): void {
    const raw = this.route.snapshot.queryParams['returnUrl'];
    this.returnUrl = OnboardingWizardComponent.safeReturnUrl(typeof raw === 'string' ? raw : undefined);
  }

  public ngOnDestroy(): void {
    this.onboardingForm.patchValue({ unlock_secret: '', secret_confirmed: false });
  }

  public goToStep(n: 1 | 2 | 3): void {
    if (n === 1) {
      this.step.set(1);
      return;
    }
    if (n === 2) {
      const secret = this.onboardingForm.get('unlock_secret');
      const confirmed = this.onboardingForm.get('secret_confirmed');
      secret?.markAsTouched();
      confirmed?.markAsTouched();
      if (secret?.invalid) {
        this.toast.error(
          `Use at least ${VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP} characters for your vault secret (spaces count).`,
        );
        return;
      }
      if (confirmed?.invalid) {
        this.toast.error('Check the box to confirm you have saved your secret and will not share it.');
        return;
      }
      this.step.set(2);
      return;
    }
    if (n === 3) {
      this.step.set(3);
    }
  }

  public toggleSecretVisible(): void {
    this.secretVisible.update((v) => !v);
  }

  public suggestUnlockSecret(): void {
    try {
      const suggested = buildSuggestedVaultUnlockSecret();
      this.onboardingForm.patchValue({ unlock_secret: suggested });
    } catch {
      this.toast.error('Could not generate a random secret in this browser.');
    }
  }

  public async copyUnlockSecret(): Promise<void> {
    const raw = this.onboardingForm.get('unlock_secret')?.value;
    const text = typeof raw === 'string' ? raw : '';
    if (!text) {
      this.toast.error('Enter your vault secret before copying.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Copied. Store it somewhere only you can access.');
    } catch {
      this.toast.error('Could not copy automatically. Reveal the secret and copy it manually.');
    }
  }

  public isAutoLockSelected(m: number): boolean {
    return this.onboardingForm.get('auto_lock_minutes')?.value === m;
  }

  public setAutoLockMinutes(m: number): void {
    if (!isVaultSessionAutoLockIdleMinuteValue(m)) {
      return;
    }
    const c = this.onboardingForm.get('auto_lock_minutes') as AbstractControl<number> | null;
    c?.setValue(m);
    c?.updateValueAndValidity();
  }

  public restoreArgonDefaults(): void {
    this.onboardingForm.patchValue({
      argon2_time_cost: VAULT_ARGON2_DEFAULTS.timeCost,
      argon2_memory_kib: VAULT_ARGON2_DEFAULTS.memoryKiB,
      argon2_parallelism: VAULT_ARGON2_DEFAULTS.parallelism,
    });
    this.toast.info('Restored recommended Argon2id settings.');
  }

  public async generateAndSaveProfile(): Promise<void> {
    const g = this.onboardingForm;
    ['argon2_time_cost', 'argon2_memory_kib', 'argon2_parallelism'].forEach((name) => {
      g.get(name)?.markAsTouched();
    });
    if (g.get('unlock_secret')?.invalid || g.get('argon2_time_cost')?.invalid || g.get('argon2_memory_kib')?.invalid || g.get('argon2_parallelism')?.invalid) {
      this.toast.error('Fix the Argon2id fields. They must stay within the allowed ranges.');
      return;
    }

    this.profileSaveBusy.set(true);
    this.toast.info(
      'Deriving keys with Argon2… This can take 30 to 90 seconds. Please keep this tab open.',
      120_000,
    );

    const raw = g.getRawValue();
    const secret = String(raw.unlock_secret ?? '');
    const timeCost = Number(raw.argon2_time_cost);
    const memoryKiB = Number(raw.argon2_memory_kib);
    const parallelism = Number(raw.argon2_parallelism);

    try {
      const payload = await this.crypto.bootstrapVaultProfile(secret, {
        timeCost,
        memoryKiB,
        parallelism,
      });
      this.vault.upsertProfile(payload).subscribe({
        next: () => {
          this.vaultReadiness.markProfilePresent();
          this.profileSaveBusy.set(false);
          this.toast.success('Vault profile saved. Your vault key is unlocked in this tab.');
          this.goToStep(3);
        },
        error: (err: unknown) => {
          this.profileSaveBusy.set(false);
          const body = err as { error?: { error?: string } };
          this.toast.error(body?.error?.error ?? 'Failed to save profile');
        },
      });
    } catch (error) {
      this.profileSaveBusy.set(false);
      this.toast.error(error instanceof Error ? error.message : 'Failed to create secure vault profile');
    }
  }

  public completeOnboarding(): void {
    if (this.onboardingForm.get('auto_lock_minutes')?.invalid) {
      this.onboardingForm.get('auto_lock_minutes')?.markAsTouched();
      this.toast.error('Choose an idle auto-lock preset (same minutes as Vault → Session).');
      return;
    }
    const rawMinutes = this.onboardingForm.getRawValue().auto_lock_minutes;
    const parsed = Number(rawMinutes ?? VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES);
    const minutes = isVaultSessionAutoLockIdleMinuteValue(parsed)
      ? parsed
      : VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES;
    try {
      this.crypto.applyIdleAutoLockPresetMinutes(minutes);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Invalid timeout');
      return;
    }
    const raw = this.onboardingForm.getRawValue();
    const secret = String(raw.unlock_secret ?? '');
    if (secret.length < VAULT_UNLOCK_SECRET_MIN_BOOTSTRAP) {
      this.toast.error('Vault secret is missing or too short to email. Go back to step 1 if needed.');
      return;
    }
    this.auth
      .sendOnboardingCompletionEmail({
        unlock_secret: secret,
        auto_lock_minutes: minutes,
        argon2_time_cost: Number(raw.argon2_time_cost),
        argon2_memory_kib: Number(raw.argon2_memory_kib),
        argon2_parallelism: Number(raw.argon2_parallelism),
      })
      .subscribe({
        error: () => {
          // Non-blocking: onboarding should still complete even if follow-up email delivery fails.
        },
      });
    this.toast.success('Setup complete. Welcome to Argoned.');
    void this.router.navigateByUrl(this.returnUrl);
  }

  public static safeReturnUrl(raw: string | undefined): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/dashboard';
    }
    const path = raw.split('?')[0]?.split('#')[0] ?? '';
    if (
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/onboarding') ||
      path.startsWith('/check-email') ||
      path.startsWith('/verify-email')
    ) {
      return '/dashboard';
    }
    return raw;
  }
}
