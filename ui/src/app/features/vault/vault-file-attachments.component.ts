import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { take } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { VaultService, type VaultFileListEntry } from '../../core/vault/vault.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import {
  VAULT_FILE_ALLOWED_MIME_TYPES,
  VAULT_FILE_MAX_BYTES,
  VAULT_FILE_MAX_PER_VAULT_ITEM,
  VAULT_FILE_TOTAL_BYTES,
  VAULT_FILE_UPLOAD_BATCH_MAX,
  mimeTypeForVaultUpload,
  vaultFileMaxSizeLabel,
} from '../../core/vault/vault-file-policy';

/** Encrypted attachments for a `item_type: file` vault item (list/detail, not standalone create). */
@Component({
  selector: 'app-vault-file-attachments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vault-file-attachments.component.html',
})
export class VaultFileAttachmentsComponent {
  public readonly vaultItemId = input.required<string>();
  /** When true, show per-file remove (edit mode only). Upload/download stay available whenever the vault is unlocked. */
  public readonly allowFileRemove = input(false);

  protected readonly files = signal<VaultFileListEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly usedBytesTotal = signal(0);
  protected readonly maxPerItem = signal(VAULT_FILE_MAX_PER_VAULT_ITEM);
  protected readonly maxBytesPerFile = signal(VAULT_FILE_MAX_BYTES);
  protected readonly batchMax = VAULT_FILE_UPLOAD_BATCH_MAX;
  protected readonly maxFileSizeLabel = vaultFileMaxSizeLabel();

  private readonly vault = inject(VaultService);
  private readonly crypto = inject(WebCryptoService);
  private readonly vaultSession = inject(VaultSessionService);
  private readonly toast = inject(ToastService);

  public constructor() {
    effect(() => {
      const id = this.vaultItemId();
      if (id.trim() === '') {
        return;
      }
      this.refreshAll(id);
    });
  }

  protected plaintextSize(entry: VaultFileListEntry): number {
    const n = entry.plaintext_size_bytes;
    if (typeof n === 'number' && !Number.isNaN(n)) {
      return n;
    }
    if (typeof n === 'string' && n !== '') {
      const p = parseInt(n, 10);
      return Number.isNaN(p) ? 0 : p;
    }
    return 0;
  }

