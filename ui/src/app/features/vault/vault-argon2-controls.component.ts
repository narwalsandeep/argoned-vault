import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

import {
  vaultArgon2MemoryOptions,
  vaultArgon2ParallelismOptions,
  vaultArgon2TimeOptions,
} from '../../core/vault/vault-argon2-options';

export type VaultArgon2ControlsField = 'time' | 'memory' | 'parallel' | 'all';
export type VaultArgon2ControlsLayout = 'onboarding' | 'settings';

/**
 * Shared Argon2id time / memory / parallelism widgets for onboarding and Settings → Vault profile.
 * Settings: use one instance per `field` inside each `.control-split` body. Onboarding: `field="all"` with `layout="onboarding"`.
 */
@Component({
  selector: 'app-vault-argon2-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class.flex]="field === 'all'"
      [class.flex-col]="field === 'all'"
      [class.gap-3]="field === 'all'"
    >
      @if (layout === 'onboarding' && field === 'all') {
        <div class="vault-argon2-onboarding-hint-wrap">
          <div class="vault-argon2-onboarding-hint-with-icon">
            <span class="vault-argon2-onboarding-hint-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="9.25" />
                <path stroke-linecap="round" d="M12 16.25v-5M12 8.2h.01" />
              </svg>
            </span>
            <p class="vault-argon2-onboarding-hint" role="note">{{ argonOnboardingHint }}</p>
          </div>
        </div>
      }
      @if (showTime()) {
        @if (layout === 'onboarding') {
          <section class="vault-argon2-onboarding-section" aria-label="Argon2 time cost">
            <div class="vault-argon2-onboarding-kv">
              <span class="vault-argon2-onboarding-kv-label">Time</span>
              <span class="vault-argon2-onboarding-kv-dot" aria-hidden="true">·</span>
              <span class="vault-argon2-onboarding-kv-detail" [attr.title]="argonOnboardingTimeTitle">{{ argonOnboardingTimeLine }}</span>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Time cost values">
              @for (t of argonTimeOptions; track t) {
                <button
                  type="button"
                  class="min-h-11 min-w-[2.75rem] rounded-xl border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                  [class.border-app-main-accent]="isTimeSelected(t)"
                  [class.bg-app-main-accent/15]="isTimeSelected(t)"
                  [class.text-app-main-accent]="isTimeSelected(t)"
                  [class.border-app-border]="!isTimeSelected(t)"
                  [class.bg-app-elevated]="!isTimeSelected(t)"
                  [class.text-app-text]="!isTimeSelected(t)"
                  [attr.aria-pressed]="isTimeSelected(t)"
                  (click)="setTimeCost(t)"
                >
                  {{ t }}
                </button>
              }
            </div>
          </section>
        } @else {
          <div class="flex flex-wrap gap-2" role="group" aria-label="Argon2 time cost">
            @for (t of argonTimeOptions; track t) {
              <button
                type="button"
                class="min-h-11 min-w-[2.75rem] rounded-xl border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                [class.border-app-main-accent]="isTimeSelected(t)"
                [class.bg-app-main-accent/15]="isTimeSelected(t)"
                [class.text-app-main-accent]="isTimeSelected(t)"
                [class.border-app-border]="!isTimeSelected(t)"
                [class.bg-app-elevated]="!isTimeSelected(t)"
                [class.text-app-text]="!isTimeSelected(t)"
                [attr.aria-pressed]="isTimeSelected(t)"
                (click)="setTimeCost(t)"
              >
                {{ t }}
              </button>
            }
          </div>
        }
      }

      @if (showMemory()) {
        @if (layout === 'onboarding') {
          <section class="vault-argon2-onboarding-section" aria-label="Argon2 memory">
            <div class="vault-argon2-onboarding-memory-row">
              <div class="vault-argon2-onboarding-kv">
                <span class="vault-argon2-onboarding-kv-label">Memory</span>
                <span class="vault-argon2-onboarding-kv-dot" aria-hidden="true">·</span>
                <span class="vault-argon2-onboarding-kv-detail" [attr.title]="argonOnboardingMemoryTitle">{{ argonOnboardingMemoryLine }}</span>
              </div>
              <span class="vault-argon2-onboarding-memory-value">{{ selectedMemoryLabel() }}</span>
            </div>
            <div class="min-w-0 pt-0.5">
              <input
                [id]="memoryRangeId"
                type="range"
                class="h-2 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-app-border"
                [min]="0"
                [max]="argonMemoryMaxIndex"
                step="1"
                [value]="memorySliderIndex()"
                [style.accent-color]="'var(--color-app-main-accent)'"
                (input)="onMemoryRangeInput($event)"
                aria-valuemin="0"
                [attr.aria-valuemax]="argonMemoryMaxIndex"
                [attr.aria-valuenow]="memorySliderIndex()"
                [attr.aria-valuetext]="selectedMemoryLabel()"
              />
            </div>
          </section>
        } @else {
          @if (layout === 'settings') {
            <div class="mb-2 flex items-baseline justify-end gap-2">
              <span class="text-sm font-semibold text-app-text">{{ selectedMemoryLabel() }}</span>
            </div>
          }
          <div [class.flex]="layout === 'settings'" [class.items-center]="layout === 'settings'" [class.gap-3]="layout === 'settings'">
            <input
              [id]="memoryRangeId"
              type="range"
              class="h-2 cursor-pointer appearance-none rounded-full bg-app-border"
              [class.min-w-0]="layout === 'settings'"
              [class.flex-1]="layout === 'settings'"
              [min]="0"
              [max]="argonMemoryMaxIndex"
              step="1"
              [value]="memorySliderIndex()"
              [style.accent-color]="'var(--color-app-main-accent)'"
              (input)="onMemoryRangeInput($event)"
              aria-valuemin="0"
              [attr.aria-valuemax]="argonMemoryMaxIndex"
              [attr.aria-valuenow]="memorySliderIndex()"
              [attr.aria-valuetext]="selectedMemoryLabel()"
            />
          </div>
        }
      }

      @if (showParallel()) {
        @if (layout === 'onboarding') {
          <section class="vault-argon2-onboarding-section" aria-label="Argon2 parallelism">
            <div class="vault-argon2-onboarding-kv">
              <span class="vault-argon2-onboarding-kv-label">Parallel</span>
              <span class="vault-argon2-onboarding-kv-dot" aria-hidden="true">·</span>
              <span class="vault-argon2-onboarding-kv-detail" [attr.title]="argonOnboardingParallelTitle">{{ argonOnboardingParallelLine }}</span>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Parallelism values">
              @for (p of argonParallelOptions; track p) {
                <button
                  type="button"
                  class="min-h-11 min-w-[2.75rem] rounded-xl border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                  [class.border-app-main-accent]="isParallelSelected(p)"
                  [class.bg-app-main-accent/15]="isParallelSelected(p)"
                  [class.text-app-main-accent]="isParallelSelected(p)"
                  [class.border-app-border]="!isParallelSelected(p)"
                  [class.bg-app-elevated]="!isParallelSelected(p)"
                  [class.text-app-text]="!isParallelSelected(p)"
                  [attr.aria-pressed]="isParallelSelected(p)"
                  (click)="setParallelism(p)"
                >
                  {{ p }}
                </button>
              }
            </div>
          </section>
        } @else {
          <div class="flex flex-wrap gap-2" role="group" aria-label="Argon2 parallelism">
            @for (p of argonParallelOptions; track p) {
              <button
                type="button"
                class="min-h-11 min-w-[2.75rem] rounded-xl border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                [class.border-app-main-accent]="isParallelSelected(p)"
                [class.bg-app-main-accent/15]="isParallelSelected(p)"
                [class.text-app-main-accent]="isParallelSelected(p)"
                [class.border-app-border]="!isParallelSelected(p)"
                [class.bg-app-elevated]="!isParallelSelected(p)"
                [class.text-app-text]="!isParallelSelected(p)"
                [attr.aria-pressed]="isParallelSelected(p)"
                (click)="setParallelism(p)"
              >
                {{ p }}
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class VaultArgon2ControlsComponent {
  @Input({ required: true })
  public form!: FormGroup;

  @Input()
  public field: VaultArgon2ControlsField = 'all';

  @Input()
  public layout: VaultArgon2ControlsLayout = 'onboarding';

  /** Element id for the memory range input (settings label `for` when desired). */
  @Input()
  public memoryRangeId = 'vault-argon2-memory-range';

  /** Shown once at the top when tuning Argon2id in onboarding. */
  public readonly argonOnboardingHint =
    'If you are not sure, leave the defaults as they are. Most people never change these.';

  public readonly argonOnboardingTimeLine =
    'Higher cost: slower unlocks, harder guessing; runs only while deriving keys at setup and unlock.';

  public readonly argonOnboardingTimeTitle =
    'How long Argon2id spends stretching your unlock secret into vault keys. Higher means a slower unlock each time, but a tougher target for guessing. Used only while deriving keys (setup and unlock), not for normal browsing.';

  public readonly argonOnboardingMemoryLine =
    'More RAM raises attack cost; needs free memory on this device; key derivation only, same as time.';

  public readonly argonOnboardingMemoryTitle =
    'How much RAM Argon2id uses for each derivation. More memory makes large-scale guessing more expensive for an attacker, but needs enough free RAM on this device. Same as time: only during key derivation from your unlock secret.';

  public readonly argonOnboardingParallelLine =
    'CPU lanes for the hash; higher may help on multi-core machines; only the Argon2id step, not normal use.';

  public readonly argonOnboardingParallelTitle =
    'How many CPU lanes work on the hash at once. More can speed derivation on multi-core machines; 1 is easiest on low-power laptops. It only affects that same Argon2id step, not ongoing app performance.';

  public readonly argonTimeOptions = vaultArgon2TimeOptions();
  public readonly argonMemoryOptions = vaultArgon2MemoryOptions();
  public readonly argonParallelOptions = vaultArgon2ParallelismOptions();

  public get argonMemoryMaxIndex(): number {
    return Math.max(0, this.argonMemoryOptions.length - 1);
  }

  public showTime(): boolean {
    return this.field === 'all' || this.field === 'time';
  }

  public showMemory(): boolean {
    return this.field === 'all' || this.field === 'memory';
  }

  public showParallel(): boolean {
    return this.field === 'all' || this.field === 'parallel';
  }

  public isTimeSelected(t: number): boolean {
    return this.form.get('argon2_time_cost')?.value === t;
  }

  public setTimeCost(t: number): void {
    const c = this.form.get('argon2_time_cost') as AbstractControl<number> | null;
    c?.setValue(t);
    c?.updateValueAndValidity();
  }

  public isParallelSelected(p: number): boolean {
    return this.form.get('argon2_parallelism')?.value === p;
  }

  public setParallelism(p: number): void {
    const c = this.form.get('argon2_parallelism') as AbstractControl<number> | null;
    c?.setValue(p);
    c?.updateValueAndValidity();
  }

  public memorySliderIndex(): number {
    const kib = this.form.get('argon2_memory_kib')?.value;
    if (typeof kib !== 'number') {
      return 0;
    }
    const idx = this.argonMemoryOptions.findIndex((o) => o.kib === kib);
    return idx >= 0 ? idx : 0;
  }

  public selectedMemoryLabel(): string {
    const kib = this.form.get('argon2_memory_kib')?.value;
    if (typeof kib !== 'number') {
      return '';
    }
    return this.argonMemoryOptions.find((o) => o.kib === kib)?.label ?? '';
  }

  public onMemoryRangeInput(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const i = Number(el.value);
    const opt = this.argonMemoryOptions[i];
    if (opt) {
      const c = this.form.get('argon2_memory_kib') as AbstractControl<number> | null;
      c?.setValue(opt.kib);
      c?.updateValueAndValidity();
    }
  }
}
