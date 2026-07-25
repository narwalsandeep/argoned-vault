import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { VaultSessionService } from '../vault/vault-session.service';
import { WebCryptoService } from '../vault/web-crypto.service';

/** Text-only idle auto-lock countdown for the left rail (below the green vault status control). */
@Component({
  selector: 'app-shell-idle-lock-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (vaultSession.isUnlocked()) {
      <div class="app-shell-idle-lock-countdown" [attr.aria-label]="ariaLabel()">
        <span class="app-shell-idle-lock-countdown__time">{{ displayTime() }}</span>
        <span class="app-shell-idle-lock-countdown__label" aria-hidden="true">Idle</span>
      </div>
    }
  `,
})
export class ShellIdleLockCountdownComponent {
  private readonly crypto = inject(WebCryptoService);
  protected readonly vaultSession = inject(VaultSessionService);

  private readonly remainingMs = signal(0);

  public constructor() {
    interval(200)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tick());
    this.tick();
  }

  private tick(): void {
    if (!this.vaultSession.isUnlocked()) {
      this.remainingMs.set(0);
      return;
    }
    const deadline = this.crypto.getAutoLockDeadlineEpochMs();
    if (deadline === null) {
      this.remainingMs.set(0);
      return;
    }
    this.remainingMs.set(Math.max(0, deadline - Date.now()));
  }

  public readonly displayTime = computed(() => {
    const ms = this.remainingMs();
    if (ms <= 0) {
      return '—';
    }
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  public readonly ariaLabel = computed(() => {
    if (this.crypto.getAutoLockDeadlineEpochMs() === null) {
      return 'Idle auto-lock: not active';
    }
    return `Vault auto-locks after ${this.displayTime()} of inactivity`;
  });
}
