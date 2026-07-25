import { Component, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { VAULT_SESSION_ROUTE } from '../../core/vault/vault-app-paths';
import { VaultService } from '../../core/vault/vault.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultEncryptedItemsComponent } from './vault-encrypted-items.component';
import { VaultQuickUnlockDialogComponent } from './vault-quick-unlock-dialog.component';

/** Vault item list + decrypt workspace (route `/vault/items`). */
@Component({
  selector: 'app-vault-items',
  standalone: true,
  imports: [RouterLink, VaultEncryptedItemsComponent, VaultQuickUnlockDialogComponent],
  templateUrl: './vault-list-page.component.html',
})
export class VaultListPageComponent {
  public readonly sessionRoute = VAULT_SESSION_ROUTE;

  public readonly unlockModalOpen = signal(false);
  public readonly exportBusy = signal(false);

  private readonly workspace = viewChild<VaultEncryptedItemsComponent>('workspace');

  public constructor(
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly vaultSession: VaultSessionService,
    private readonly toast: ToastService,
  ) {}

  public onUnlockRequired(): void {
    this.unlockModalOpen.set(true);
  }

  public onModalUnlocked(): void {
    this.unlockModalOpen.set(false);
    this.workspace()?.notifyVaultUnlocked();
  }

  public onModalCancelled(): void {
    this.unlockModalOpen.set(false);
    this.workspace()?.clearPendingUnlock();
  }

  public async exportVaultAsJson(): Promise<void> {
    if (this.exportBusy()) {
      return;
    }
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error('Unlock vault before exporting decrypted JSON.');
      return;
    }
    this.exportBusy.set(true);
    try {
      const items = await firstValueFrom(this.vault.exportItemsJson());
      const decryptedItems = await Promise.all(items.map(async (item) => this.crypto.decryptItemPayload(item)));
      const payload = {
        exported_at: new Date().toISOString(),
        export_format: 'vault-decrypted-items-v1',
        item_count: decryptedItems.length,
        excludes_item_type: ['file'],
        items: decryptedItems,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = this.buildExportFilename();
      anchor.click();
      URL.revokeObjectURL(url);
      this.toast.success(`Exported ${decryptedItems.length} vault item${decryptedItems.length === 1 ? '' : 's'} as JSON`);
    } catch {
      this.toast.error('Unable to export decrypted vault items right now.');
    } finally {
      this.exportBusy.set(false);
    }
  }

  private buildExportFilename(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${this.pad2(now.getMonth() + 1)}${this.pad2(now.getDate())}-${this.pad2(now.getHours())}${this.pad2(now.getMinutes())}${this.pad2(now.getSeconds())}`;

    return `vault-items-export-${stamp}.json`;
  }

  private pad2(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
