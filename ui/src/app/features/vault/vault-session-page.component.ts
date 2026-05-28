import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ToastService } from '../../core/ui/toast.service';
import { isSafeAppInternalPath } from '../../core/vault/app-return-path';
import { VAULT_ENCRYPTED_ITEMS_ROUTE, VAULT_SETTINGS_ROUTE } from '../../core/vault/vault-app-paths';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { VaultIdleAutoLockPresetsComponent } from './vault-idle-auto-lock-presets.component';
import { VaultQuickUnlockDialogComponent } from './vault-quick-unlock-dialog.component';

/** Vault in-tab session: lock + idle presets (route `/vault/session`). */
@Component({
  selector: 'app-vault-session-page',
  standalone: true,
  imports: [RouterLink, VaultIdleAutoLockPresetsComponent, VaultQuickUnlockDialogComponent],
  templateUrl: './vault-session-page.component.html',
})
export class VaultSessionPageComponent implements OnInit {
  public readonly settingsPath = VAULT_SETTINGS_ROUTE;
  public readonly itemsRoute = VAULT_ENCRYPTED_ITEMS_ROUTE;

  public readonly unlockModalOpen = signal(false);

  public constructor(
    public readonly vaultSession: VaultSessionService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  public ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && isSafeAppInternalPath(returnUrl) && !this.vaultSession.isUnlocked()) {
      this.unlockModalOpen.set(true);
    }
  }

  public openUnlockModal(): void {
    this.unlockModalOpen.set(true);
  }

  public onQuickUnlockSuccess(): void {
    this.unlockModalOpen.set(false);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && isSafeAppInternalPath(returnUrl)) {
      void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    }
  }

  public onQuickUnlockCancelled(): void {
    this.unlockModalOpen.set(false);
  }

  public lockVault(): void {
    if (!this.vaultSession.isUnlocked()) {
      return;
    }
    this.vaultSession.lockInMemory();
    this.toast.info('Vault locked');
  }
}
