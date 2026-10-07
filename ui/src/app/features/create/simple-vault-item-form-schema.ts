import type { CredentialFieldConfig } from './credential-form-schema';
import type { SimpleVaultItemKind } from '../vault/vault-item-display';

export interface SimpleVaultItemFormSchema {
  kind: SimpleVaultItemKind;
  /** Value stored as API `item_type`. */
  itemType: SimpleVaultItemKind;
  title: string;
  fields: CredentialFieldConfig[];
}

const SIMPLE_VAULT_ITEM_SCHEMAS: Record<SimpleVaultItemKind, SimpleVaultItemFormSchema> = {
  id: {
    kind: 'id',
    itemType: 'id',
    title: 'ID record',
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. US passport, Employee badge',
        autocomplete: 'off',
      },
      {
        key: 'id_kind',
        label: 'ID type',
        type: 'text',
        placeholder: 'Passport, national ID, employee number…',
        autocomplete: 'off',
      },
      {
        key: 'identifier',
        label: 'Number / reference',
        type: 'text',
        placeholder: 'Document or card number',
        autocomplete: 'off',
      },
      {
        key: 'issuer',
        label: 'Issuer',
        type: 'text',
        placeholder: 'Country, company, authority',
        autocomplete: 'off',
      },
      { key: 'expires', label: 'Expiry date', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Expiry, where stored, related contacts…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  password: {
    kind: 'password',
    itemType: 'password',
    title: 'Password',
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'What this unlocks',
        autocomplete: 'off',
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Secret',
        autocomplete: 'new-password',
      },
      { key: 'url', label: 'Related URL', type: 'url', placeholder: 'Login or service page', autocomplete: 'off' },
      { key: 'username', label: 'Username / login', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Optional, rotation hints, where it is used',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  key: {
    kind: 'key',
    itemType: 'key',
    title: 'Key material',
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. TLS cert, signing key, wallet seed',
        autocomplete: 'off',
      },
      {
        key: 'format',
        label: 'Format',
        type: 'text',
        placeholder: 'PEM, hex, BIP39, JSON JWK…',
        autocomplete: 'off',
      },
      {
        key: 'public_key',
        label: 'Public key / certificate',
        type: 'textarea',
        placeholder: 'Optional, for reference',
        autocomplete: 'off',
        fullWidth: true,
        rows: 4,
      },
      {
        key: 'fingerprint',
        label: 'Fingerprint / thumbprint',
        type: 'text',
        placeholder: 'Optional',
        autocomplete: 'off',
      },
      {
        key: 'material',
        label: 'Key / seed / PEM',
        type: 'textarea',
        required: true,
        placeholder: 'Paste key text or seed phrase',
        autocomplete: 'off',
        fullWidth: true,
      },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Fingerprint, rotation, hardware where it lives',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  secure_note: {
    kind: 'secure_note',
    itemType: 'secure_note',
    title: 'Secure note',
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Short label for your list',
        autocomplete: 'off',
      },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'tags',
        label: 'Tags',
        type: 'text',
        placeholder: 'Optional comma-separated tags',
        autocomplete: 'off',
      },
      {
        key: 'body',
        label: 'Content',
        type: 'textarea',
        required: true,
        placeholder: 'Write anything sensitive, encrypted before upload',
        autocomplete: 'off',
        fullWidth: true,
        rows: 20,
      },
    ],
  },
  file: {
    kind: 'file',
    itemType: 'file',
    title: 'File vault',
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. Tax PDFs, contract bundle',
        autocomplete: 'off',
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Optional context; attachments are added after this item is in your vault',
        autocomplete: 'off',
        fullWidth: true,
        rows: 6,
      },
    ],
  },
};

export function getSimpleVaultItemFormSchema(kind: SimpleVaultItemKind): SimpleVaultItemFormSchema {
  return SIMPLE_VAULT_ITEM_SCHEMAS[kind];
}
