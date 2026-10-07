import type { CredentialSubtype } from '../create/credential.types';
import { CREDENTIAL_TYPE_OPTIONS } from '../create/credential.types';

const SUBTYPES = new Set<string>([
  'website',
  'generic',
  'api-key',
  'app',
  'database',
  'ssh',
  'email',
  'license',
]);

/** Parse `credential:website` from API `item_type`; legacy items use plain `credential`. */
export function credentialSubtypeFromItemType(itemType: string): CredentialSubtype | null {
  if (itemType.startsWith('credential:')) {
    const rest = itemType.slice('credential:'.length);
    if (SUBTYPES.has(rest)) {
      return rest as CredentialSubtype;
    }
  }
  return null;
}

export function credentialCategoryLabel(itemType: string, subtype: CredentialSubtype | null): string {
  if (subtype !== null) {
    const opt = CREDENTIAL_TYPE_OPTIONS.find((o) => o.id === subtype);
    return opt?.label ?? subtype;
  }
  if (itemType === 'credential') {
    return 'Credential';
  }
  return itemType;
}

/** Icon bubble: background + icon color (Tailwind classes from @theme). */
export function credentialCategoryBubbleClasses(subtype: CredentialSubtype | null): { box: string; icon: string } {
  if (subtype === null) {
    return {
      box: 'bg-app-elevated/80 text-app-text-muted',
      icon: 'text-app-text-muted',
    };
  }
  const map: Record<CredentialSubtype, { box: string; icon: string }> = {
    website: { box: 'bg-app-credential-website/15', icon: 'text-app-credential-website' },
    app: { box: 'bg-app-credential-app/15', icon: 'text-app-credential-app' },
    database: { box: 'bg-app-credential-database/15', icon: 'text-app-credential-database' },
    'api-key': { box: 'bg-app-credential-api-key/15', icon: 'text-app-credential-api-key' },
    ssh: { box: 'bg-app-credential-ssh/15', icon: 'text-app-credential-ssh' },
    generic: { box: 'bg-app-credential-generic/20', icon: 'text-app-credential-generic' },
    email: { box: 'bg-app-credential-email/15', icon: 'text-app-credential-email' },
    license: { box: 'bg-app-credential-license/15', icon: 'text-app-credential-license' },
  };
  return map[subtype];
}

/** Create-flow icon color only (icons sit on neutral tiles). */
export function credentialSubtypeIconClass(subtype: CredentialSubtype): string {
  return credentialCategoryBubbleClasses(subtype).icon;
}
