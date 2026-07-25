import {
  coerceImportMapSelectValue,
  getImportFieldFallbackTarget,
  getImportFieldTargetOptions,
  IMPORT_KEY_MAP_IGNORE,
} from './import-field-catalog';
import type { ImportPreviewItem } from './import-vault-json';

const MAX_ARRAY_KEYS = 80;

/** Same unwrapping as {@link normalizeImportRow} so keys align with normalization. */
export function unwrapImportRow(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 2 && keys.includes('__importKey') && keys.includes('value')) {
      return o['value'];
    }
  }
  return raw;
}

/** Vault fields that must not receive blank exporter values (redirect blanks to merged `notes`). */
function competitiveVaultTargetsFor(itemType: string): ReadonlySet<string> {
  switch (itemType) {
    case 'password':
      return new Set(['title', 'password', 'url', 'username']);
    case 'credential':
    case 'credential:website':
      return new Set(['name', 'url', 'username', 'password', 'alternative_url']);
    default:
      return new Set();
  }
}

function isEffectivelyEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return false;
}

/** `notes` may receive many source keys; it never blocks other assignments. */
function isVaultTargetConsumable(target: string): boolean {
  return target !== 'notes';
}

function isTargetTaken(used: ReadonlySet<string>, target: string): boolean {
  if (!isVaultTargetConsumable(target)) {
    return false;
  }
  return used.has(target);
}

/** 1Password-style login rows: assign secrets and URLs before metadata columns. */
const LOGIN_STYLE_PRIORITY: readonly (readonly string[])[] = [
  ['password', 'pass', 'passwd', 'secret', 'pwd'],
  ['username', 'user', 'login', 'email', 'mail'],
  ['otpauth', 'totp', 'otp', 'otp_uri', 'authenticator', 'mfa', '2fa'],
  ['url', 'uri', 'href', 'website', 'login_url', 'login_uri', 'link'],
  ['name', 'title', 'label'],
  ['tags', 'tag', 'labels'],
  ['category', 'folder', 'group'],
  ['alternative_url', 'alt_url', 'secondary_url', 'mobile_url', 'app_url'],
  ['notes', 'note'],
];

function usesLoginStylePriorityOrdering(itemType: string): boolean {
  return itemType === 'password' || itemType === 'credential' || itemType === 'credential:website';
}

function loginStylePriorityTier(sourceKey: string): number {
  const s = sourceKey.toLowerCase();
  for (let i = 0; i < LOGIN_STYLE_PRIORITY.length; i++) {
    if (LOGIN_STYLE_PRIORITY[i].includes(s)) {
      return i;
    }
  }
  return 500;
}

function compareImportSourceKeysByPriority(a: string, b: string, itemType: string): number {
  if (!usesLoginStylePriorityOrdering(itemType)) {
    return a.localeCompare(b);
  }
  const da = loginStylePriorityTier(a);
  const db = loginStylePriorityTier(b);
  if (da !== db) {
    return da - db;
  }
  return a.localeCompare(b);
}

