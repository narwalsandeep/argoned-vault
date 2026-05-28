import { Component } from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-host" aria-live="polite">
      @if (toast.state(); as t) {
        <div role="status" [class]="toastPanelClass(t.variant)">
          <span class="toast-message">{{ t.message }}</span>
          <button
            type="button"
            class="toast-dismiss"
            (click)="toast.dismiss()"
            aria-label="Dismiss notification"
          >
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  imports: [],
})
export class ToastComponent {
  constructor(public readonly toast: ToastService) {}

  /** Variant borders live in styles/layout.css (.toast-panel--*). */
  public toastPanelClass(variant: 'success' | 'error' | 'info'): string {
    const base = 'toast-panel';
    switch (variant) {
      case 'success':
        return `${base} toast-panel--success`;
      case 'error':
        return `${base} toast-panel--error`;
      default:
        return `${base} toast-panel--info`;
    }
  }
}
