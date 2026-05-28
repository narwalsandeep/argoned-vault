import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import {
  VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS,
  isVaultSessionAutoLockIdleMinuteValue,
  nearestVaultSessionAutoLockMinutes,
} from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';

/** Minute presets for tab-local idle auto-lock; each tap applies immediately (no Save). */
@Component({
  selector: 'app-vault-idle-auto-lock-presets',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-wrap gap-2"
      role="group"
      aria-label="Idle auto-lock after no activity; choose minutes. Applies immediately; restarts countdown when unlocked."
    >
      @for (m of minuteOptions; track m) {
        <button
          type="button"
          class="min-h-11 min-w-[2.75rem] rounded-xl border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-app-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
          [class.border-app-main-accent]="isSelected(m)"
          [class.bg-app-main-accent/15]="isSelected(m)"
          [class.text-app-main-accent]="isSelected(m)"
          [class.border-app-border]="!isSelected(m)"
          [class.bg-app-elevated]="!isSelected(m)"
          [class.text-app-text]="!isSelected(m)"
          [attr.aria-pressed]="isSelected(m)"
          (click)="selectPreset(m)"
        >
          {{ m }}
        </button>
      }
    </div>
  `,
})
export class VaultIdleAutoLockPresetsComponent {
  public readonly minuteOptions: readonly number[] = [...VAULT_SESSION_AUTO_LOCK_IDLE_MINUTES_OPTIONS];

  public constructor(private readonly crypto: WebCryptoService) {}

  public isSelected(m: number): boolean {
    const ms = this.crypto.getAutoLockTimeoutMs();
    const rounded = nearestVaultSessionAutoLockMinutes(Math.round(ms / 60_000));
    return rounded === m;
  }

  public selectPreset(m: number): void {
    if (!isVaultSessionAutoLockIdleMinuteValue(m)) {
      return;
    }
    try {
      this.crypto.applyIdleAutoLockPresetMinutes(m);
    } catch {
      /* invalid preset; guarded above */
    }
  }
}
