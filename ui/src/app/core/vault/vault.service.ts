import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AuthService } from '../auth/auth.service';

export interface VaultProfilePayload {
  kdf_algo: string;
  kdf_params_json: Record<string, unknown>;
  kdf_salt: string;
  wrapped_vault_key: string;
  wrapped_vault_key_nonce: string;
  wrapped_vault_key_tag: string;
  crypto_version: number;
}

export interface VaultItemPayload {
  item_type: string;
  /**
   * Plaintext on the server for future list search. Not part of the encrypted JSON payload.
   * Omit or use empty string to clear when updating.
   */
  searchable_words?: string | null;
  label_ciphertext?: string | null;
  wrapped_dek: string;
  wrapped_dek_nonce: string;
  wrapped_dek_tag: string;
  payload_ciphertext: string;
  payload_nonce: string;
  payload_tag: string;
  crypto_version: number;
}

interface VaultProfileResponse {
  status: string;
  profile: VaultProfilePayload;
}

interface VaultItemMetadata {
  id: string;
  /** Per-user sequential number (1, 2, 3, …); stable across edits. Present after display-number migration. */
  display_number?: number;
  item_type: string;
  /** Present once API has `searchable_words` column; omitted on older servers. */
  searchable_words?: string | null;
  crypto_version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface VaultItemListResponse {
  status: string;
  items: VaultItemMetadata[];
}

interface VaultItemExportResponse {
  status: string;
  items: Array<VaultItemPayload & VaultItemMetadata>;
}

interface VaultItemResponse {
  status: string;
  item: VaultItemPayload & VaultItemMetadata;
}

export interface VaultBulkItemRow extends VaultItemPayload {
  client_index: number;
}

export interface VaultBulkCreateResponse {
  status: string;
  import_batch_id: string | null;
  results: Array<{
    client_index: number;
    status: string;
    id?: string;
    error?: string;
  }>;
}

export interface VaultFilePayload {
  /** Parent vault list row (`item_type: file`); one item may hold up to 32 files. */
  vault_item_id: string;
  original_filename: string;
  mime_type: string;
  plaintext_size_bytes: number;
  wrapped_dek: string;
  wrapped_dek_nonce: string;
  wrapped_dek_tag: string;
  payload_ciphertext: string;
  payload_nonce: string;
  payload_tag: string;
  crypto_version: number;
}

export interface VaultFileListEntry {
  id: string;
  user_id: string;
  vault_item_id: string;
  original_filename: string;
  mime_type: string;
  plaintext_size_bytes: number;
  crypto_version: number;
  created_at: string;
  updated_at: string;
}

export interface VaultFileEntry extends VaultFileListEntry {
  wrapped_dek: string;
  wrapped_dek_nonce: string;
  wrapped_dek_tag: string;
  payload_ciphertext: string;
  payload_nonce: string;
  payload_tag: string;
}

/** Max items per `POST /vault/items/bulk` request (import batches client-side to this size). */
export const VAULT_BULK_CREATE_MAX_ITEMS = 512;

/** Optional `GET /vault/items` filters (server applies the same rules as the vault list search helper). */
export interface VaultListItemsQuery {
  search: string;
  searchFullWord?: boolean;
  searchCaseSensitive?: boolean;
}

export interface RecoveryArtifactPayload {
  artifact_type: string;
  wrapped_vault_key_recovery: string;
  nonce: string;
  tag: string;
}

interface RecoveryArtifactResponse {
  status: string;
  artifact: {
    id: string;
    user_id: string;
    artifact_type: string;
    wrapped_vault_key_recovery?: string;
    nonce?: string;
    tag?: string;
    created_at: string;
    revoked_at: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class VaultService {
  constructor(
    private readonly api: ApiClientService,
    private readonly auth: AuthService,
  ) {}

  public upsertProfile(payload: VaultProfilePayload) {
    return this.api.put<{ status: string }>('/api/v1/vault/profile', payload, this.requireCsrf());
  }

  public getProfile() {
    return this.api.get<VaultProfileResponse>('/api/v1/vault/profile');
  }

  public createItem(payload: VaultItemPayload) {
    return this.api.post<VaultItemResponse>('/api/v1/vault/items', payload, this.requireCsrf());
  }

  public createItemsBulk(importBatchId: string | null, items: VaultBulkItemRow[]) {
    return this.api.post<VaultBulkCreateResponse>(
      '/api/v1/vault/items/bulk',
      {
        import_batch_id: importBatchId,
        items,
      },
      this.requireCsrf(),
    );
  }

  public listItems(query?: VaultListItemsQuery) {
    let params: HttpParams | undefined;
    if (query !== undefined && query.search.trim() !== '') {
      params = new HttpParams()
        .set('search', query.search.trim())
        .set('search_full_word', query.searchFullWord === true ? '1' : '0')
        .set('search_case_sensitive', query.searchCaseSensitive === true ? '1' : '0');
    }
    return this.api.get<VaultItemListResponse>('/api/v1/vault/items', undefined, params).pipe(map((r) => r.items));
  }

  public exportItemsJson() {
    return this.api.get<VaultItemExportResponse>('/api/v1/vault/items/export').pipe(map((r) => r.items));
  }

  public getItem(id: string) {
    return this.api.get<VaultItemResponse>(`/api/v1/vault/items/${id}`);
  }

  public updateItem(id: string, payload: VaultItemPayload) {
    return this.api.put<VaultItemResponse>(`/api/v1/vault/items/${id}`, payload, this.requireCsrf());
  }

  public deleteItem(id: string) {
    return this.api.delete<{ status: string }>(`/api/v1/vault/items/${id}`, this.requireCsrf());
  }

  /**
   * Soft-deletes every vault item for the current user after the server verifies `account_password`
   * (login password, not the vault unlock secret).
   */
  public deleteAllVaultItems(accountPassword: string) {
    return this.api.post<{ status: string; deleted_count: number }>(
      '/api/v1/vault/items/delete-all',
      { account_password: accountPassword },
      this.requireCsrf(),
    );
  }

  public createRecoveryArtifact(payload: RecoveryArtifactPayload) {
    return this.api.post<RecoveryArtifactResponse>('/api/v1/vault/recovery/artifact', payload, this.requireCsrf());
  }

  public getRecoveryArtifact() {
    return this.api.get<RecoveryArtifactResponse>('/api/v1/vault/recovery/artifact');
  }

  public rotateRecoveryArtifact(payload: RecoveryArtifactPayload) {
    return this.api.post<RecoveryArtifactResponse>(
      '/api/v1/vault/recovery/rotate-unlock-material',
      payload,
      this.requireCsrf(),
    );
  }

  public createFile(payload: VaultFilePayload) {
    return this.api.post<{ status: string; file: VaultFileEntry }>('/api/v1/vault/files', payload, this.requireCsrf());
  }

  public getVaultFileUsage() {
    return this.api.get<{
      status: string;
      used_bytes: number;
      limit_bytes: number;
      max_bytes_per_file: number;
      max_files_per_vault_item: number;
      suggested_client_batch: number;
    }>('/api/v1/vault/files/usage');
  }

  public listFiles(vaultItemId: string) {
    const params = new HttpParams().set('vault_item_id', vaultItemId.trim());
    return this.api
      .get<{ status: string; files: VaultFileListEntry[] }>('/api/v1/vault/files', undefined, params)
      .pipe(map((r) => r.files));
  }

  public getFile(id: string) {
    return this.api.get<{ status: string; file: VaultFileEntry }>(`/api/v1/vault/files/${id}`);
  }

  public deleteFile(id: string) {
    return this.api.delete<{ status: string }>(`/api/v1/vault/files/${id}`, this.requireCsrf());
  }

  private requireCsrf(): string {
    return this.auth.csrfToken() ?? '';
  }
}

