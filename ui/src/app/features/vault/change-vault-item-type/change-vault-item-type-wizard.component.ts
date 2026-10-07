import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';

import { AppShellModalComponent } from '../../../core/ui/app-shell-modal.component';
import { ToastService } from '../../../core/ui/toast.service';
import { VaultSessionService } from '../../../core/vault/vault-session.service';
import { VaultService } from '../../../core/vault/vault.service';
import { WebCryptoService } from '../../../core/vault/web-crypto.service';
import { encryptImportRow } from '../../create/import-vault-items/import-encrypt';
import {
  coerceImportMapSelectValue,
  getImportFieldSelectOptions,
  sanitizeImportKeyMapValues,
} from '../../create/import-vault-items/import-field-catalog';
import { findDuplicateImportMapTargets } from '../../create/import-vault-items/import-key-map';
import { normalizeImportRow } from '../../create/import-vault-items/import-normalize';
import { vaultItemListLabel } from '../vault-item-display';
import { buildChangeTypeKeyMap, sourceKeysForVaultChangeType } from './change-vault-item-type-key-map';
import type { ChangeVaultItemTypeWizardContext } from './change-vault-item-type-targets';
import { listChangeVaultItemTypeTargets } from './change-vault-item-type-targets';

function titleFallbackFromDecrypted(decrypted: Record<string, unknown>): string {
  const keys = ['name', 'title', 'label', 'service', 'product'] as const;
  for (const k of keys) {
    const v = decrypted[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim().slice(0, 200);
    }
  }
  return 'Vault item';
}

function previewValueString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    const s = JSON.stringify(value);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  }
  const s = String(value);
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

@Component({
  selector: 'app-change-vault-item-type-wizard',
  standalone: true,
  imports: [CommonModule, AppShellModalComponent],
  templateUrl: './change-vault-item-type-wizard.component.html',
})
export class ChangeVaultItemTypeWizardComponent {
  public readonly open = input(false);
  public readonly context = input<ChangeVaultItemTypeWizardContext | null>(null);

  public readonly dismissed = output<void>();
  /** Parent should refresh the item and exit inline edit, same as after a normal update. */
  public readonly completed = output<void>();

  readonly step = signal<1 | 2 | 3>(1);
  readonly targetItemType = signal<string | null>(null);
  readonly keyMap = signal<Record<string, string>>({});
  readonly saving = signal(false);

  readonly targets = computed(() => {
    const src = this.context()?.sourceItemType;
    return src ? listChangeVaultItemTypeTargets(src) : [];
  });

  /**
   * Same source-key list as import field mapping (alphabetical object keys via {@link extractImportSourceKeys}),
   * not `Object.keys(keyMap)` order, so the table matches import and every row has a stored or baseline map entry.
   */
  readonly mapSourceKeys = computed(() => {
    const ctx = this.context();
    const t = this.targetItemType();
    if (!ctx || !t) {
      return [];
    }
    return sourceKeysForVaultChangeType(ctx.decrypted);
  });

  /** Sanitized {@link buildChangeTypeKeyMap} for the current target; used like import `fieldMapSelectValue` baseline. */
  private readonly baselineFieldMap = computed(() => {
    const ctx = this.context();
    const t = this.targetItemType();
    if (!ctx || !t) {
      return {} as Record<string, string>;
    }
    return sanitizeImportKeyMapValues(t, buildChangeTypeKeyMap(ctx.decrypted, t));
  });

  readonly duplicateMapTargets = computed(() =>
    this.targetItemType()
      ? findDuplicateImportMapTargets(sanitizeImportKeyMapValues(this.targetItemType()!, this.keyMap()))
      : [],
  );

  readonly previewRows = computed(() => {
    const ctx = this.context();
    const t = this.targetItemType();
    if (!ctx || !t) {
      return [] as { key: string; value: string }[];
    }
    const km = sanitizeImportKeyMapValues(t, this.keyMap());
    if (findDuplicateImportMapTargets(km).length > 0) {
      return [];
    }
    const { record, errors } = normalizeImportRow(ctx.decrypted, t, {
      keyMap: km,
      titleFallback: titleFallbackFromDecrypted(ctx.decrypted),
    });
    if (errors.length > 0) {
      return [];
    }
    const rows: { key: string; value: string }[] = [];
    for (const [key, raw] of Object.entries(record)) {
      if (key === 'vault_simple_kind' || key === 'credential_subtype') {
        continue;
      }
      rows.push({ key, value: previewValueString(raw) });
    }
    rows.sort((a, b) => a.key.localeCompare(b.key));
    return rows;
  });

