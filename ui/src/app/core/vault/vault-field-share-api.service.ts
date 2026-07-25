import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AuthService } from '../auth/auth.service';
import type { VaultFieldShareEncryptedBlob } from './vault-field-share.constants';

export interface VaultFieldSharePrepareRequest {
  vault_item_id: string;
  field_key: string;
  label?: string | null;
  expires_at: string;
  max_views: number;
}

export interface VaultFieldSharePrepareResult {
  share_id: string;
  expires_at: string;
  max_views: number;
}

export interface VaultFieldShareFinalizeResult {
  id: string;
  share_id: string;
  expires_at: string;
  max_views: number;
  redeem_url: string;
}

export interface VaultFieldShareListEntry {
  id: string;
  share_id: string;
  label: string | null;
  field_key: string | null;
  status: string;
  expires_at: string;
  max_views: number;
  view_count: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class VaultFieldShareApiService {
  constructor(
    private readonly api: ApiClientService,
    private readonly auth: AuthService,
  ) {}

  public prepare(body: VaultFieldSharePrepareRequest): Observable<VaultFieldSharePrepareResult> {
    return this.api
      .post<{ status: string; share: VaultFieldSharePrepareResult }>('/api/v1/vault/shares/prepare', body, this.csrf())
      .pipe(map((r) => r.share));
  }

  public finalize(shareId: string, blob: VaultFieldShareEncryptedBlob): Observable<VaultFieldShareFinalizeResult> {
    return this.api
      .post<{ status: string; share: VaultFieldShareFinalizeResult }>(
        `/api/v1/vault/shares/${encodeURIComponent(shareId)}/finalize`,
        blob,
        this.csrf(),
      )
      .pipe(map((r) => r.share));
  }

  public list(): Observable<VaultFieldShareListEntry[]> {
    return this.api
      .get<{ status: string; shares: VaultFieldShareListEntry[] }>('/api/v1/vault/shares', this.csrf())
      .pipe(map((r) => r.shares));
  }

  public revoke(id: string): Observable<void> {
    return this.api
      .delete<{ status: string }>(`/api/v1/vault/shares/${encodeURIComponent(id)}`, this.csrf())
      .pipe(map(() => undefined));
  }

  /** Public fetch — no CSRF or session. Called only after user clicks Reveal. */
  public fetchPublic(shareId: string): Observable<import('./vault-field-share.constants').VaultFieldShareFetchResponse> {
    return this.api
      .postPublic<{ status: string; share: import('./vault-field-share.constants').VaultFieldShareFetchResponse }>(
        `/api/v1/share/${encodeURIComponent(shareId)}/fetch`,
      )
      .pipe(map((r) => r.share));
  }

  /** Marks share as viewed after successful client-side decrypt. */
  public consumePublic(shareId: string): Observable<void> {
    return this.api
      .postPublic<{ status: string }>(`/api/v1/share/${encodeURIComponent(shareId)}/consume`)
      .pipe(map(() => undefined));
  }

  private csrf(): string {
    return this.auth.csrfToken() ?? '';
  }
}
