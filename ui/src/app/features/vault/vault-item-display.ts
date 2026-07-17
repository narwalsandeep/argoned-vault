import type { CredentialSubtype } from '../create/credential.types';
import {
  credentialCategoryBubbleClasses,
  credentialCategoryLabel,
  credentialSubtypeFromItemType,
} from './vault-credential-category';

/** Stored as `item_type` on the server (underscore for multi-word). */
export type SimpleVaultItemKind = 'id' | 'password' | 'key' | 'secure_note' | 'file';

const SIMPLE_ITEM_TYPES = new Set<string>(['id', 'password', 'key', 'secure_note', 'file']);

export type VaultItemIconKind = CredentialSubtype | SimpleVaultItemKind | 'legacy';

export function isSimpleVaultItemType(itemType: string): itemType is SimpleVaultItemKind {
  return SIMPLE_ITEM_TYPES.has(itemType);
}

/** Route segment under `/new/item/:kind` (hyphen for `secure-note`). */
export function simpleVaultItemRoutePath(kind: SimpleVaultItemKind): string {
  return kind === 'secure_note' ? 'secure-note' : kind;
}

export function simpleVaultItemTypeFromRouteParam(param: string | undefined): SimpleVaultItemKind | null {
  if (param === undefined || param === '') {
    return null;
  }
  switch (param) {
    case 'id':
      return 'id';
    case 'password':
      return 'password';
    case 'key':
      return 'key';
    case 'secure-note':
      return 'secure_note';
    case 'file':
      return 'file';
    default:
      return null;
  }
}

export function vaultItemIconKindFromItemType(itemType: string): VaultItemIconKind {
  const cred = credentialSubtypeFromItemType(itemType);
  if (cred !== null) {
    return cred;
  }
  if (isSimpleVaultItemType(itemType)) {
    return itemType;
  }
  return 'legacy';
}

export function vaultItemListLabel(itemType: string): string {
  const credSub = credentialSubtypeFromItemType(itemType);
  if (credSub !== null) {
    return credentialCategoryLabel(itemType, credSub);
  }
  const simpleLabels: Record<SimpleVaultItemKind, string> = {
    id: 'ID',
    password: 'Password',
    key: 'Key',
    secure_note: 'Secure note',
    file: 'File vault',
  };
  if (isSimpleVaultItemType(itemType)) {
    return simpleLabels[itemType];
  }
  if (itemType === 'credential') {
    return 'Credential';
  }
  return itemType;
}

export function vaultItemBubbleClassesForItemType(itemType: string): { box: string; icon: string } {
  const credSub = credentialSubtypeFromItemType(itemType);
  if (credSub !== null) {
    return credentialCategoryBubbleClasses(credSub);
  }
  const map: Record<SimpleVaultItemKind, { box: string; icon: string }> = {
    id: { box: 'bg-app-icon-ids/15', icon: 'text-app-icon-ids' },
    password: { box: 'bg-app-icon-passwords/15', icon: 'text-app-icon-passwords' },
    key: { box: 'bg-app-icon-keys/15', icon: 'text-app-icon-keys' },
    secure_note: { box: 'bg-app-icon-secure/15', icon: 'text-app-icon-secure' },
    file: { box: 'bg-app-icon-files/15', icon: 'text-app-icon-files' },
  };
  if (isSimpleVaultItemType(itemType)) {
    return map[itemType];
  }
  return {
    box: 'bg-app-elevated/80 text-app-text-muted',
    icon: 'text-app-text-muted',
  };
}