function scalarForImportMerge(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Source JSON keys the user can map (sorted for objects; `[i]` for arrays; `value` for scalars).
 */
export function extractImportSourceKeys(raw: unknown): string[] {
  const inner = unwrapImportRow(raw);
  if (inner !== null && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>;
    return Object.keys(o)
      .filter((k) => k !== '__importKey')
      .sort((a, b) => a.localeCompare(b));
  }
  if (Array.isArray(inner)) {
    const cap = Math.min(inner.length, MAX_ARRAY_KEYS);
    return Array.from({ length: cap }, (_, i) => `[${i}]`);
  }
  return ['value'];
}

export function importMappingGroupId(raw: unknown, itemType: string): string {
  const keys = extractImportSourceKeys(raw);
  return `${keys.join('\u0001')}::${itemType}`;
}

export interface ImportMappingGroup {
  id: string;
  itemType: string;
  sourceKeys: string[];
  rowCount: number;
}

/**
 * Canonical vault field → exporter / vendor key names (lowercase exact match on source key).
 * Also used with {@link sourceKeyMatchesTarget} for alias equality.
 */
const TARGET_SOURCE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  title: [
    'title',
    'name',
    'label',
    'subject',
    'vpn_name',
    'wifi_ssid',
    'product',
    'display_name',
    'handle',
    'sms-gateway',
    'repo',
    'workspace',
    'cluster',
    'purpose',
    'usage',
    'mode',
    'private_note',
  ],
  name: [
    'name',
    'title',
    'label',
    'subject',
    'vpn_name',
    'wifi_ssid',
    'display_name',
    'handle',
    'service',
    'product',
    'vpn',
    'wifi',
    'docker',
    'gitlab',
    'github',
    'slack',
    'stripe',
    'twilio',
    'sendgrid',
    'npm',
    'rabbitmq',
    'redis',
    'mysql',
    'postgres',
    'mongo',
    'oracle',
    'sqlserver',
    'sftp',
    'ftp',
    'smtp',
    'mailer',
    'vpn',
    'wifi',
    'webhook',
    'license',
    'mixed_entry',
  ],
  url: [
    'url',
    'uri',
    'href',
    'website',
    'login_url',
    'login_uri',
    'link',
    'site',
    'endpoint',
    'connection',
    'connection_string',
    'base_url',
    'mongodb_uri',
    'mongo_uri',
    'registry',
    'docker_registry',
    'webhook_url',
    'ftp_host',
    'smtp_host',
    'sftp_host',
    'mail_host',
    'db_host',
    'hostname',
    'host',
    'server',
    'mq_host',
    'sql_host',
    'from_email',
  ],
  username: [
    'username',
    'user',
    'login',
    'login_username',
    'account',
    'email',
    'userid',
    'user_id',
    'user_name',
    'mail',
    'mailbox',
    'handle',
    'login_name',
    'uid',
    'mailer_user',
    'docker_user',
    'ftp_user',
    'vpn_user',
    'db_user',
    'sftp_username',
    'mongo_user',
    'gitlab_user',
    'from_email',
    'gcp_service_account',
    'twilio_sid',
    'analyst',
    'oracle_user',
    'mysql_user',
    'report_user',
    'mq_user',
    'ci_user',
    'ci-bot',
  ],
  password: [
    'password',
    'pass',
    'secret',
    'passwd',
    'credential',
    'pwd',
    'passcode',
    'password_hash',
    'auth_token',
    'smtp_password',
    'ftp_password',
    'wifi_password',
    'vpn_secret',
    'docker_password',
    'db_password',
    'cert_password',
    'mq_password',
    'sql_password',
    'personal_access_token',
    'npm_token',
    'github_token',
    'gitlab_token',
    'slack_bot_token',
    'twilio_auth_token',
    'stripe_key',
    'sendgrid_api_key',
    'webhook_secret',
    'client_secret',
    'oauth_client_secret',
    'azure_client_secret',
    'aws_secret_access_key',
    'cloud_secret_key',
    'encryption_key',
    'secret_key',
    'app_secret',
    'api_key',
    'access_key',
    'token',
    'bearer',
    'access_token',
    'glpat',
    'ghp_',
    'xoxb',
    'sk_live',
    'sk_test',
    'whsec',
    'credentials',
    'passphrase',
    'phrase',
    'ciphertext',
    'shared_secret',
    'secret_value',
    'stripe_webhook_secret',
    'credential_key',
  ],
  notes: [
    'notes',
    'note',
    'comment',
    'comments',
    'extra',
    'description',
    'memo',
    'private_note',
    'secure_note',
    'owner',
    'region',
    'scope',
    'algorithm',
    'location',
    'assigned_to',
    'purpose',
    'mode',
    'workspace',
    'repo',
    'package_scope',
    'group',
    'cluster',
    'role',
    'tag',
    'updated_by',
    'usage',
    'tenant_id',
    'project_id',
    'default_region',
    'aws_profile',
    'vhost',
    'fingerprint',
    'thumbprint',
    'kms_key_alias',
    'key_arn',
    'json_key_ref',
    'pem_file_ref',
    'ssh_ref',
    'metadata',
    'ciphertext',
    'common_name',
    'service_name',
    'dbname',
    'database',
    'engine',
    'type',
    'cluster',
    'instance',
    'assigned',
    'updated',
    'blob',
    'payload',
    'hint',
    'rotation',
    'user_id',
    'account_id',
    'entry_id',
    'item_id',
    'db_id',
    'record',
    'identifier',
    'key_id',
    'kid',
    'userref',
    'user_ref',
    'app_id',
    'oauth_client_id',
    'azure_client_id',
    'stripe_mode',
    'mixed_entry',
    'credentials',
    'access',
    'secure_blob',
    'api',
    'gitlab',
    'github',
    'slack',
    'npm',
    'docker',
    'twilio',
    'sendgrid',
    'stripe',
    'ftp',
    'sftp',
    'ssh',
    'wifi',
    'vpn',
    'mailer',
    'smtp',
    'webhook',
    'kms',
    'aws',
    'archived',
    'favorite',
    'favourite',
    'otpauth',
    'totp',
    'otp_uri',
    'authenticator',
    'azure',
    'gcp',
    'cloud',
    'license',
    'certificate',
    'postgres',
    'rabbitmq',
    'mongodb',
    'oracle',
    'mysql',
    'redis',
    'sqlserver',
    'db_details',
    'oracle_conn',
    'db',
    'uuid',
    'record_id',
    'vault_item_id',
    'item_uuid',
    'apikeys',
    'db_name',
    'stripe_mode',
    'twilio_sid',
    'port',
  ],
  host: [
    'host',
    'hostname',
    'server',
    'addr',
    'address',
    'db_host',
    'ftp_host',
    'smtp_host',
    'sftp_host',
    'mail_host',
    'mq_host',
    'sql_host',
    'mongo_host',
    'pg_host',
    'oracle_host',
  ],
  port: ['port', 'db_port', 'mq_port', 'sql_port', 'pg_port'],
  private_key: [
    'private_key',
    'privatekey',
    'identityfile',
    'pem',
    'material',
    'sshkey',
    'ssh_key',
    'private_key_ref',
    'key_ref',
    'identity',
    'sftp_key',
    'key',
  ],
  passphrase: ['passphrase', 'key_passphrase', 'keypassphrase', 'phrase', 'key_pass'],
  service: [
    'service',
    'provider',
    'vendor',
    'issuer_name',
    'payments-api',
    'redis-cache',
    'corp-vpn',
    'docker_registry',
    'registry',
    'gitlab',
    'github',
    'slack',
    'stripe',
    'twilio',
    'sendgrid',
    'npm',
    'rabbitmq',
    'mongo',
    'postgres',
    'mysql',
    'oracle',
    'sqlserver',
    'redis',
    'smtp',
    'ftp',
    'sftp',
    'internal-sso',
    'kms',
    'aws',
    'azure',
    'gcp',
  ],
  key: [
    'key',
    'api_key',
    'apikey',
    'token',
    'bearer',
    'access_token',
    'stripe_key',
    'sendgrid_api_key',
    'github_token',
    'npm_token',
    'personal_access_token',
    'slack_bot_token',
    'glpat',
    'ghp_',
    'xoxb',
    'sk_live',
    'sk_test',
    'cloud_access_key',
    'encryption_key',
    'app_key',
    'access_key',
    'webhook_secret',
    'aws_secret_access_key',
    'aws_access_key_id',
    'json_key_ref',
    'kms_key',
    'secret_key',
    'api',
    'credential_key',
  ],
  client_secret: ['client_secret', 'oauth_client_secret', 'azure_client_secret', 'consumer_secret', 'app_secret', 'secret'],
  key_label: [
    'key_label',
    'key_name',
    'keyname',
    'label_key',
    'twilio_sid',
    'key_id',
    'kid',
    'key_arn',
    'kms_key_alias',
    'package_scope',
    'registry',
    'repo',
    'workspace',
    'group',
    'cluster',
    'role',
    'vhost',
    'tenant_id',
    'project_id',
    'thumbprint',
    'fingerprint',
    'usage',
    'mode',
    'purpose',
    'assigned_to',
    'owner',
    'user',
    'account',
    'tag',
    'category',
    'pem_file_ref',
    'ssh_ref',
    'json_key_ref',
  ],
  email_address: [
    'email_address',
    'address',
    'email',
    'mail',
    'mailbox',
    'from_email',
    'mailer',
    'smtp_user',
  ],
  provider: ['provider', 'host', 'imap', 'smtp', 'engine', 'service_name', 'region', 'tenant', 'project'],
  format: ['format', 'type', 'kind', 'encoding', 'algorithm', 'engine'],
  material: [
    'material',
    'pem',
    'private_key',
    'privatekey',
    'seed',
    'mnemonic',
    'phrase',
    'encryption_key',
    'license_key',
    'ssh_key',
    'ssh-ed25519',
    'certificate',
    'pem_file',
    'blob',
    'ciphertext',
    'secure_blob',
    'json_key',
    'kms',
  ],
  id_kind: ['id_kind', 'type', 'kind', 'document_type', 'doctype', 'category', 'engine', 'service_name'],
  identifier: [
    'identifier',
    'number',
    'document_number',
    'documentnumber',
    'id',
    'docno',
    'uid',
    'user_id',
    'account_id',
    'entry_id',
    'item_id',
    'db_id',
    'record',
    'oauth_client_id',
    'tenant_id',
    'project_id',
    'thumbprint',
    'fingerprint',
  ],
  issuer: ['issuer', 'country', 'authority', 'issued_by', 'owner', 'region', 'vendor', 'provider'],
  tags: ['tags', 'tag', 'labels', 'categories', 'package_scope', 'group', 'cluster', 'role', 'uuid', 'vault_item_id'],
  category: ['category', 'folder', 'group', 'vault_folder', 'namespace', 'class'],
  alternative_url: ['alternative_url', 'alt_url', 'secondary_url', 'mobile_url', 'app_url'],
  external_reference: ['external_reference', 'external_ref', 'reference', 'ref', 'external_id', 'record_id', 'item_uuid', 'id'],
  oauth_client_id: ['oauth_client_id', 'app_client_id', 'client_id', 'app_id'],
  environment: ['environment', 'env', 'stage', 'deployment'],
  version: ['version', 'api_version', 'sdk_version', 'app_version'],
  api_base_url: [
    'api_base_url',
    'api_endpoint',
    'rest_base',
    'endpoint',
    'base_url',
    'token_url',
    'token_endpoint',
    'issuer',
    'issuer_url',
  ],
  scopes: ['scopes', 'oauth_scopes', 'permissions'],
  bundle_id: ['bundle_id', 'package_name', 'application_id'],
  connection_string: ['connection_string', 'dsn', 'jdbc_url', 'connstr'],
  ssl_mode: ['ssl_mode', 'sslmode', 'tls_mode'],
  jump_host: ['jump_host', 'bastion', 'bastion_host', 'proxyjump', 'jumpbox'],
  key_fingerprint: ['key_fingerprint', 'ssh_fingerprint', 'host_key_fingerprint'],
  imap_host: ['imap_host', 'imap_server'],
  smtp_host: ['smtp_host', 'smtp_server'],
  assigned_to: ['assigned_to', 'assignee'],
  expires: ['expires', 'expiry', 'expiration', 'renewal', 'valid_until', 'renew_by'],
  product: ['product', 'software', 'subscription', 'sku'],
  vendor: ['vendor', 'publisher'],
  license_key: ['license_key', 'activation_key', 'serial', 'entitlement'],
  public_key: ['public_key', 'publickey', 'certificate', 'cert'],
  fingerprint: ['fingerprint', 'thumbprint'],
  body: [
    'body',
    'content',
    'text',
    'markdown',
    'data',
    'message',
    'note',
    'notes',
    'private_note',
    'secure_note',
    'ciphertext',
    'description',
    'blob',
    'payload',
    'mixed_entry',
  ],
  platform: ['platform', 'os', 'device', 'cluster', 'workspace', 'registry', 'docker', 'npm', 'gitlab', 'github'],
  database: ['database', 'dbname', 'db_name', 'schema', 'sid', 'catalog', 'instance', 'service_name'],
};

