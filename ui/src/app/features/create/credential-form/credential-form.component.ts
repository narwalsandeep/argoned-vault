import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import type { CredentialSubtype } from '../credential.types';
import { credentialSubtypeFromRouteParam } from '../credential.types';
import { getCredentialFormSchema, type CredentialFormSchema } from '../credential-form-schema';
import { ToastService } from '../../../core/ui/toast.service';
import { VAULT_ENCRYPTED_ITEMS_ROUTE } from '../../../core/vault/vault-app-paths';
import { VaultSessionService } from '../../../core/vault/vault-session.service';
import { VaultService } from '../../../core/vault/vault.service';
import { WebCryptoService } from '../../../core/vault/web-crypto.service';
import type { VaultInlineEditPayload } from '../../vault/vault-item-edit-support';
import { patchVaultFieldsFormFromDecrypted } from '../../vault/vault-item-edit-support';

@Component({
  selector: 'app-credential-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './credential-form.component.html',
})
export class CredentialFormComponent {
  public readonly formLayout = input<'page' | 'inline'>('page');
  public readonly vaultInlineEdit = input<VaultInlineEditPayload | null>(null);
  public readonly vaultInlineCredentialSubtype = input<CredentialSubtype | null>(null);
  public readonly vaultInlineEditCancel = output<void>();
  public readonly vaultInlineEditSaved = output<void>();
  /** Vault inline edit only: trash control next to Cancel in the form header. */
  public readonly vaultInlineEditDelete = output<void>();
  /** Vault inline edit only: open change-type wizard from the footer row. */
  public readonly vaultInlineEditChangeType = output<void>();

  form: FormGroup;
  schema: CredentialFormSchema | null = null;
  backPath = '/new/credentials';

  private readonly route = inject(ActivatedRoute);
  private readonly routeSubtype = toSignal(
    this.route.paramMap.pipe(map((params) => credentialSubtypeFromRouteParam(params.get('subtype')))),
    { initialValue: null },
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly vaultSession: VaultSessionService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({});
    effect(() => {
      const layout = this.formLayout();
      const inlinePayload = this.vaultInlineEdit();
      const inlineSubtype = this.vaultInlineCredentialSubtype();
      const routeSubtype = this.routeSubtype();

      const subtype = layout === 'inline' ? inlineSubtype : routeSubtype;
      if (subtype === null) {
        this.schema = null;
        this.buildForm();
        return;
      }
      this.schema = getCredentialFormSchema(subtype);
      this.buildForm();
      if (layout === 'inline' && inlinePayload !== null && this.schema !== null) {
        patchVaultFieldsFormFromDecrypted(this.form, this.schema.fields, inlinePayload.decrypted, inlinePayload.searchableWords);
      }
    });
  }

  private buildForm(): void {
    const controls: Record<string, unknown> = {
      searchable_words: [''],
    };
    if (this.schema) {
      for (const field of this.schema.fields) {
        controls[field.key] = [''];
      }
    }
    this.form = this.fb.group(controls);
  }

  getSchema(): CredentialFormSchema | null {
    return this.schema;
  }

  onCancelInline(): void {
    this.vaultInlineEditCancel.emit();
  }

  onVaultInlineDeleteClick(): void {
    if (this.vaultInlineEdit() !== null) {
      this.vaultInlineEditDelete.emit();
    }
  }

  onVaultInlineChangeTypeClick(): void {
    if (this.vaultInlineEdit() !== null) {
      this.vaultInlineEditChangeType.emit();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.schema === null) {
      this.toast.error('Select a credential type first.');
      return;
    }

    if (!this.vaultSession.isUnlocked()) {
      this.toast.error(
        'Vault is locked. Use the unlock dialog when prompted, or open Encrypted vault; idle timeout presets are on Vault → Session.',
      );
      return;
    }

    try {
      const subtype = this.schema?.subtype;
      const values = this.form.getRawValue() as Record<string, string>;
      const searchable = typeof values['searchable_words'] === 'string' ? values['searchable_words'].trim() : '';
      const { searchable_words: _sw, ...fieldValues } = values;
      const raw = { ...fieldValues, ...(subtype != null ? { credential_subtype: subtype } : {}) };
      const payload = await this.crypto.encryptCredentialItem(raw, subtype);
      const body = searchable !== '' ? { ...payload, searchable_words: searchable } : payload;
      const inlineId = this.formLayout() === 'inline' ? this.vaultInlineEdit()?.itemId : undefined;
      const save$ =
        inlineId !== undefined && inlineId !== ''
          ? this.vault.updateItem(inlineId, body)
          : this.vault.createItem(body);
      save$.subscribe({
        next: () => {
          if (inlineId !== undefined && inlineId !== '') {
            this.toast.success('Item updated');
            this.vaultInlineEditSaved.emit();
          } else {
            this.toast.success('Saved encrypted item');
            void this.router.navigateByUrl(VAULT_ENCRYPTED_ITEMS_ROUTE);
          }
        },
        error: (err: { error?: { error?: string; message?: string } }) => {
          const code = err?.error?.error;
          if (code === 'vault_item_limit_reached') {
            this.toast.error('Plan item limit reached. Upgrade or delete items to continue.');
            return;
          }
          this.toast.error(err?.error?.message ?? code ?? 'Save failed');
        },
      });
    } catch (error: unknown) {
      this.toast.error(error instanceof Error ? error.message : 'Vault is locked');
    }
  }
}
