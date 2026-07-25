import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { ToastService } from '../ui/toast.service';
import { VaultService } from './vault.service';

/**
 * Tracks whether the authenticated user has a server-side vault profile (GET /vault/profile).
 * Used to gate the main app until first-time onboarding completes.
 */
@Injectable({ providedIn: 'root' })
export class VaultReadinessService {
  /** `null` = not yet checked this session; `true` / `false` = cached from API. */
  private readonly cache = signal<boolean | null>(null);

  public constructor(
    private readonly vault: VaultService,
    private readonly toast: ToastService,
  ) {}

  public invalidate(): void {
    this.cache.set(null);
  }

  /** Call after a successful vault profile upsert (bootstrap or settings). */
  public markProfilePresent(): void {
    this.cache.set(true);
  }

  /**
   * Resolves whether a vault profile exists. Uses cache when already known.
   * 404 `profile_not_found` → false. Other HTTP errors → toast and treat as true (fail-open) so flaky API does not brick the app.
   */
  public ensureProfileExists(): Observable<boolean> {
    const c = this.cache();
    if (c === true) {
      return of(true);
    }
    if (c === false) {
      return of(false);
    }
    return this.vault.getProfile().pipe(
      map(() => {
        this.cache.set(true);
        return true;
      }),
      catchError((err: unknown) => {
        if (this.isProfileNotFound(err)) {
          this.cache.set(false);
          return of(false);
        }
        if (err instanceof HttpErrorResponse && err.status === 0) {
          this.toast.error('Network error while checking vault status.');
        } else if (err instanceof HttpErrorResponse && err.status >= 500) {
          this.toast.error('Unable to verify vault status. If this continues, try again later.');
        }
        this.cache.set(true);
        return of(true);
      }),
    );
  }

  private isProfileNotFound(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
      return false;
    }
    const body = err.error as { error?: string } | null;
    return body?.error === 'profile_not_found';
  }
}
