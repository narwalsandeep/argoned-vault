import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Default time a toast stays visible (8 seconds). */
  public static readonly DEFAULT_DURATION_MS = 8000;

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  /** Current toast; `null` when hidden. */
  public readonly state = signal<ToastPayload | null>(null);

  public show(
    message: string,
    variant: ToastVariant = 'info',
    durationMs = ToastService.DEFAULT_DURATION_MS,
  ): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.state.set({ message, variant });
    this.dismissTimer = setTimeout(() => this.dismiss(), durationMs);
  }

  public success(message: string, durationMs?: number): void {
    this.show(message, 'success', durationMs ?? ToastService.DEFAULT_DURATION_MS);
  }

  public error(message: string, durationMs?: number): void {
    this.show(message, 'error', durationMs ?? ToastService.DEFAULT_DURATION_MS);
  }

  public info(message: string, durationMs?: number): void {
    this.show(message, 'info', durationMs ?? ToastService.DEFAULT_DURATION_MS);
  }

  public dismiss(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.state.set(null);
  }
}