function sourceKeyMatchesTarget(lowerSource: string, targetKey: string): boolean {
  if (lowerSource === targetKey.toLowerCase()) {
    return true;
  }
  const aliases = TARGET_SOURCE_ALIASES[targetKey];
  if (!aliases) {
    return false;
  }
  return aliases.some((a) => a.toLowerCase() === lowerSource);
}

function hasTarget(targets: readonly { value: string }[], key: string): boolean {
  return targets.some((t) => t.value === key);
}

/**
 * When `password` is already mapped, extra secret-like keys must not fall through to `title`.
 * Prefer `tags`, then `notes`, when those targets exist and are free.
 */
/**
 * When `key` is already mapped, a second exporter secret (e.g. `secret_key` next to `api_key`)
 * should use {@link client_secret}, not collide on `key` or fall through to unrelated fields.
 */
function spillTargetForExtraApiKeyClientSecret(
  ls: string,
  itemType: string,
  targets: readonly { value: string }[],
  used: ReadonlySet<string>,
): string | null {
  if (itemType !== 'credential:api-key' || !hasTarget(targets, 'client_secret') || used.has('client_secret')) {
    return null;
  }
  if (!used.has('key')) {
    return null;
  }
  if (/^secret$|client_secret|oauth_client_secret|consumer_secret$/i.test(ls) || /^secret_key$/i.test(ls) || /^app_secret$/i.test(ls)) {
    return 'client_secret';
  }
  return null;
}

