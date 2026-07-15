import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { VaultService } from '../../../core/vault/vault.service';
import type { CredentialSubtype } from '../credential.types';
import { CREDENTIAL_TYPE_OPTIONS } from '../credential.types';
import { getCredentialFormPath, getCredentialFormSchema } from '../credential-form-schema';
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

  public readonly options = CREDENTIAL_TYPE_OPTIONS;
  public readonly backPath = '/new';

  public readonly subtypeCounts = signal<Readonly<Record<CredentialSubtype, number>>>(
    buildCredentialSubtypeCounts([]),
  );

  public ngOnInit(): void {
    this.vault
      .listItems()
      .pipe(take(1))
      .subscribe({
        next: (items) => this.subtypeCounts.set(buildCredentialSubtypeCounts(items)),
        error: () => this.subtypeCounts.set(buildCredentialSubtypeCounts([])),
      });
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
