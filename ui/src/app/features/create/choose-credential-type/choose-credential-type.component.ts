import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import type { CredentialSubtype } from '../credential.types';
import { CREDENTIAL_TYPE_OPTIONS } from '../credential.types';
import { getCredentialFormPath, getCredentialFormSchema } from '../credential-form-schema';
import { loadVaultCreateLimitSnapshot } from '../vault-create-limit.loader';
import { type VaultCreateLimitSnapshot, buildVaultCreateLimitSnapshot } from '../vault-create-item-limit';
import { buildCredentialSubtypeCounts } from '../vault-create-hub-stats';
import { credentialSubtypeIconClass } from '../../vault/vault-credential-category';

@Component({
  selector: 'app-choose-credential-type',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './choose-credential-type.component.html',
})
export class ChooseCredentialTypeComponent implements OnInit {
  private readonly vault = inject(VaultService);
  private readonly billing = inject(BillingApiService);

  public readonly options = CREDENTIAL_TYPE_OPTIONS;
  public readonly backPath = '/new';

  public readonly subtypeCounts = signal<Readonly<Record<CredentialSubtype, number>>>(
    buildCredentialSubtypeCounts([]),
  );

  public readonly createLimit = signal<VaultCreateLimitSnapshot>(buildVaultCreateLimitSnapshot('free', 0));

  public readonly vaultItemCreateBlocked = computed(() => this.createLimit().blocked);

  public readonly subscriptionUpgradeQueryParams = { from: 'create-limit' };

  public ngOnInit(): void {
    this.vault
      .listItems()
      .pipe(take(1))
      .subscribe({
        next: (items) => this.subtypeCounts.set(buildCredentialSubtypeCounts(items)),
        error: () => this.subtypeCounts.set(buildCredentialSubtypeCounts([])),
      });

    loadVaultCreateLimitSnapshot(this.billing)
      .pipe(take(1))
      .subscribe((snapshot) => this.createLimit.set(snapshot));
  }

  public vaultItemLimitUpgradeDesc(): string {
    const { activeItemCount, itemLimit } = this.createLimit();
    return `You have ${activeItemCount} of ${itemLimit} vault items on your plan. Upgrade or delete items to add more.`;
  }

  public subtypeCount(subtype: CredentialSubtype): number {
    return this.subtypeCounts()[subtype] ?? 0;
  }

  public getFormPath(subtype: CredentialSubtype): string {
    return getCredentialFormPath(subtype);
  }

  public hasForm(subtype: CredentialSubtype): boolean {
    return getCredentialFormSchema(subtype) != null;
  }

  public getSubtypeIconClass(subtype: CredentialSubtype): string {
    return `shrink-0 transition ${credentialSubtypeIconClass(subtype)}`;
  }
}
