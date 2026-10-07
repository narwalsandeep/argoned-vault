/**
 * Local heuristic classification for JSON import (Solution A).
 * Uses key names and shallow shapes only; no network.
 */

export type ImportConfidence = 'high' | 'medium' | 'low';

/** API `item_type` values offered in the per-row import override dropdown. */
export type ImportRowVaultTypeOption =
  | 'id'
  | 'password'
  | 'key'
  | 'secure_note'
  | 'credential'
  | 'credential:website'
  | 'credential:generic'
  | 'credential:ssh'
  | 'credential:email'
  | 'credential:api-key'
  | 'credential:database'
  | 'credential:app'
  | 'credential:license';

export interface ImportClassification {
  suggestedItemType: string;
  confidence: ImportConfidence;
  /** Non-secret tokens only (e.g. matched keys). */
  reasons: string[];
}

function keySet(value: unknown): Set<string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return new Set();
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => k !== '__importKey');
  if (keys.length === 2 && keys.includes('__importKey') && keys.includes('value')) {
    return keySet(o['value']);
  }
  return new Set(keys.map((k) => k.toLowerCase()));
}

/** Same nested buckets as {@link mergeNestedImportObjects} in import-normalize (one level). */
const NEST_KEYS_FOR_CLASSIFY = [
  'access',
  'credentials',
  'sftp',
  'certificate',
  'api',
  'secure_blob',
  'db_details',
  'postgres',
  'oracle_conn',
  'rabbitmq',
  'gitlab',
  'mysql',
  'redis',
  'mongodb',
  'sqlserver',
  'oracle',
  'npm',
  'docker',
  'twilio',
  'stripe',
  'sendgrid',
  'vpn',
  'wifi',
  'ftp',
  'mailer',
  'mixed_entry',
  'database',
  'cloud',
] as const;

/** Top-level keys plus keys from one level of common nested exporter objects. */
function keySetDeep(raw: unknown): Set<string> {
  const base = keySet(raw);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;
  if (Object.keys(o).length === 2 && '__importKey' in o && 'value' in o) {
    return keySetDeep(o['value']);
  }
  const merged = new Set(base);
  for (const nk of NEST_KEYS_FOR_CLASSIFY) {
    if (!Object.prototype.hasOwnProperty.call(o, nk)) {
      continue;
    }
    const v = o[nk];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        merged.add(k.toLowerCase());
      }
    }
  }
  return merged;
}

function hasAny(keys: Set<string>, names: string[]): boolean {
  return names.some((n) => keys.has(n.toLowerCase()));
}

function pemLike(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /BEGIN [A-Z0-9 ]+KEY|BEGIN CERTIFICATE/.test(value);
}

/**
 * Classify one extracted import row into an API `item_type` string (heuristics only).
 */