function spillTargetForExtraSecret(ls: string, targets: readonly { value: string }[], used: ReadonlySet<string>): string | null {
  if (/_host$|^host$/i.test(ls) || /^uid$/i.test(ls)) {
    return null;
  }
  const secretish =
    /shared_secret|secret_value|password_hash|secret_key|auth_token|client_secret|private_key|encryption_key|ciphertext/i.test(
      ls,
    ) ||
    (/secret|hash|passwd|pwd|passcode|token|cipher/i.test(ls) && !/secret[_-]?key$/i.test(ls));
  if (!secretish || !used.has('password')) {
    return null;
  }
  if (hasTarget(targets, 'tags') && !used.has('tags')) {
    return 'tags';
  }
  if (hasTarget(targets, 'notes') && !used.has('notes')) {
    return 'notes';
  }
  return null;
}

/** Pattern pass when no exact alias hit; keeps odd exporter keys on a real field. */
function heuristicTargetForSourceKey(
  ls: string,
  itemType: string,
  targets: readonly { value: string }[],
): string | null {
  const isApiKey = itemType === 'credential:api-key';
  const isWebsite = itemType === 'credential:website' || itemType === 'credential';
  const isSsh = itemType === 'credential:ssh';
  const isEmail = itemType === 'credential:email';
  const isGeneric = itemType === 'credential:generic';
  const isDatabase = itemType === 'credential:database';
  const isApp = itemType === 'credential:app';
  const isLicense = itemType === 'credential:license';

  if (hasTarget(targets, 'client_secret') && isApiKey) {
    if (/^secret$|client_secret|oauth_client_secret|consumer_secret$/i.test(ls)) {
      return 'client_secret';
    }
  }

  if (hasTarget(targets, 'version') && isApiKey) {
    if (/^version$|api_version|sdk_version|^app_version$/i.test(ls)) {
      return 'version';
    }
  }

  if (hasTarget(targets, 'key') && isApiKey) {
    if (
      /^(api|access|secret|app|stripe|sendgrid|github|npm|slack|twilio|ghp|glpat|xoxb|sk_|sg\.|whsec|bearer|token|encryption|cloud_access)/i.test(ls) ||
      /_key$|_token$|api_key|access_key|secret_key|personal_access|webhook_secret/i.test(ls)
    ) {
      if (
        !/oauth_client_secret|client_secret|password|smtp|ftp|wifi|vpn|docker|db_|cert|mq_|sql_|passphrase|thumb|finger|_id$/i.test(ls) ||
        /api|token|secret_key|access_key/i.test(ls)
      ) {
        return 'key';
      }
    }
  }

  if (hasTarget(targets, 'password')) {
    if (
      /password|passwd|passcode|_pwd\b|\bpwd\b|_pass\b|password_hash|smtp_password|smtp_pass\b|ftp_password|ftp_pass\b|wifi_password|wifi_pass\b|vpn_secret|vpn_password|vpn_pass\b|docker_password|docker_pass\b|db_password|db_pass\b|cert_password|cert_pass\b|mq_password|mq_pass\b|sql_password|sql_pass\b|webhook_secret|stripe_webhook|client_secret|azure_client_secret|aws_secret|twilio_auth|npm_token|github_token|personal_access|slack_bot|glpat|xoxb|ghp_|stripe_key|sendgrid|auth_token|passphrase|app_secret|secret_key|secret_value|shared_secret|ciphertext/i.test(
        ls,
      ) &&
      !/thumbprint|fingerprint|access_key_id$/i.test(ls)
    ) {
      return 'password';
    }
    if (/token$/i.test(ls) && (isGeneric || isWebsite) && !/oauth_client_id|access_key_id|key_id|kid$/i.test(ls)) {
      return 'password';
    }
  }

  if (hasTarget(targets, 'url') && (isWebsite || isGeneric)) {
    if (
      /_uri$|_url$|^uri$|^url$|mongodb|mongo_uri|connection_string|endpoint|^connection$|registry|webhook|base_url|sftp|ftp:\/\//i.test(
        ls,
      ) ||
      /^ftp_host$|^sftp_host$|^smtp_host$|^imap_host$/i.test(ls)
    ) {
      return 'url';
    }
  }

  if (hasTarget(targets, 'host')) {
    if (isGeneric) {
      if (
        /^ftp_host$|^sftp_host$|^smtp_host$|^imap_host$|^mail_host$|^db_host$|^mongo_host$|^pg_host$|^sql_host$|^mq_host$/i.test(
          ls,
        ) ||
        (/^host$|^hostname$|^server$/i.test(ls) && !/smtp_user|mailer_user/i.test(ls))
      ) {
        return 'host';
      }
    } else if (
      (isSsh || itemType.includes('database')) &&
      /_host$|^host$|^hostname$|^server$/i.test(ls) &&
      !/smtp_user|mailer_user/i.test(ls)
    ) {
      return 'host';
    }
  }

  if (hasTarget(targets, 'username')) {
    if (
      /_user$|login_username|login_name|mailer_user|docker_user|ftp_user|vpn_user|db_user|mongo_user|gitlab_user|sftp_username|analyst|oracle_user|report_user|mysql_user|mq_user|ci_user|from_email/i.test(
        ls,
      )
    ) {
      return 'username';
    }
  }

  if (hasTarget(targets, 'private_key') && isSsh) {
    if (/private_key|ssh_key|identity|pem_file|\.pem|openssh|ed25519|rsa_key/i.test(ls)) {
      return 'private_key';
    }
  }

  if (hasTarget(targets, 'material')) {
    if (/encryption_key|license_key|ssh-ed25519|BEGIN |PRIVATE KEY|mnemonic|seed|pem_file|key_ref|kms/i.test(ls)) {
      return 'material';
    }
  }

  if (hasTarget(targets, 'email_address') && isEmail) {
    if (/mail|email|mailbox|from_/i.test(ls)) {
      return 'email_address';
    }
  }

  if (hasTarget(targets, 'database') && itemType.includes('database')) {
    if (/database|dbname|db_name|schema|catalog|sid/i.test(ls)) {
      return 'database';
    }
  }

  if (hasTarget(targets, 'name') && isWebsite && /vpn|wifi|docker|gitlab|github|slack|ftp|sftp|smtp|webhook/i.test(ls)) {
    return 'name';
  }

  if (hasTarget(targets, 'service') && isApiKey && /sendgrid|stripe|twilio|npm|docker|gitlab|github|slack|rabbit|redis|mongo|sql|oracle|mysql|payments|internal-sso/i.test(ls)) {
    return 'service';
  }

  if (hasTarget(targets, 'body')) {
    if (/note|blob|payload|content|text|message|secure|private_note|ciphertext/i.test(ls)) {
      return 'body';
    }
  }

  if (hasTarget(targets, 'url') && /:\/\//.test(ls)) {
    return 'url';
  }

  if (hasTarget(targets, 'connection_string') && isDatabase) {
    if (/connection|connstr|dsn|jdbc|mongodb(\+srv)?:\/\//i.test(ls)) {
      return 'connection_string';
    }
  }

  if (hasTarget(targets, 'ssl_mode') && isDatabase && /ssl|tls/i.test(ls)) {
    return 'ssl_mode';
  }

  if (hasTarget(targets, 'bundle_id') && isApp && /bundle|package|application_id|\.[a-z]{2,}\.[a-z]/i.test(ls)) {
    return 'bundle_id';
  }

  if (hasTarget(targets, 'license_key') && isLicense && /license|serial|activation|entitlement|key$/i.test(ls)) {
    return 'license_key';
  }

  if (
    hasTarget(targets, 'expires') &&
    (isLicense || itemType === 'id') &&
    /expir|renew|valid_until|valid-until|ends_on|renew_by/i.test(ls)
  ) {
    return 'expires';
  }

  if (hasTarget(targets, 'imap_host') && isEmail && /imap/i.test(ls)) {
    return 'imap_host';
  }

  if (hasTarget(targets, 'smtp_host') && isEmail && /smtp/i.test(ls) && !/smtp_password|smtp_user|smtp_pass/i.test(ls)) {
    return 'smtp_host';
  }

  if (hasTarget(targets, 'scopes') && isApiKey && /scope/i.test(ls)) {
    return 'scopes';
  }

  if (hasTarget(targets, 'oauth_client_id') && isApiKey && /oauth_client|^client_id$|^app_id$/i.test(ls)) {
    return 'oauth_client_id';
  }

  if (hasTarget(targets, 'environment') && isApiKey && /^env$|environment|deployment|stage$/i.test(ls)) {
    return 'environment';
  }

  if (hasTarget(targets, 'api_base_url') && isApiKey && /base_url|api_url|endpoint|token_url|token_endpoint|issuer/i.test(ls)) {
    return 'api_base_url';
  }

  if (hasTarget(targets, 'public_key') && itemType === 'key' && /public|certificate|cert$/i.test(ls)) {
    return 'public_key';
  }

  if (hasTarget(targets, 'fingerprint') && itemType === 'key' && /fingerprint|thumbprint/i.test(ls)) {
    return 'fingerprint';
  }

  if (hasTarget(targets, 'category') && (itemType === 'secure_note' || isGeneric || isWebsite || isApp) && /^category$|^folder$|^group$/i.test(ls)) {
    return 'category';
  }

  return null;
}