  protected humanBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${bytes} B`;
  }

  protected remainingSlots(): number {
    const cap = this.maxPerItem();
    const safeCap = Number.isFinite(cap) && cap > 0 ? cap : VAULT_FILE_MAX_PER_VAULT_ITEM;

    return Math.max(0, safeCap - this.files().length);
  }

  protected openAttachPicker(input: HTMLInputElement): void {
    if (this.uploading() || this.remainingSlots() === 0) {
      return;
    }
    input.click();
  }

  protected onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const list = inputEl.files;
    if (list === null || list.length === 0) {
      inputEl.value = '';
      return;
    }
    if (this.uploading()) {
      inputEl.value = '';
      return;
    }
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error('Vault is locked. Unlock first to encrypt and upload files.');
      inputEl.value = '';
      return;
    }
    const vaultId = this.vaultItemId().trim();
    if (vaultId === '') {
      inputEl.value = '';
      return;
    }
    const raw = Array.from(list);
    const batch = raw.slice(0, VAULT_FILE_UPLOAD_BATCH_MAX);
    if (raw.length > VAULT_FILE_UPLOAD_BATCH_MAX) {
      this.toast.info(`Only the first ${VAULT_FILE_UPLOAD_BATCH_MAX} files are taken this time.`);
    }
    const room = this.remainingSlots();
    if (room <= 0) {
      this.toast.error(`This file vault already has the maximum of ${this.maxPerItem()} files.`);
      inputEl.value = '';
      return;
    }
    const toUpload = batch.slice(0, room);
    if (toUpload.length < batch.length) {
      this.toast.error(`You can add at most ${room} more file(s) to this vault item (${this.maxPerItem()} total).`);
    }
    if (toUpload.length === 0) {
      inputEl.value = '';
      return;
    }
    void this.uploadSequentially(vaultId, toUpload, inputEl);
  }

  private async uploadSequentially(vaultItemId: string, picked: File[], inputEl: HTMLInputElement): Promise<void> {
    this.uploading.set(true);
    try {
      for (const selected of picked) {
        const mime = mimeTypeForVaultUpload(selected);
        if (mime === '' || !VAULT_FILE_ALLOWED_MIME_TYPES.has(mime)) {
          this.toast.error(
            'File type not allowed or unknown (empty browser MIME). Use image, PDF, TXT, DOC/DOCX, XLS/XLSX, or PPT/PPTX with a normal extension.',
          );
          continue;
        }
        if (selected.size <= 0) {
          this.toast.error('Skipped an empty file.');
          continue;
        }
        if (selected.size > this.maxBytesPerFile()) {
          this.toast.error(`Maximum file size is ${vaultFileMaxSizeLabel()}.`);
          continue;
        }
        if (this.usedBytesTotal() + selected.size > VAULT_FILE_TOTAL_BYTES) {
          this.toast.error('Per-user encrypted file quota (1GB) reached.');
          break;
        }
        if (this.files().length >= this.maxPerItem()) {
          this.toast.error(`This file vault already has the maximum of ${this.maxPerItem()} files.`);
          break;
        }
        try {
          const ab = await selected.arrayBuffer();
          const payload = await this.crypto.encryptVaultFile(new Uint8Array(ab), {
            originalFilename: selected.name,
            mimeType: mime,
            vaultItemId,
          });
          await new Promise<void>((resolve, reject) => {
            this.vault.createFile(payload).pipe(take(1)).subscribe({
              next: () => resolve(),
              error: (err: { error?: { error?: string; message?: string } }) =>
                reject(new Error(err?.error?.message ?? err?.error?.error ?? 'Upload failed')),
            });
          });
          this.toast.success(`Uploaded ${selected.name}`);
        } catch (e: unknown) {
          this.toast.error(e instanceof Error ? e.message : 'Upload failed');
        }
        this.refreshFileListOnly(vaultItemId);
        this.refreshUsageOnly();
      }
    } finally {
      this.uploading.set(false);
      inputEl.value = '';
    }
  }

  protected downloadFile(fileId: string): void {
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error('Vault is locked. Unlock first to decrypt files.');
      return;
    }
    this.vault
      .getFile(fileId)
      .pipe(take(1))
      .subscribe({
        next: async (res) => {
          try {
            const file = res.file;
            const plain = await this.crypto.decryptVaultFilePayload(file);
            const blobBytes = new Uint8Array(plain.byteLength);
            blobBytes.set(plain);
            const blob = new Blob([blobBytes], { type: file.mime_type || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.original_filename || 'vault-file';
            a.click();
            URL.revokeObjectURL(url);
          } catch (e: unknown) {
            this.toast.error(e instanceof Error ? e.message : 'Could not decrypt file');
          }
        },
        error: (err: { error?: { error?: string; message?: string } }) =>
          this.toast.error(err?.error?.message ?? err?.error?.error ?? 'Could not fetch file'),
      });
  }

  protected deleteFile(fileId: string): void {
    this.vault
      .deleteFile(fileId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.toast.success('File removed');
          this.refreshAll(this.vaultItemId());
        },
        error: (err: { error?: { error?: string; message?: string } }) =>
          this.toast.error(err?.error?.message ?? err?.error?.error ?? 'Delete failed'),
      });
  }

  private refreshAll(vaultItemId: string): void {
    this.loading.set(true);
    this.vault.getVaultFileUsage().subscribe({
      next: (u) => {
        this.usedBytesTotal.set(u.used_bytes);
        const m = u.max_files_per_vault_item;
        if (typeof m === 'number' && Number.isFinite(m) && m > 0) {
          this.maxPerItem.set(Math.min(VAULT_FILE_MAX_PER_VAULT_ITEM, m));
        }
        const maxBytes = u.max_bytes_per_file;
        if (typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0) {
          this.maxBytesPerFile.set(Math.min(VAULT_FILE_MAX_BYTES, maxBytes));
        }
      },
      error: () => {
        this.usedBytesTotal.set(0);
      },
    });
    this.vault
      .listFiles(vaultItemId)
      .pipe(take(1))
      .subscribe({
        next: (list) => {
          this.files.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.files.set([]);
          this.loading.set(false);
          this.toast.error('Could not load attachments');
        },
      });
  }

  private refreshFileListOnly(vaultItemId: string): void {
    this.vault
      .listFiles(vaultItemId)
      .pipe(take(1))
      .subscribe({
        next: (list) => this.files.set(list),
        error: () => undefined,
      });
  }

  private refreshUsageOnly(): void {
    this.vault.getVaultFileUsage().subscribe({
      next: (u) => this.usedBytesTotal.set(u.used_bytes),
      error: () => undefined,
    });
  }
}
