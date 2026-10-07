import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import { CreateableItemType } from '../create.types';
import { CREATABLE_ITEM_OPTIONS } from '../create.types';
import { loadVaultCreateLimitSnapshot } from '../vault-create-limit.loader';
import { type VaultCreateLimitSnapshot, buildVaultCreateLimitSnapshot } from '../vault-create-item-limit';
import {
  buildCreateHubCategoryCounts,
  countForCreateHubOption,
  createHubCategoryCountsZero,
  type CreateHubCategoryCounts,
} from '../vault-create-hub-stats';

const SIMPLE_VAULT_FORM_IDS: CreateableItemType[] = ['id', 'password', 'key', 'secure-note', 'file'];

@Component({
  selector: 'app-choose-type',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './choose-type.component.html',
})
export class ChooseTypeComponent implements OnInit {
  private readonly vault = inject(VaultService);
  private readonly billing = inject(BillingApiService);

  public readonly options = CREATABLE_ITEM_OPTIONS;
  public readonly credentialsPath = '/new/credentials';

  /** Item counts by create-hub category (from server metadata; zeros if list fails). */
  public readonly hubCounts = signal<CreateHubCategoryCounts>(createHubCategoryCountsZero);

  /**
   * When false, the import tile links to Subscription instead of `/new/import`.
   * If billing summary fails, default true so API enforcement is the backstop.
   */
  public readonly vaultImportAllowed = signal(true);

  /** When false, Files shows an upgrade path instead of “Coming soon”. */
  public readonly vaultFilesPaidCapability = signal(true);

  /**
   * When true, creatable item tiles link to Subscription instead of the form routes.
   * Defaults permissive if billing readiness fails; API remains the backstop on submit.
   */
  public readonly createLimit = signal<VaultCreateLimitSnapshot>(buildVaultCreateLimitSnapshot('free', 0));

  public readonly vaultItemCreateBlocked = computed(() => this.createLimit().blocked);

  public readonly subscriptionUpgradeQueryParams = { from: 'create-limit' };

  public ngOnInit(): void {
    this.vault
      .listItems()
      .pipe(take(1))
      .subscribe({
        next: (items) => this.hubCounts.set(buildCreateHubCategoryCounts(items)),
        error: () => this.hubCounts.set(createHubCategoryCountsZero),
      });

    this.billing
      .getSummary()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const c = res.summary.capabilities;
          if (c !== undefined) {
            this.vaultImportAllowed.set(c.vault_import !== false);
            this.vaultFilesPaidCapability.set(c.vault_files !== false);
          }
        },
        error: () => {
          /* keep defaults */
        },
      });

    loadVaultCreateLimitSnapshot(this.billing)
      .pipe(take(1))
      .subscribe((snapshot) => this.createLimit.set(snapshot));
  }

  public vaultItemLimitUpgradeDesc(): string {
    const { activeItemCount, itemLimit } = this.createLimit();
    return `You have ${activeItemCount} of ${itemLimit} vault items on your plan. Upgrade or delete items to add more.`;
  }

  public hubCount(id: CreateableItemType): number {
    return countForCreateHubOption(id, this.hubCounts());
  }

  public isSimpleVaultFormOption(id: CreateableItemType): boolean {
    return SIMPLE_VAULT_FORM_IDS.includes(id);
  }

  public simpleVaultFormPath(id: CreateableItemType): string {
    return `/new/item/${id}`;
  }

  public getIconColorClass(id: CreateableItemType): string {
    const map: Record<CreateableItemType, string> = {
      credentials: 'text-app-icon-credentials',
      key: 'text-app-icon-keys',
      file: 'text-app-icon-files',
      password: 'text-app-icon-passwords',
      id: 'text-app-icon-ids',
      'secure-note': 'text-app-icon-secure',
    };
    return `shrink-0 transition ${map[id] ?? 'text-app-text-muted'}`;
  }
}