/**
 * Suggested vault field for one source key (always a real field for this `item_type`).
 */
export function suggestImportTargetForSourceKey(sourceKey: string, itemType: string): string {
  const ls = sourceKey.toLowerCase();
  const targets = getImportFieldTargetOptions(itemType);
  for (const t of targets) {
    if (sourceKeyMatchesTarget(ls, t.value)) {
      return t.value;
    }
  }
  const hit = heuristicTargetForSourceKey(ls, itemType, targets);
  if (hit && hasTarget(targets, hit)) {
    return hit;
  }
  return getImportFieldFallbackTarget(itemType);
}

/**
 * Like {@link suggestImportTargetForSourceKey}, but never returns a target already in `used`
 * when the primary suggestion is free; otherwise picks another unused field (aliases / heuristics / schema order).
 */
export function suggestDistinctImportTargetForSourceKey(
  sourceKey: string,
  itemType: string,
  used: ReadonlySet<string>,
): string {
  const preferred = coerceImportMapSelectValue(itemType, suggestImportTargetForSourceKey(sourceKey, itemType));
  if (!isTargetTaken(used, preferred)) {
    return preferred;
  }
  const ls = sourceKey.toLowerCase();
  const targets = getImportFieldTargetOptions(itemType);
  const apiKeySpill = spillTargetForExtraApiKeyClientSecret(ls, itemType, targets, used);
  if (apiKeySpill !== null) {
    return apiKeySpill;
  }
  const spill = spillTargetForExtraSecret(ls, targets, used);
  if (spill !== null) {
    return spill;
  }
  for (const t of targets) {
    if (isTargetTaken(used, t.value)) {
      continue;
    }
    if (sourceKeyMatchesTarget(ls, t.value)) {
      return t.value;
    }
  }
  const hit = heuristicTargetForSourceKey(ls, itemType, targets);
  if (hit && hasTarget(targets, hit) && !isTargetTaken(used, hit)) {
    return hit;
  }
  for (const t of targets) {
    if (!isTargetTaken(used, t.value)) {
      return t.value;
    }
  }
  return coerceImportMapSelectValue(itemType, getImportFieldFallbackTarget(itemType));
}

