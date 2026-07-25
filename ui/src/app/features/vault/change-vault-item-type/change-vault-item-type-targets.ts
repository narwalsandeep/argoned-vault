import { CREDENTIAL_TYPE_OPTIONS } from '../../create/credential.types';
import type { SimpleVaultItemKind } from '../vault-item-display';
import { vaultItemListLabel } from '../vault-item-display';

/** Inputs for the change-type wizard (opened from vault inline edit). */
export interface ChangeVaultItemTypeWizardContext {
  readonly itemId: string;
  readonly sourceItemType: string;
  readonly decrypted: Record<string, unknown>;
  readonly searchableWords: string | null;
}

export interface ChangeVaultItemTypeTarget {
  readonly itemType: string;
  readonly label: string;
}

const SIMPLE_TARGETS: SimpleVaultItemKind[] = ['password', 'key', 'id', 'secure_note'];

/** Every vault item type the user can switch to (same set as create hub, minus the current item). */
export function listChangeVaultItemTypeTargets(currentItemType: string): ChangeVaultItemTypeTarget[] {
  const cur = currentItemType.trim();
  if (cur === 'file') {
    return [];
  }
  const out: ChangeVaultItemTypeTarget[] = [];
  for (const opt of CREDENTIAL_TYPE_OPTIONS) {
    const itemType = `credential:${opt.id}`;
    if (itemType !== cur) {
      out.push({ itemType, label: opt.label });
    }
  }
  for (const kind of SIMPLE_TARGETS) {
    if (kind !== cur) {
      out.push({ itemType: kind, label: vaultItemListLabel(kind) });
    }
  }
  return out;
}
