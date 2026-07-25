import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import { CreateableItemType } from '../create.types';
import { CREATABLE_ITEM_OPTIONS } from '../create.types';
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
