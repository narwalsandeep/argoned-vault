/**
 * Credential subtypes for the vault. Generic options that cover common cases.
 */
export type CredentialSubtype =
  | 'website'
  | 'app'
  | 'database'
  | 'api-key'
  | 'ssh'
  | 'generic'
  | 'email'
  | 'license';

export interface CredentialTypeOption {
  id: CredentialSubtype;
  label: string;
  /** One-line guidance under the title. */
  description: string;
}

export const CREDENTIAL_TYPE_OPTIONS: CredentialTypeOption[] = [
  {
    id: 'website',
    label: 'Website',
    description: 'Browser logins, URL, username, password, and optional notes. Best for SaaS, banking, and portals.',
  },
  {
    id: 'app',
    label: 'App',
    description: 'Desktop or mobile installs, app name, platform, account, password, without a website URL.',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Mailbox sign-in, label, address, provider, app password; separate from a website login card.',
  },
  {
    id: 'database',
    label: 'Database',
    description: 'DB connections, host, port, database name, user, and password (Postgres, MySQL, SQL Server, …).',
  },
  {
    id: 'ssh',
    label: 'SSH',
    description: 'Server access, host, user, port, optional private key and passphrase, plus notes.',
  },
  {
    id: 'api-key',
    label: 'API key',
    description:
      'Service integrations: endpoint, version, app/client id, access key or token, optional client secret, scopes, and notes.',
  },
  {
    id: 'license',
    label: 'Software license',
    description: 'Product keys and entitlement text, vendor, product name, key blob, renewal or seat notes.',
  },
  {
    id: 'generic',
    label: 'Generic',
    description: 'Anything else with a title, optional username/secret/notes (PINs, codes, one-off combos).',
  },
];

const CREDENTIAL_SUBTYPE_IDS = CREDENTIAL_TYPE_OPTIONS.map((o) => o.id) as readonly CredentialSubtype[];

/** Parses `:subtype` route segment under `/new/credentials/:subtype`. */
export function credentialSubtypeFromRouteParam(param: string | null | undefined): CredentialSubtype | null {
  if (param === undefined || param === null || param === '') {
    return null;
  }
  return (CREDENTIAL_SUBTYPE_IDS as readonly string[]).includes(param) ? (param as CredentialSubtype) : null;
}
