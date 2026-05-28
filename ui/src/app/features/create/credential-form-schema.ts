import type { CredentialSubtype } from './credential.types';

/**
 * Supported form field input types. Extend as needed for new credential types.
 */
export type CredentialFieldType = 'text' | 'password' | 'url' | 'textarea';

/**
 * Definition for a single form field. Used to drive the generic credential form.
 */
export interface CredentialFieldConfig {
  key: string;
  label: string;
  type: CredentialFieldType;
  required?: boolean;
  placeholder?: string;
  autocomplete?: string;
  /** In a multi-column form, use a full-width row (e.g. notes textarea). */
  fullWidth?: boolean;
  /** Textarea visible height; defaults to 5 in form templates when omitted. */
  rows?: number;
}

/** One visual row: one or two `.control-split` fields (pair when not fullWidth). */
export interface CredentialFieldRow {
  fields: CredentialFieldConfig[];
}

/**
 * Schema for a credential subtype form: title and ordered list of fields.
 */
export interface CredentialFormSchema {
  subtype: CredentialSubtype;
  title: string;
  fields: CredentialFieldConfig[];
}

/** Form schemas per credential subtype. Add one entry per subtype to enable its form. */
const CREDENTIAL_FORM_SCHEMAS: Record<CredentialSubtype, CredentialFormSchema | null> = {
  website: {
    subtype: 'website',
    title: 'Website credential',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. My Bank', autocomplete: 'off' },
      { key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://...', autocomplete: 'off' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Email or username', autocomplete: 'off' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional, comma-separated', autocomplete: 'off' },
      { key: 'category', label: 'Category / folder', type: 'text', placeholder: 'e.g. Work, Personal', autocomplete: 'off' },
      {
        key: 'alternative_url',
        label: 'Alternate sign-in URL',
        type: 'url',
        placeholder: 'SSO, alternate login, or second site',
        autocomplete: 'off',
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Optional notes',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  generic: {
    subtype: 'generic',
    title: 'Generic secret',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Wi-Fi backup code', autocomplete: 'off' },
      {
        key: 'host',
        label: 'Host / server',
        type: 'text',
        placeholder: 'e.g. ftp.example.com (optional)',
        autocomplete: 'off',
      },
      { key: 'username', label: 'Username / ID', type: 'text', placeholder: 'Optional identifier', autocomplete: 'off' },
      { key: 'password', label: 'Secret / password', type: 'password', placeholder: 'Optional secret', autocomplete: 'new-password' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      { key: 'category', label: 'Category / folder', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'external_reference',
        label: 'External / record ID',
        type: 'text',
        placeholder: 'Importer or upstream system id',
        autocomplete: 'off',
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Anything else, pins, hints, where it is used…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  'api-key': {
    subtype: 'api-key',
    title: 'API key',
    fields: [
      {
        key: 'service',
        label: 'Service',
        type: 'text',
        required: true,
        placeholder: 'e.g. Stripe, OpenAI, GitHub',
        autocomplete: 'off',
      },
      {
        key: 'api_base_url',
        label: 'Endpoint / API URL',
        type: 'url',
        placeholder: 'https://api.example.com or token endpoint',
        autocomplete: 'off',
      },
      {
        key: 'version',
        label: 'API / SDK version',
        type: 'text',
        placeholder: 'e.g. v2, 2024-11-20',
        autocomplete: 'off',
      },
      {
        key: 'oauth_client_id',
        label: 'App / client ID',
        type: 'text',
        placeholder: 'OAuth client id, app id, consumer key…',
        autocomplete: 'off',
      },
      {
        key: 'key',
        label: 'Key / access token',
        type: 'password',
        placeholder: 'API key, access token, publishable key…',
        autocomplete: 'off',
      },
      {
        key: 'client_secret',
        label: 'Client secret',
        type: 'password',
        placeholder: 'OAuth client secret, shared secret…',
        autocomplete: 'new-password',
      },
      {
        key: 'key_label',
        label: 'Key label',
        type: 'text',
        placeholder: 'e.g. Production, CI, Personal project',
        autocomplete: 'off',
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'text',
        placeholder: 'e.g. Production, staging, test',
        autocomplete: 'off',
      },
      {
        key: 'scopes',
        label: 'Scopes / purpose',
        type: 'textarea',
        placeholder: 'Scopes, rotation, or usage notes',
        autocomplete: 'off',
        fullWidth: true,
        rows: 3,
      },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Scopes, expiry, rotation reminders…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  app: {
    subtype: 'app',
    title: 'App credential',
    fields: [
      { key: 'name', label: 'App name', type: 'text', required: true, placeholder: 'e.g. Slack, 1Password', autocomplete: 'off' },
      {
        key: 'platform',
        label: 'Platform',
        type: 'text',
        placeholder: 'iOS, Android, Windows, macOS, Linux…',
        autocomplete: 'off',
      },
      { key: 'username', label: 'Username / email', type: 'text', placeholder: 'Account or device user', autocomplete: 'off' },
      { key: 'password', label: 'Password / PIN', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
      { key: 'bundle_id', label: 'Bundle / package ID', type: 'text', placeholder: 'e.g. com.example.app', autocomplete: 'off' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Workspace, org, or install notes',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  database: {
    subtype: 'database',
    title: 'Database connection',
    fields: [
      {
        key: 'name',
        label: 'Connection name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Prod Postgres',
        autocomplete: 'off',
      },
      { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'db.example.com or 10.0.0.5', autocomplete: 'off' },
      { key: 'port', label: 'Port', type: 'text', placeholder: '5432, 3306, 1433…', autocomplete: 'off' },
      {
        key: 'database',
        label: 'Database name',
        type: 'text',
        placeholder: 'Schema / DB / SID',
        autocomplete: 'off',
      },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'DB user', autocomplete: 'off' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
      {
        key: 'connection_string',
        label: 'Connection string',
        type: 'textarea',
        placeholder: 'Full URI or JDBC-style string (optional)',
        autocomplete: 'off',
        fullWidth: true,
        rows: 3,
      },
      { key: 'ssl_mode', label: 'SSL / TLS mode', type: 'text', placeholder: 'e.g. require, verify-full', autocomplete: 'off' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'SSL mode, replica, connection string hints…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  ssh: {
    subtype: 'ssh',
    title: 'SSH access',
    fields: [
      {
        key: 'name',
        label: 'Connection name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Prod bastion, GitHub Codespaces',
        autocomplete: 'off',
      },
      { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'hostname or IP', autocomplete: 'off' },
      { key: 'port', label: 'Port', type: 'text', placeholder: '22', autocomplete: 'off' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'SSH user', autocomplete: 'off' },
      {
        key: 'private_key',
        label: 'Private key',
        type: 'textarea',
        placeholder: '-----BEGIN OPENSSH PRIVATE KEY----- … (optional if you use agent forwarding)',
        autocomplete: 'off',
        fullWidth: true,
      },
      {
        key: 'passphrase',
        label: 'Key passphrase',
        type: 'password',
        placeholder: 'If the key is encrypted',
        autocomplete: 'new-password',
      },
      { key: 'jump_host', label: 'Jump host / bastion', type: 'text', placeholder: 'Optional bastion hostname', autocomplete: 'off' },
      {
        key: 'key_fingerprint',
        label: 'Host / key fingerprint',
        type: 'text',
        placeholder: 'Optional SSH fingerprint',
        autocomplete: 'off',
      },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Jump host, fingerprint, rotation…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  email: {
    subtype: 'email',
    title: 'Email account',
    fields: [
      {
        key: 'name',
        label: 'Label',
        type: 'text',
        required: true,
        placeholder: 'e.g. Work Gmail, iCloud personal',
        autocomplete: 'off',
      },
      {
        key: 'email_address',
        label: 'Email address',
        type: 'text',
        required: true,
        placeholder: 'you@example.com',
        autocomplete: 'off',
      },
      {
        key: 'provider',
        label: 'Provider',
        type: 'text',
        placeholder: 'Google, Microsoft 365, Fastmail…',
        autocomplete: 'off',
      },
      { key: 'imap_host', label: 'IMAP server', type: 'text', placeholder: 'imap.example.com', autocomplete: 'off' },
      { key: 'smtp_host', label: 'SMTP server', type: 'text', placeholder: 'smtp.example.com', autocomplete: 'off' },
      {
        key: 'password',
        label: 'Password / app password',
        type: 'password',
        placeholder: 'Mailbox or app-specific password',
        autocomplete: 'new-password',
      },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'IMAP/SMTP hostnames, 2FA backup location…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
  license: {
    subtype: 'license',
    title: 'Software license',
    fields: [
      {
        key: 'product',
        label: 'Product',
        type: 'text',
        required: true,
        placeholder: 'e.g. JetBrains, Adobe CC, Windows',
        autocomplete: 'off',
      },
      {
        key: 'vendor',
        label: 'Vendor',
        type: 'text',
        placeholder: 'Publisher or store',
        autocomplete: 'off',
      },
      {
        key: 'license_key',
        label: 'License key / text',
        type: 'textarea',
        required: true,
        placeholder: 'Paste activation key or entitlement text',
        autocomplete: 'off',
        fullWidth: true,
      },
      { key: 'assigned_to', label: 'Assigned to', type: 'text', placeholder: 'User or team', autocomplete: 'off' },
      { key: 'expires', label: 'Expiry / renewal', type: 'text', placeholder: 'Date or window', autocomplete: 'off' },
      { key: 'tags', label: 'Tags', type: 'text', placeholder: 'Optional', autocomplete: 'off' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Seats, renewal date, purchase email…',
        autocomplete: 'off',
        fullWidth: true,
      },
    ],
  },
};

/**
 * Returns the form schema for a credential subtype, or null if no form is defined.
 */
export function getCredentialFormSchema(subtype: CredentialSubtype): CredentialFormSchema | null {
  return CREDENTIAL_FORM_SCHEMAS[subtype] ?? null;
}

/**
 * Returns the path to the credential form for a subtype (e.g. /new/credentials/website).
 */
export function getCredentialFormPath(subtype: CredentialSubtype): string {
  return `/new/credentials/${subtype}`;
}
