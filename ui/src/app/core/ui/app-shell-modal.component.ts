import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export type AppShellModalHeaderIcon = 'vault-lock' | 'vault-lock-static' | 'none';

/**
 * Shared vault-style overlay + modal shell (`.vault-unlock-*` in layout.css). Use for unlock flow, destructive confirms,
 * and short notices so chrome stays consistent.
 */
@Component({
  selector: 'app-shell-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open()) {
      <div class="vault-unlock-overlay" role="presentation" (click)="onBackdrop()">
        @if (showDoors()) {
          <div class="vault-unlock-doors" aria-hidden="true">
            <div class="vault-unlock-door--left"></div>
            <div class="vault-unlock-door--right"></div>
          </div>
        }

        <div class="vault-unlock-modal-anchor" (click)="$event.stopPropagation()">
          <div class="vault-unlock-modal-shell">
            <div class="vault-unlock-modal-rim">
              <div
                class="vault-unlock-modal-inner relative"
                [class.text-left]="bodyAlign() === 'left'"
                role="dialog"
                aria-modal="true"
                [attr.aria-labelledby]="dialogLabelledBy()"
                [attr.aria-label]="dialogAriaLabel() || null"
              >
                @if (showCloseButton()) {
                  <button
                    type="button"
                    class="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-app-main-accent/70 bg-app-main-accent/15 text-app-main-accent transition hover:bg-app-main-accent/25"
                    [attr.aria-label]="closeAriaLabel()"
                    (click)="emitDismiss()"
                  >
                    <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                }

                @if (useDefaultHeader()) {
                  <header class="vault-unlock-modal-header">
                    @if (headerIcon() === 'vault-lock') {
                      <div class="vault-unlock-modal-lock" aria-hidden="true">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    } @else if (headerIcon() === 'vault-lock-static') {
                      <div class="vault-unlock-modal-lock vault-unlock-modal-lock--static" aria-hidden="true">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    }
                    <div>
                      <h2 [id]="titleId()" class="vault-unlock-modal-title">{{ heading() }}</h2>
                      <p class="vault-unlock-modal-sub text-app-text-muted">
                        {{ subtext() }}
                      </p>
                    </div>
                  </header>
                }

                <ng-content />

                @if (showPrimaryFooter()) {
                  <div class="mt-6 flex justify-center border-t border-app-border/80 pt-4">
                    <button type="button" class="control-btn-primary w-max px-6" (click)="emitDismiss()">
                      {{ primaryButtonLabel() }}
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AppShellModalComponent {
  public readonly open = input(false);
  public readonly useDefaultHeader = input(true);
  /** Element id for the default title (`useDefaultHeader`) and `aria-labelledby`. */
  public readonly titleId = input('app-shell-modal-title');
  public readonly heading = input('');
  public readonly subtext = input('');
  public readonly headerIcon = input<AppShellModalHeaderIcon>('none');
  public readonly showDoors = input(false);
  public readonly showCloseButton = input(true);
  public readonly closeAriaLabel = input('Close dialog');
  public readonly dismissOnBackdrop = input(true);
  /** When true, backdrop clicks do not dismiss (parent close handler may still no-op). */
  public readonly backdropLocked = input(false);
  /** When `useDefaultHeader` is false, id of the visible dialog title inside projected content. */
  public readonly ariaLabelledBy = input<string | null>(null);
  /** Optional accessible name when there is no `aria-labelledby` target. */
  public readonly dialogAriaLabel = input<string | null>(null);
  public readonly bodyAlign = input<'center' | 'left'>('center');
  public readonly showPrimaryFooter = input(false);
  public readonly primaryButtonLabel = input('OK');

  public readonly dismissed = output<void>();

  public dialogLabelledBy(): string | null {
    if (this.useDefaultHeader()) {
      return this.titleId();
    }
    return this.ariaLabelledBy();
  }

  public onBackdrop(): void {
    if (!this.dismissOnBackdrop() || this.backdropLocked()) {
      return;
    }
    this.emitDismiss();
  }

  public emitDismiss(): void {
    this.dismissed.emit();
  }
}
