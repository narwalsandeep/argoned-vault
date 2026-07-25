import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import {
  resolveSearchableWordsForSave,
  vaultSearchableWordsFormControlConfig,
} from '../../../core/vault/vault-searchable-words-form';

import type { SimpleVaultItemKind } from '../../vault/vault-item-display';
import { simpleVaultItemTypeFromRouteParam } from '../../vault/vault-item-display';
import { getSimpleVaultItemFormSchema, type SimpleVaultItemFormSchema } from '../simple-vault-item-form-schema';
import { ToastService } from '../../../core/ui/toast.service';
import { VAULT_ENCRYPTED_ITEMS_ROUTE } from '../../../core/vault/vault-app-paths';
import { VaultSessionService } from '../../../core/vault/vault-session.service';
import { VaultService } from '../../../core/vault/vault.service';
import { WebCryptoService } from '../../../core/vault/web-crypto.service';
import type { VaultInlineEditPayload } from '../../vault/vault-item-edit-support';
import { patchVaultFieldsFormFromDecrypted, VAULT_INLINE_EDIT_FORM_ID } from '../../vault/vault-item-edit-support';

@Component({
  selector: 'app-simple-vault-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './simple-vault-item-form.component.html',
})
export class SimpleVaultItemFormComponent {
  protected readonly vaultInlineEditFormId = VAULT_INLINE_EDIT_FORM_ID;
  public readonly formLayout = input<'page' | 'inline'>('page');
  public readonly vaultInlineEdit = input<VaultInlineEditPayload | null>(null);
  /** When true with `formLayout="inline"`, the vault detail pane renders Update/Cancel in its own toolbar. */
  public readonly inlineExternalToolbar = input(false);
  public readonly vaultInlineSimpleKind = input<SimpleVaultItemKind | null>(null);
  public readonly vaultInlineEditCancel = output<void>();
  public readonly vaultInlineEditSaved = output<void>();
  /** Vault inline edit only: trash control next to Cancel in the form header. */
  public readonly vaultInlineEditDelete = output<void>();
  /** Vault inline edit only: open change-type wizard from the footer row. */
  public readonly vaultInlineEditChangeType = output<void>();

  public form: FormGroup;
  public schema: SimpleVaultItemFormSchema | null = null;
  public readonly backPath = '/new';

  private readonly route = inject(ActivatedRoute);
  private readonly routeKind = toSignal(
    this.route.paramMap.pipe(
      map((params) => simpleVaultItemTypeFromRouteParam(params.get('kind') ?? undefined)),
    ),
    { initialValue: null },
  );

  public constructor(
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
      const inlineKind = this.vaultInlineSimpleKind();
      const routeKind = this.routeKind();

      const kind = layout === 'inline' ? inlineKind : routeKind;
      if (kind === null) {
        this.schema = null;
        this.buildForm();
        return;
      }
      this.schema = getSimpleVaultItemFormSchema(kind);
      this.buildForm();
      if (layout === 'inline' && inlinePayload !== null) {
        patchVaultFieldsFormFromDecrypted(this.form, this.schema.fields, inlinePayload.decrypted, inlinePayload.searchableWords);
      }
    });
  }

  private buildForm(): void {
    const controls: Record<string, unknown> = {
      searchable_words: vaultSearchableWordsFormControlConfig(),
    };
    if (this.schema) {
      for (const field of this.schema.fields) {
        controls[field.key] = [''];
      }
    }
    this.form = this.fb.group(controls);
  }

  public getSchema(): SimpleVaultItemFormSchema | null {
    return this.schema;
  }

  public onCancelInline(): void {
    this.vaultInlineEditCancel.emit();
  }

  public   onVaultInlineDeleteClick(): void {
    if (this.vaultInlineEdit() !== null) {
      this.vaultInlineEditDelete.emit();
    }
  }

  onVaultInlineChangeTypeClick(): void {
    if (this.vaultInlineEdit() !== null) {
      this.vaultInlineEditChangeType.emit();
    }
  }

  public async onSubmit(): Promise<void> {
    if (this.schema === null) {
      this.toast.error('Select an item type first.');
      return;
    }

    if (!this.vaultSession.isUnlocked()) {
      this.toast.error(
        'Vault is locked. Use the unlock dialog when prompted, or open Encrypted vault; idle timeout presets are on Vault → Session.',
      );
      return;
    }

    const values = this.form.getRawValue() as Record<string, string>;
    const searchable = resolveSearchableWordsForSave(values);
    if (searchable === null) {
      this.form.get('searchable_words')?.markAsTouched();
      this.toast.error('Searchable words are required.');
      return;
    }

    try {
      const { searchable_words: _sw, ...rest } = values;
      const raw = {
        ...rest,
        vault_simple_kind: this.schema.kind,
      };
      const payload = await this.crypto.encryptVaultItem(raw, this.schema.itemType);
      const body = { ...payload, searchable_words: searchable };
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
