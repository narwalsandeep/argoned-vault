import {
  VAULT_FILE_MAX_BYTES,
  VAULT_FILE_MAX_PER_VAULT_ITEM,
  VAULT_FILE_TOTAL_BYTES,
} from '../../core/vault/vault-file-policy';

/**
 * Vault item types the user can create. Extend this list to add new types.
 */
export type CreateableItemType =
  | 'credentials'
  | 'key'
  | 'file'
  | 'password'
  | 'id'
  | 'secure-note';

export interface CreateableItemOption {
  id: CreateableItemType;
  label: string;
  /** Shown under the title so users know what each category is for. */
  description: string;
}

export const CREATABLE_ITEM_OPTIONS: CreateableItemOption[] = [
  {
    id: 'credentials',
    label: 'Credentials',
    description:
      'Next: pick a subtype (website, email, SSH, …). Each template has its own fields; encryption is identical for all of them.',
  },
  {
    id: 'key',
    label: 'Keys',
    description:
      'Paste PEM blocks, hex keys, or seed phrases, structured fields plus notes. For logins or API tokens, use Credentials instead.',
  },
  {
    id: 'file',
    label: 'File vault',
    description:
      `One vault list row with title, notes, and searchable words; add up to ${VAULT_FILE_MAX_PER_VAULT_ITEM} encrypted files per item (${VAULT_FILE_MAX_BYTES / (1024 * 1024)}MB each, ${VAULT_FILE_TOTAL_BYTES / (1024 * 1024 * 1024)}GB total), same encryption model.`,
  },
  {
    id: 'password',
    label: 'Passwords',
    description:
      'Title plus one password field and optional notes, minimal when you do not need a full credential template.',
  },
  {
    id: 'id',
    label: 'IDs',
    description:
      'Government IDs, employee numbers, passport references, not software licenses (those are under Credentials → Software license).',
  },
  {
    id: 'secure-note',
    label: 'Secure notes',
    description:
      'Free-form confidential text, runbooks, recovery instructions, or anything too sensitive for ordinary notes.',
  },
];
