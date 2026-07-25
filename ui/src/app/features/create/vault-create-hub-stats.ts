import type { CredentialSubtype } from './credential.types';
import { CREDENTIAL_TYPE_OPTIONS } from './credential.types';
import type { CreateableItemType } from './create.types';

export interface CreateHubCategoryCounts {
  readonly credentials: number;
  readonly password: number;
  readonly key: number;
  readonly id: number;
  readonly secureNote: number;
  readonly file: number;
}

const ZERO_HUB: CreateHubCategoryCounts = {
  credentials: 0,
  password: 0,
  key: 0,
  id: 0,
  secureNote: 0,
  file: 0,
};

/** Counts vault items by top-level create-hub category (from `item_type` metadata only). */
export function buildCreateHubCategoryCounts(items: readonly { item_type: string }[]): CreateHubCategoryCounts {
  let credentials = 0;
  let password = 0;
  let key = 0;
  let id = 0;
  let secureNote = 0;
  let file = 0;
  for (const row of items) {
    const t = String(row.item_type ?? '').trim();
    if (t === 'credential' || t.startsWith('credential:')) {
      credentials++;
    } else if (t === 'password') {
      password++;
    } else if (t === 'key') {
      key++;
    } else if (t === 'id') {
      id++;
    } else if (t === 'secure_note') {
      secureNote++;
    } else if (t === 'file') {
      file++;
    }
  }
  return { credentials, password, key, id, secureNote, file };
}

const SUBTYPE_IDS = CREDENTIAL_TYPE_OPTIONS.map((o) => o.id) as readonly CredentialSubtype[];

function emptyCredentialSubtypeRecord(): Record<CredentialSubtype, number> {
  const o = {} as Record<CredentialSubtype, number>;
  for (const id of SUBTYPE_IDS) {
    o[id] = 0;
  }
  return o;
}

/**
 * Counts `credential` and `credential:*` rows by subtype. Bare `credential` is counted as website (legacy default).
 * Unknown `credential:x` rolls into generic.
 */
export function buildCredentialSubtypeCounts(items: readonly { item_type: string }[]): Readonly<Record<CredentialSubtype, number>> {
  const out = emptyCredentialSubtypeRecord();
  for (const row of items) {
    const t = String(row.item_type ?? '').trim();
    if (t === 'credential') {
      out['website']++;
      continue;
    }
    if (!t.startsWith('credential:')) {
      continue;
    }
    const sub = t.slice('credential:'.length);
    if ((SUBTYPE_IDS as readonly string[]).includes(sub)) {
      out[sub as CredentialSubtype]++;
    } else {
      out['generic']++;
    }
  }
  return out;
}

export function countForCreateHubOption(id: CreateableItemType, counts: CreateHubCategoryCounts): number {
  switch (id) {
    case 'credentials':
      return counts.credentials;
    case 'password':
      return counts.password;
    case 'key':
      return counts.key;
    case 'id':
      return counts.id;
    case 'secure-note':
      return counts.secureNote;
    case 'file':
      return counts.file;
    default:
      return 0;
  }
}

export const createHubCategoryCountsZero: CreateHubCategoryCounts = ZERO_HUB;