/**
 * Merge several row payloads for **suggestion-only** use (shared field map per group).
 * If one row leaves a column blank but another row fills it, the merged sample carries a non-empty value
 * so {@link buildSuggestedKeyMap} does not assign a competitive vault field to `notes` for the whole group.
 */
export function mergeImportSampleRawsForSuggestion(rows: readonly unknown[]): unknown {
  if (rows.length === 0) {
    return undefined;
  }
  if (rows.length === 1) {
    return rows[0];
  }
  const layers = rows.map(unwrapImportRow);
  if (!layers.every((u) => u !== null && typeof u === 'object' && !Array.isArray(u))) {
    return rows[0];
  }
  const keyOrder: string[] = [];
  const seenLower = new Set<string>();
  for (const layer of layers) {
    for (const k of Object.keys(layer as Record<string, unknown>)) {
      if (k === '__importKey') {
        continue;
      }
      const low = k.toLowerCase();
      if (!seenLower.has(low)) {
        seenLower.add(low);
        keyOrder.push(k);
      }
    }
  }
  const merged: Record<string, unknown> = {};
  for (const k of keyOrder) {
    let picked: unknown;
    for (const layer of layers) {
      const v = readImportSourceValue(layer, k);
      if (!isEffectivelyEmptyValue(v)) {
        picked = v;
        break;
      }
    }
    if (picked !== undefined) {
      merged[k] = picked;
      continue;
    }
    const v0 = readImportSourceValue(layers[0], k);
    if (v0 !== undefined) {
      merged[k] = v0;
    }
  }
  return merged;
}