  private readonly vault = inject(VaultService);
  private readonly crypto = inject(WebCryptoService);
  private readonly toast = inject(ToastService);
  private readonly vaultSession = inject(VaultSessionService);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const ctx = this.context();
      if (!ctx) {
        return;
      }
      untracked(() => {
        this.step.set(1);
        this.targetItemType.set(null);
        this.keyMap.set({});
        this.saving.set(false);
      });
    });
  }

  targetLabel(itemType: string): string {
    return vaultItemListLabel(itemType);
  }

  selectOptions(itemType: string) {
    return getImportFieldSelectOptions(itemType);
  }

  selectValueForSource(sourceKey: string): string {
    const t = this.targetItemType();
    if (!t) {
      return '';
    }
    const m = this.keyMap();
    const raw = m[sourceKey] ?? this.baselineFieldMap()[sourceKey];
    return coerceImportMapSelectValue(t, raw);
  }

  onMapChange(sourceKey: string, value: string): void {
    const t = this.targetItemType();
    if (!t) {
      return;
    }
    const coerced = coerceImportMapSelectValue(t, value);
    this.keyMap.update((prev) => ({ ...prev, [sourceKey]: coerced }));
  }

  pickTarget(itemType: string): void {
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    this.targetItemType.set(itemType);
    this.keyMap.set(sanitizeImportKeyMapValues(itemType, buildChangeTypeKeyMap(ctx.decrypted, itemType)));
    this.step.set(2);
  }

  back(): void {
    const s = this.step();
    if (s === 2) {
      this.step.set(1);
      this.targetItemType.set(null);
      this.keyMap.set({});
      return;
    }
    if (s === 3) {
      this.step.set(2);
    }
  }

  nextFromMap(): void {
    const t = this.targetItemType();
    if (!t) {
      return;
    }
    const dups = findDuplicateImportMapTargets(sanitizeImportKeyMapValues(t, this.keyMap()));
    if (dups.length > 0) {
      this.toast.info('Each vault field can only map once (except notes). Adjust the dropdowns.');
      return;
    }
    this.step.set(3);
  }

  close(): void {
    this.dismissed.emit();
  }

  async apply(): Promise<void> {
    const ctx = this.context();
    const t = this.targetItemType();
    if (!ctx || !t) {
      return;
    }
    if (!this.vaultSession.isUnlocked()) {
      this.toast.error('Unlock the vault before saving.');
      return;
    }
    const km = sanitizeImportKeyMapValues(t, this.keyMap());
    if (findDuplicateImportMapTargets(km).length > 0) {
      this.toast.info('Fix field mappings before saving.');
      return;
    }
    const { record, errors } = normalizeImportRow(ctx.decrypted, t, {
      keyMap: km,
      titleFallback: titleFallbackFromDecrypted(ctx.decrypted),
    });
    if (errors.length > 0) {
      this.toast.error(errors[0] ?? 'Could not build item for this type.');
      return;
    }
    this.saving.set(true);
    try {
      const payload = await encryptImportRow(this.crypto, record, t);
      const swRaw = ctx.searchableWords;
      const searchable = swRaw === null || swRaw === undefined ? '' : String(swRaw).trim();
      const body = searchable !== '' ? { ...payload, searchable_words: searchable } : payload;
      this.vault.updateItem(ctx.itemId, body).subscribe({
        next: () => {
          this.toast.success('Type updated');
          this.saving.set(false);
          this.completed.emit();
        },
        error: (err: { error?: { error?: string } }) => {
          this.saving.set(false);
          this.toast.error(err?.error?.error ?? 'Save failed');
        },
      });
    } catch (e: unknown) {
      this.saving.set(false);
      this.toast.error(e instanceof Error ? e.message : 'Encryption failed');
    }
  }
}
