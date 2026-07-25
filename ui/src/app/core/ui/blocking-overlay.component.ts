import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  runInInjectionContext,
  viewChild,
} from '@angular/core';

/**
 * Full-viewport blocking overlay: captures pointer events and optional body scroll lock.
 * Use for long-running operations (import, future bulk actions) so the user cannot interact with the shell underneath.
 */
@Component({
  selector: 'app-blocking-overlay',
  standalone: true,
  template: `
    @if (active()) {
      <div
        class="app-blocking-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="descId"
      >
        <div class="app-blocking-overlay__backdrop" aria-hidden="true"></div>
        <div
          #focusPanel
          class="app-blocking-overlay__panel"
          tabindex="-1"
        >
          <div class="app-blocking-overlay__icon-wrap" aria-hidden="true">
            <div class="app-blocking-overlay__icon-spin animate-spin">
              <svg
                class="app-blocking-overlay__icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>
          <h2 [id]="titleId" class="app-blocking-overlay__title">{{ label() }}</h2>
          <p [id]="descId" class="app-blocking-overlay__message">
            {{ message() ?? 'Please wait.' }}
          </p>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockingOverlayComponent {
  private readonly focusPanel = viewChild<ElementRef<HTMLElement>>('focusPanel');
  /** When true, the overlay covers the viewport and blocks interaction. */
  public readonly active = input(false);
  /** Short title for the dialog (and screen readers). */
  public readonly label = input('Loading');
  /** Supporting line; defaults to a generic “Please wait.” when null. */
  public readonly message = input<string | null>(null);
  /** When true (default), sets `document.body` overflow hidden while active. */
  public readonly lockBodyScroll = input(true);

  readonly titleId: string;
  readonly descId: string;

  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  public constructor() {
    const u = globalThis.crypto?.randomUUID?.() ?? `abo-${String(Math.random()).slice(2)}`;
    this.titleId = `app-blocking-overlay-t-${u}`;
    this.descId = `app-blocking-overlay-d-${u}`;

    effect(() => {
      const on = this.active();
      const lock = this.lockBodyScroll();
      const body = this.doc.body;
      if (!lock || !body) {
        return;
      }
      body.style.overflow = on ? 'hidden' : '';
    });

    effect(() => {
      if (!this.active()) {
        return;
      }
      runInInjectionContext(this.injector, () => {
        afterNextRender(() => {
          this.focusPanel()?.nativeElement?.focus({ preventScroll: true });
        });
      });
    });

    this.destroyRef.onDestroy(() => {
      this.doc.body?.style.removeProperty('overflow');
    });
  }
}