/**
 * Full map: every source key → a vault field. Most fields are used at most once; **`notes` may repeat**
 * (merged on import). When `raw` is provided, keys are ordered for login-style rows (password / website)
 * and blank values are kept off competitive fields (URL, username, password, name).
 */
export function buildSuggestedKeyMap(itemType: string, sourceKeys: string[], raw?: unknown): Record<string, string> {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  const inner = unwrapImportRow(raw);
  const competes = competitiveVaultTargetsFor(itemType);
  const sorted = [...sourceKeys].sort((a, b) => compareImportSourceKeysByPriority(a, b, itemType));
  for (const k of sorted) {
    let t = suggestDistinctImportTargetForSourceKey(k, itemType, used);
    if (inner !== null && typeof inner === 'object' && !Array.isArray(inner)) {
      const v = readImportSourceValue(inner as Record<string, unknown>, k);
      if (isEffectivelyEmptyValue(v) && competes.has(t)) {
        /** Keep exporter columns on their natural vault field so per-row values still apply (e.g. 1Password `Url` often blank in merged sample but filled on other rows). */
        const keepTarget = sourceKeyMatchesTarget(k.toLowerCase(), t);
        if (!keepTarget) {
          t = 'notes';
        }
      }
    }
    out[k] = t;
    if (isVaultTargetConsumable(t)) {
      used.add(t);
    }
  }
  return out;
}

