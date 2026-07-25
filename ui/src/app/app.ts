import { Component, HostListener, OnDestroy } from '@angular/core';
import { RouterOutlet, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ToastComponent } from './core/ui/toast.component';
import { shouldClearVaultKeyOnNavigation } from './core/vault/vault-route-lock';
import { VaultSessionService } from './core/vault/vault-session.service';
import { WebCryptoService } from './core/vault/web-crypto.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  /** Throttle for clicks, keys, touches, wheel; idle window may reset at most once per interval. */
  private lastDiscreteActivityAt = 0;
  /**
   * Separate throttle for `mousemove` only. Moving the pointer fires very often; using the same 1s
   * throttle as discrete actions caused `noteActivity` every second and the idle countdown jumped
   * back to the full preset (e.g. 2:00 → 1:59 → 1:58 → 2:00) while simply hovering the UI.
   */
  private lastPointerMoveActivityAt = 0;
  private static readonly DISCRETE_ACTIVITY_MIN_MS = 1000;
  private static readonly POINTER_MOVE_ACTIVITY_MIN_MS = 20_000;
  private readonly routerEventsSubscription: Subscription;

  constructor(
    private readonly vaultSession: VaultSessionService,
    private readonly crypto: WebCryptoService,
    private readonly router: Router,
  ) {
    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && shouldClearVaultKeyOnNavigation(event.url)) {
        this.vaultSession.lockInMemory();
      }
    });
  }

  public ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  @HostListener('document:wheel', ['$event'])
  public onDiscreteUserActivity(ev: Event): void {
    const now = Date.now();
    if (now - this.lastDiscreteActivityAt < App.DISCRETE_ACTIVITY_MIN_MS) {
      return;
    }
    this.lastDiscreteActivityAt = now;
    this.crypto.noteActivity();
  }

  @HostListener('document:mousemove', ['$event'])
  public onPointerMoveUserActivity(ev: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastPointerMoveActivityAt < App.POINTER_MOVE_ACTIVITY_MIN_MS) {
      return;
    }
    this.lastPointerMoveActivityAt = now;
    this.crypto.noteActivity();
  }
}
