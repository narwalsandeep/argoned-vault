import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { VaultService } from '../../core/vault/vault.service';

import { type VaultItemTypeRow } from './dashboard-live-stats.helpers';

interface HealthLivePayload {
  readonly status: string;
  readonly service: string;
  readonly check: string;
  readonly time: string;
}

interface VaultProfilePayload {
  readonly kdf_algo: string;
  readonly kdf_params_json: Record<string, unknown>;
  readonly kdf_salt: string;
  readonly crypto_version: number;
}

interface VaultProfileResponse {
  readonly status: string;
  readonly profile: VaultProfilePayload;
}

export type DashboardRecoveryStatus = 'present' | 'missing' | 'unreachable';

export interface DashboardRecoverySummary {
  readonly status: DashboardRecoveryStatus;
  readonly createdAt: string | null;
}

export interface DashboardVaultSnapshot {
  readonly items: ReadonlyArray<VaultItemTypeRow>;
  readonly profile: VaultProfileResponse | null;
  readonly recovery: DashboardRecoverySummary;
}

export type DashboardHealthProbeState = 'ok' | 'error';

export interface DashboardHealthProbeResult {
  readonly state: DashboardHealthProbeState;
  readonly ms: number | null;
  readonly serverTime: string | null;
  readonly payloadStatus: string;
}

/**
 * Read-only dashboard aggregations over existing Vault / Auth / health APIs.
 * Keeps HTTP paths and CSRF rules in {@link VaultService} and {@link AuthService}.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStatsLoader {
  public constructor(
    private readonly vault: VaultService,
    private readonly api: ApiClientService,
    private readonly auth: AuthService,
  ) {}

  /** Parallel fetch for vault tiles (items, profile, recovery artifact metadata). */
  public loadVaultSnapshot(): Observable<DashboardVaultSnapshot> {
    return forkJoin({
      items: this.vault.listItems().pipe(catchError(() => of([] as VaultItemTypeRow[]))),
      profile: this.vault.getProfile().pipe(catchError(() => of(null as VaultProfileResponse | null))),
      recovery: this.vault.getRecoveryArtifact().pipe(
        map(
          (response): DashboardRecoverySummary => ({
            status: 'present',
            createdAt: response.artifact.created_at ?? null,
          }),
        ),
        catchError(
          (err): Observable<DashboardRecoverySummary> =>
            of({
              status: err?.status === 404 ? 'missing' : 'unreachable',
              createdAt: null,
            }),
        ),
      ),
    });
  }

  /** Public liveness probe (same path as ops runbooks). */
  public probeLiveHealth(): Observable<DashboardHealthProbeResult> {
    const t0 = performance.now();
    return this.api.get<HealthLivePayload>('/health/live').pipe(
      map(
        (payload): DashboardHealthProbeResult => ({
          state: 'ok',
          ms: Math.round(performance.now() - t0),
          serverTime: payload.time,
          payloadStatus: payload.status,
        }),
      ),
      catchError(
        (): Observable<DashboardHealthProbeResult> =>
          of({
            state: 'error',
            ms: null,
            serverTime: null,
            payloadStatus: '',
          }),
      ),
    );
  }

  /**
   * Ensures `/auth/me` has hydrated CSRF when the shell already has a user signal
   * (e.g. rare race after in-app navigation). No-op when session is complete.
   */
  public ensureAuthSessionReady(): Observable<boolean> {
    if (this.auth.isLoggedIn() && (this.auth.csrfToken() ?? '').length > 0) {
      return of(true);
    }
    if (!this.auth.isLoggedIn()) {
      return of(false);
    }
    return this.auth.tryRestoreSession();
  }
}