export function readImportSourceValue(unwrapped: unknown, srcKey: string): unknown {
  if (unwrapped !== null && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    const o = unwrapped as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(o, srcKey)) {
      return o[srcKey];
    }
    for (const k of Object.keys(o)) {
      if (k.toLowerCase() === srcKey.toLowerCase()) {
        return o[k];
      }
    }
    return undefined;
  }
  if (Array.isArray(unwrapped)) {
    const m = /^\[(\d+)\]$/.exec(srcKey);
    if (m) {
      const i = Number(m[1]);
      return unwrapped[i];
    }
    return undefined;
  }
  if (srcKey === 'value') {
    return unwrapped;
  }
  return undefined;
}

/**
 * Vault fields that appear more than once in `keyMap` (excluding `_ignore` / empty).
 * Callers should block import / reject UI changes when this is non-empty.
 */
export function findDuplicateImportMapTargets(keyMap: Record<string, string>): ReadonlyArray<{ target: string; sources: string[] }> {
  const targetToSources = new Map<string, string[]>();
  for (const [src, tgt] of Object.entries(keyMap)) {
    if (tgt === IMPORT_KEY_MAP_IGNORE || tgt === '') {
      continue;
    }
    if (tgt === 'notes') {
      continue;
    }
    const list = targetToSources.get(tgt) ?? [];
    list.push(src);
    targetToSources.set(tgt, list);
  }
  return [...targetToSources.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([target, sources]) => ({ target, sources: [...sources].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.target.localeCompare(b.target));
}

/**
 * Build a plain object whose keys are vault field names and values come from the source JSON
 * according to `keyMap`. Multiple sources may map to `notes`; they are merged as plain text lines
 * (`key=value` for non-`notes` keys, raw text for `notes` / `note`). Other duplicate targets: last
 * mapping wins (callers should validate with {@link findDuplicateImportMapTargets} for non-notes).
 * Skips legacy `_ignore`.
 */
export function applyImportKeyMap(unwrapped: unknown, keyMap: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const plainNotes: string[] = [];
  const kvNotes: Array<{ src: string; line: string }> = [];
  for (const [src, tgt] of Object.entries(keyMap)) {
    if (tgt === IMPORT_KEY_MAP_IGNORE || tgt === '') {
      continue;
    }
    const v = readImportSourceValue(unwrapped, src);
    if (v === undefined) {
      continue;
    }
    if (tgt !== 'notes') {
      out[tgt] = v;
      continue;
    }
    const text = scalarForImportMerge(v);
    const ls = src.toLowerCase();
    if (ls === 'notes' || ls === 'note') {
      if (text !== '') {
        plainNotes.push(text);
      }
    } else if (text !== '') {
      kvNotes.push({ src, line: `${src}=${text}` });
    }
  }
  kvNotes.sort((a, b) => a.src.localeCompare(b.src));
  const mergedNotes = [...plainNotes, ...kvNotes.map((x) => x.line)].join('\n');
  if (mergedNotes !== '') {
    out['notes'] = mergedNotes;
  }
  return out;
}

/**
 * Groups rows that share the same source-key shape and vault type so one map applies to many items.
 */
export function buildImportMappingGroups(
  previewItems: readonly ImportPreviewItem[],
  effectiveItemType: (index: number) => string,
): ImportMappingGroup[] {
  const acc = new Map<
    string,
    {
      itemType: string;
      sourceKeys: string[];
      rowCount: number;
    }
  >();

  for (const row of previewItems) {
    const itemType = effectiveItemType(row.index);
    const id = importMappingGroupId(row.raw, itemType);
    const keys = extractImportSourceKeys(row.raw);
    const cur = acc.get(id);
    if (cur) {
      cur.rowCount += 1;
    } else {
      acc.set(id, { itemType, sourceKeys: keys, rowCount: 1 });
    }
  }

  return [...acc.entries()].map(([id, v]) => ({
    id,
    itemType: v.itemType,
    sourceKeys: v.sourceKeys,
    rowCount: v.rowCount,
  }));
}

export function buildRowIndexToGroupId(
  previewItems: readonly ImportPreviewItem[],
  effectiveItemType: (index: number) => string,
): Record<number, string> {
  const out: Record<number, string> = {};
  for (const row of previewItems) {
    out[row.index] = importMappingGroupId(row.raw, effectiveItemType(row.index));
  }
  return out;
}