export function classifyImportRow(raw: unknown): ImportClassification {
  const keys = keySetDeep(raw);
  const reasons: string[] = [];

  const add = (token: string): void => {
    reasons.push(token);
  };

  if (typeof raw === 'string' && raw.length > 200) {
    add('long string');
    return { suggestedItemType: 'secure_note', confidence: 'low', reasons };
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    add('scalar');
    return { suggestedItemType: 'secure_note', confidence: 'low', reasons };
  }

  if (Array.isArray(raw)) {
    add('array root');
    return { suggestedItemType: 'secure_note', confidence: 'low', reasons };
  }

  if (raw !== null && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const val = o['value'];
    if (Object.keys(o).length === 2 && '__importKey' in o && 'value' in o) {
      return classifyImportRow(val);
    }

    for (const [, v] of Object.entries(o)) {
      if (typeof v === 'string' && pemLike(v)) {
        add('pem-like');
        return { suggestedItemType: 'key', confidence: 'high', reasons };
      }
    }

    const urlish = hasAny(keys, ['url', 'uri', 'href', 'login_url', 'website']);
    const userish = hasAny(keys, ['username', 'user', 'login', 'email', 'account']);
    const passish = hasAny(keys, [
      'password',
      'pass',
      'secret',
      'passwd',
      'credential',
      'pwd',
      'passcode',
      'secret_key',
      'auth_token',
    ]);
    /** Stronger secret / token key names (flat importers, task.md-style rows). */
    const secretish = hasAny(keys, [
      'password',
      'pass',
      'passwd',
      'pwd',
      'passcode',
      'secret',
      'secret_key',
      'auth_token',
    ]);
    const loginish = hasAny(keys, ['username', 'user', 'login', 'email', 'mail', 'mailbox', 'email_address']);
    const apiContext = hasAny(keys, [
      'api_key',
      'apikey',
      'app_key',
      'bearer',
      'oauth_client_id',
      'oauth_client_secret',
      'access_token',
      'token',
      'client_secret',
      'app_secret',
    ]);
    if (urlish) {
      add('url*');
    }
    if (userish) {
      add('user*');
    }
    if (passish) {
      add('pass*');
    }
    if (urlish && (passish || userish)) {
      return { suggestedItemType: 'credential:website', confidence: 'high', reasons };
    }

    /** Cloud / IAM-style access + secret pair (no URL). */
    if (
      (hasAny(keys, ['cloud_access_key', 'aws_access_key_id']) && hasAny(keys, ['cloud_secret_key', 'aws_secret_access_key'])) ||
      (keys.has('cloud_access_key') && keys.has('cloud_secret_key'))
    ) {
      add('cloud-key-pair');
      return { suggestedItemType: 'credential:api-key', confidence: 'high', reasons };
    }

    /** API identifier + shared secret without vendor `service` field (common exporter rows). */
    if (
      hasAny(keys, ['api_key', 'apikey', 'app_key']) &&
      hasAny(keys, ['secret', 'secret_key', 'client_secret', 'app_secret', 'access_token'])
    ) {
      add('api-secret-pair');
      return { suggestedItemType: 'credential:api-key', confidence: 'high', reasons };
    }

    if (
      hasAny(keys, [
        'db_host',
        'db_user',
        'db_name',
        'dbname',
        'mongodb_uri',
        'connection_string',
        'postgres',
        'oracle_conn',
        'db_details',
        'sqlserver',
        'redis',
      ]) ||
      (hasAny(keys, ['host', 'server', 'hostname', 'port']) &&
        hasAny(keys, ['database', 'dbname', 'db_name', 'schema', 'service_name', 'instance', 'mongodb_uri', 'connection_string']))
    ) {
      add('database-ish');
      return { suggestedItemType: 'credential:database', confidence: 'high', reasons };
    }

    if (
      hasAny(keys, ['license_key', 'activation_key', 'serial', 'entitlement']) &&
      (hasAny(keys, ['product', 'vendor', 'software', 'assigned_to']) || keys.size <= 8)
    ) {
      add('license-ish');
      return { suggestedItemType: 'credential:license', confidence: 'high', reasons };
    }

    if (hasAny(keys, ['smtp_host', 'imap_host', 'from_email', 'mailer_user', 'mailbox']) && !urlish) {
      add('email-ish');
      return { suggestedItemType: 'credential:email', confidence: 'medium', reasons };
    }

    /** Mailbox + bearer / password / token (OAuth app passwords, API mail). */
    if (
      loginish &&
      hasAny(keys, ['email', 'mail', 'mailbox', 'email_address']) &&
      (secretish || hasAny(keys, ['token', 'oauth', 'refresh_token', 'client_secret', 'auth_token']))
    ) {
      add('email-token');
      return { suggestedItemType: 'credential:email', confidence: 'high', reasons };
    }

    if (
      hasAny(keys, ['host', 'hostname', 'server', 'port', 'login_username', 'private_key', 'private_key_ref', 'ssh_key']) &&
      (passish ||
        hasAny(keys, ['privatekey', 'identityfile', 'private_key', 'pem', 'passphrase', 'ssh_key', 'private_key_ref', 'key']))
    ) {
      add('ssh-ish');
      return { suggestedItemType: 'credential:ssh', confidence: 'medium', reasons };
    }

    if (
      (hasAny(keys, [
        'service',
        'provider',
        'stripe',
        'twilio',
        'sendgrid',
        'registry',
        'gitlab',
        'github',
        'slack',
        'npm',
        'docker',
        'payments-api',
        'internal-sso',
      ]) &&
        hasAny(keys, [
          'secret',
          'api_key',
          'apikey',
          'token',
          'app_secret',
          'client_secret',
          'oauth_client_secret',
          'github_token',
          'key',
        ])) ||
      hasAny(keys, [
        'apikey',
        'api_key',
        'token',
        'bearer',
        'client_secret',
        'access_token',
        'app_secret',
        'secret_value',
        'webhook_secret',
        'github_token',
        'personal_access_token',
        'npm_token',
        'slack_bot_token',
        'twilio_auth_token',
        'stripe_key',
        'sendgrid_api_key',
      ]) ||
      (hasAny(keys, ['app_key', 'oauth_client_id']) &&
        hasAny(keys, ['service', 'provider', 'stripe', 'twilio', 'sendgrid', 'registry', 'gitlab', 'github', 'slack', 'npm', 'docker']))
    ) {
      add('api-ish');
      return { suggestedItemType: 'credential:api-key', confidence: 'medium', reasons };
    }

    const sshContext = hasAny(keys, [
      'host',
      'hostname',
      'server',
      'port',
      'private_key',
      'private_key_ref',
      'ssh_key',
      'privatekey',
      'identityfile',
      'jump_host',
      'key_fingerprint',
      'login_username',
    ]);

    /**
     * Saved login (password vault item): secret + login id, no site URL, not API/SSH-shaped.
     * Covers id/key/password/username and name/passcode/secret_key style rows (see task.md fixtures).
     */
    if (secretish && loginish && !urlish && !apiContext && !sshContext && keys.size <= 8) {
      add('password-login');
      return { suggestedItemType: 'password', confidence: 'high', reasons };
    }

    if (hasAny(keys, ['bundle_id', 'application_id']) || (hasAny(keys, ['app_key']) && hasAny(keys, ['platform', 'os', 'workspace', 'app_name']))) {
      add('app-ish');
      return { suggestedItemType: 'credential:app', confidence: 'medium', reasons };
    }

    if (passish && userish) {
      return { suggestedItemType: 'credential:generic', confidence: 'medium', reasons };
    }

    /** Title + secret, small row — generic password-style blob (medium if we missed high path). */
    if (passish && hasAny(keys, ['title', 'name', 'handle', 'label', 'account_id', 'credential_key']) && keys.size <= 6) {
      add('password-entry');
      return { suggestedItemType: 'password', confidence: 'medium', reasons };
    }

    if (hasAny(keys, ['issuer', 'documentnumber', 'document_number', 'passport', 'license', 'id_number'])) {
      add('id-doc');
      return { suggestedItemType: 'id', confidence: 'medium', reasons };
    }

    if (
      hasAny(keys, ['private_note']) ||
      (keys.has('secure_note') && typeof o['secure_note'] === 'string') ||
      (hasAny(keys, ['body', 'content', 'text', 'markdown', 'note']) && !passish)
    ) {
      add('note-body');
      return { suggestedItemType: 'secure_note', confidence: 'medium', reasons };
    }

    if (hasAny(keys, ['encryption_key', 'kms_key', 'ciphertext', 'secure_blob', 'json_key_ref'])) {
      add('crypto-material');
      return { suggestedItemType: 'key', confidence: 'medium', reasons };
    }

    if (hasAny(keys, ['material', 'privatekey', 'private_key', 'pem', 'seed', 'mnemonic'])) {
      add('key-material');
      return { suggestedItemType: 'key', confidence: 'high', reasons };
    }
  }

  return { suggestedItemType: 'credential:generic', confidence: 'low', reasons: ['fallback'] };
}

/** Labels for per-row vault type override (value = API item_type). */
export const IMPORT_CATEGORY_OPTIONS: { value: ImportRowVaultTypeOption; label: string }[] = [
  { value: 'credential:website', label: 'Credential — website' },
  { value: 'credential:generic', label: 'Credential — generic' },
  { value: 'credential:ssh', label: 'Credential — SSH' },
  { value: 'credential:email', label: 'Credential — email' },
  { value: 'credential:api-key', label: 'Credential — API key' },
  { value: 'credential:database', label: 'Credential — database' },
  { value: 'credential:app', label: 'Credential — app' },
  { value: 'credential:license', label: 'Credential — license' },
  { value: 'credential', label: 'Credential (unspecified)' },
  { value: 'password', label: 'Password' },
  { value: 'key', label: 'Key material' },
  { value: 'id', label: 'ID' },
  { value: 'secure_note', label: 'Secure note' },
];
