import { sanitizeImportKeyMapValues } from './import-field-catalog';
import { applyImportKeyMap, findDuplicateImportMapTargets } from './import-key-map';

/**
 * Map arbitrary JSON objects into the plaintext shape expected by
 * {@link WebCryptoService#encryptVaultItem} / {@link WebCryptoService#encryptCredentialItem}.
 */

export interface ImportNormalizeResult {
  record: Record<string, unknown>;
  errors: string[];
}

function unwrapRow(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 2 && keys.includes('__importKey') && keys.includes('value')) {
      return o['value'];
    }
  }
  return raw;
}

/** When `keyMap` is set, shallow-remap source keys to vault field names before alias-based picking. */
function prepareInnerForNormalize(raw: unknown, keyMap?: Record<string, string>): unknown {
  const unwrapped = unwrapRow(raw);
  if (!keyMap || Object.keys(keyMap).length === 0) {
    return unwrapped;
  }
  return applyImportKeyMap(unwrapped, keyMap);
}

function asObject(raw: unknown): Record<string, unknown> | null {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

/** One-level merge of common exporter nested blobs into the root object before field picks. */
const IMPORT_NESTED_MERGE_KEYS = [
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
  'internal_sso',
  'payments-api',
  'corp-vpn',
  'redis-cache',
  'database',
  'cloud',
] as const;

function mergeNestedImportObjects(flat: Record<string, unknown>): Record<string, unknown> {
  const out = { ...flat };
  for (const nk of IMPORT_NESTED_MERGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(out, nk)) {
      continue;
    }
    const v = out[nk];
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      continue;
    }
    for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
      const existing = out[ik];
      const empty = existing === undefined || existing === null || existing === '';
      if (empty && iv !== undefined) {
        out[ik] = iv;
      }
    }
  }
  return out;
}

/** True when a lone `key` value is almost certainly an API token, not an OAuth app id. */
function looksLikeApiAccessToken(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) {
    return false;
  }
  return /^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|sk_|pk_live|pk_test|xoxb-|xoxa-|xapp-|AIza|sg\.|whsec_|glpat-|Bearer\s)/i.test(
    t,
  );
}

/**
 * 1Password (and similar) CSV often leaves `Url` blank while the site appears in `Title`:
 * full URLs, or bare hostnames like `devportal.portara.io`.
 */
function inferWebsiteUrlFromTitleName(name: string): string {
  const t = name.trim();
  if (t.length === 0) {
    return '';
  }
  const leadingUrl = t.match(/^https?:\/\/\S+/i);
  if (leadingUrl) {
    return leadingUrl[0];
  }
  if (
    t.length >= 4 &&
    t.length <= 253 &&
    !/\s/.test(t) &&
    !/[/@]/.test(t) &&
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(t)
  ) {
    return `https://${t}`;
  }
  return '';
}

function pickString(o: Record<string, unknown>, aliases: string[]): string {
  for (const a of aliases) {
    const v = o[a];
    if (typeof v === 'string') {
      return v.trim();
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      return String(v);
    }
  }
  for (const k of Object.keys(o)) {
    const lower = k.toLowerCase();
    for (const a of aliases) {
      if (lower === a.toLowerCase()) {
        const v = o[k];
        if (typeof v === 'string') {
          return v.trim();
        }
        if (typeof v === 'number' || typeof v === 'boolean') {
          return String(v);
        }
      }
    }
  }
  return '';
}

function isCredentialItemType(itemType: string): boolean {
  return itemType === 'credential' || itemType.startsWith('credential:');
}

function credentialSubtypeFromItemType(itemType: string): string | null {
  if (itemType === 'credential') {
    return null;
  }
  if (itemType.startsWith('credential:')) {
    return itemType.slice('credential:'.length);
  }
  return null;
}

function normalizeCredential(
  itemType: string,
  inner: unknown,
  titleFb: string,
): ImportNormalizeResult {
  const errors: string[] = [];
  let o = asObject(inner);
  if (o !== null) {
    o = mergeNestedImportObjects(o);
  }
  const subtype = credentialSubtypeFromItemType(itemType);

  const isWebsite =
    itemType === 'credential:website' || itemType === 'credential' || subtype === 'website' || subtype === null;

  if (isWebsite) {
    if (o === null) {
      let url = typeof inner === 'string' && inner.startsWith('http') ? inner.trim() : '';
      const recName = titleFb;
      if (!url) {
        url = inferWebsiteUrlFromTitleName(recName);
      }
      const rec = {
        name: recName,
        url,
        username: '',
        password: '',
        tags: '',
        category: '',
        alternative_url: '',
        notes: '',
      };
      return { record: rec, errors };
    }
    const name = pickString(o, ['name', 'title', 'label']) || titleFb;
    let url = pickString(o, ['url', 'uri', 'href', 'website', 'login_url', 'login_uri']);
    if (!url) {
      url = inferWebsiteUrlFromTitleName(name);
    }
    const rec = {
      name,
      url,
      username: pickString(o, ['username', 'user', 'login', 'account', 'email']),
      password: pickString(o, ['password', 'pass', 'secret', 'passwd', 'credential']),
      tags: pickString(o, ['tags', 'tag', 'labels']),
      category: pickString(o, ['category', 'folder', 'group', 'vault_folder']),
      alternative_url: pickString(o, ['alternative_url', 'alt_url', 'secondary_url', 'mobile_url', 'app_url']),
      notes: pickString(o, ['notes', 'note', 'comment', 'comments', 'extra']),
    };
    return { record: rec, errors };
  }

  if (o === null) {
    errors.push('Credential import expects a JSON object for this type.');
    return {
      record: {
        title: titleFb,
        username: '',
        password: typeof inner === 'string' ? inner : '',
        notes: '',
        tags: '',
        category: '',
        external_reference: '',
      },
      errors,
    };
  }

  const generic = {
    title: pickString(o, ['title', 'name', 'label']) || titleFb,
    host: pickString(o, [
      'host',
      'hostname',
      'server',
      'ftp_host',
      'sftp_host',
      'smtp_host',
      'imap_host',
      'mail_host',
      'db_host',
      'mongo_host',
      'pg_host',
      'sql_host',
      'mq_host',
      'addr',
    ]),
    username: pickString(o, ['username', 'user', 'login', 'account', 'email', 'login_name', 'uid']),
    password: pickString(o, [
      'password',
      'pass',
      'secret',
      'passwd',
      'pwd',
      'passcode',
      'secret_key',
      'shared_secret',
      'password_hash',
    ]),
    notes: pickString(o, ['notes', 'note', 'comment']),
    tags: pickString(o, ['tags', 'tag', 'labels']),
    category: pickString(o, ['category', 'folder', 'group', 'vault_folder']),
    external_reference: pickString(o, [
      'external_reference',
      'external_ref',
      'reference',
      'ref',
      'external_id',
      'record_id',
      'id',
    ]),
  };

  if (subtype === 'ssh' || itemType === 'credential:ssh') {
    return {
      record: {
        name: pickString(o, ['name', 'title', 'label']) || titleFb,
        host: pickString(o, ['host', 'hostname', 'server', 'addr']),
        port: pickString(o, ['port']),
        username: generic.username || pickString(o, ['user', 'login_username']),
        passphrase: pickString(o, ['passphrase', 'key_passphrase']) || generic.password,
        private_key: pickString(o, [
          'private_key',
          'privatekey',
          'identityfile',
          'pem',
          'material',
          'private_key_ref',
          'ssh_key',
          'key',
        ]),
        jump_host: pickString(o, ['jump_host', 'bastion', 'bastion_host', 'proxyjump', 'jumpbox']),
        key_fingerprint: pickString(o, ['key_fingerprint', 'fingerprint', 'thumbprint', 'ssh_fingerprint', 'host_key_fingerprint']),
        tags: generic.tags,
        notes: generic.notes,
      },
      errors,
    };
  }

  if (subtype === 'api-key' || itemType === 'credential:api-key') {
    const secretVal = pickString(o, ['client_secret', 'oauth_client_secret', 'consumer_secret', 'secret']);
    const tokenVal = pickString(o, ['access_token', 'api_key', 'apikey', 'token', 'app_key', 'password']);
    const idVal = pickString(o, ['oauth_client_id', 'client_id', 'app_client_id', 'app_id', 'consumer_key', 'key_id', 'kid']);
    const bareKeyVal = pickString(o, ['key']);

    let oauth_client_id = idVal;
    if (!oauth_client_id && secretVal && bareKeyVal && !tokenVal && !looksLikeApiAccessToken(bareKeyVal)) {
      oauth_client_id = bareKeyVal;
    }

    const key =
      tokenVal || (oauth_client_id === bareKeyVal && secretVal && !looksLikeApiAccessToken(bareKeyVal) ? '' : bareKeyVal);
    const client_secret = secretVal;

    return {
      record: {
        service: pickString(o, ['service', 'title', 'name', 'provider']) || titleFb,
        key,
        client_secret,
        key_label: pickString(o, ['key_label', 'key_name', 'keyname', 'label', 'key_id', 'kid']),
        oauth_client_id,
        version: pickString(o, ['version', 'api_version', 'sdk_version', 'app_version']),
        environment: pickString(o, ['environment', 'env', 'stage', 'deployment']),
        api_base_url: pickString(o, [
          'api_base_url',
          'base_url',
          'endpoint',
          'api_url',
          'token_url',
          'token_endpoint',
          'issuer_url',
          'issuer',
        ]),
        scopes: pickString(o, ['scopes', 'scope', 'oauth_scopes']),
        tags: generic.tags,
        notes: generic.notes,
      },
      errors,
    };
  }

  if (subtype === 'email' || itemType === 'credential:email') {
    return {
      record: {
        name: pickString(o, ['name', 'title', 'label']) || titleFb,
        email_address: pickString(o, ['email_address', 'address', 'email', 'mail', 'username']),
        provider: pickString(o, ['provider', 'host']),
        imap_host: pickString(o, ['imap_host', 'imap_server', 'imap']),
        smtp_host: pickString(o, ['smtp_host', 'smtp_server']),
        password: generic.password,
        tags: generic.tags,
        notes: generic.notes,
      },
      errors,
    };
  }

  if (subtype === 'database' || itemType === 'credential:database') {
    return {
      record: {
        name: pickString(o, ['name', 'title', 'label', 'connection_name']) || titleFb,
        host: pickString(o, ['host', 'hostname', 'server', 'db_host', 'addr', 'sql_host', 'mongo_host', 'pg_host']),
        port: pickString(o, ['port', 'db_port']),
        database: pickString(o, ['database', 'dbname', 'db_name', 'schema', 'sid', 'catalog', 'instance', 'service_name']),
        username: pickString(o, ['username', 'user', 'db_user', 'login']),
        password: pickString(o, ['password', 'db_password', 'pass', 'secret']),
        connection_string: pickString(o, ['connection_string', 'connection', 'uri', 'dsn', 'mongodb_uri', 'mongo_uri', 'jdbc_url']),
        ssl_mode: pickString(o, ['ssl_mode', 'sslmode', 'tls_mode', 'ssl']),
        tags: generic.tags,
        notes: generic.notes,
      },
      errors,
    };
  }

  if (subtype === 'app' || itemType === 'credential:app') {
    return {
      record: {
        name: pickString(o, ['name', 'title', 'label', 'app', 'app_name']) || titleFb,
        platform: pickString(o, ['platform', 'os', 'device']),
        bundle_id: pickString(o, ['bundle_id', 'package', 'package_name', 'application_id']),
        username: generic.username,
        password: generic.password,
        tags: generic.tags,
        category: generic.category,
        notes: generic.notes,
      },
      errors,
    };
  }

  if (subtype === 'license' || itemType === 'credential:license') {
    return {
      record: {
        product: pickString(o, ['product', 'software', 'title', 'name', 'label']) || titleFb,
        vendor: pickString(o, ['vendor', 'publisher', 'issuer', 'provider']),
        license_key: pickString(o, ['license_key', 'key', 'activation_key', 'serial', 'license', 'entitlement']),
        assigned_to: pickString(o, ['assigned_to', 'assignee', 'owner', 'user']),
        expires: pickString(o, ['expires', 'expiry', 'expiration', 'renewal', 'valid_until', 'renew_by']),
        tags: generic.tags,
        notes: generic.notes,
      },
      errors,
    };
  }

  return { record: { ...generic }, errors };
}

export interface ImportNormalizeOptions {
  titleFallback?: string;
  /** Per source key → vault field key or `_ignore` (see import-field-catalog). */
  keyMap?: Record<string, string>;
}

/**
 * Build the JSON record stored inside the encrypted vault item payload.
 */
export function normalizeImportRow(raw: unknown, itemType: string, options?: ImportNormalizeOptions): ImportNormalizeResult {
  const errors: string[] = [];
  const titleFb = options?.titleFallback?.trim() || 'Imported item';

  let keyMap = options?.keyMap;
  if (keyMap && Object.keys(keyMap).length > 0) {
    keyMap = sanitizeImportKeyMapValues(itemType, keyMap);
    if (findDuplicateImportMapTargets(keyMap).length > 0) {
      errors.push(
        'Field map assigns more than one JSON key to the same vault field. Open Map fields and use a different vault field for each JSON key.',
      );
      keyMap = undefined;
    }
  }

  const inner = prepareInnerForNormalize(raw, keyMap);

  if (isCredentialItemType(itemType)) {
    const { record, errors: credErrors } = normalizeCredential(itemType, inner, titleFb);
    return { record, errors: [...errors, ...credErrors] };
  }

  if (itemType === 'password') {
    let o = asObject(inner);
    if (o !== null) {
      o = mergeNestedImportObjects(o);
    }
    if (o === null) {
    return {
      record: {
        title: titleFb,
        password: typeof inner === 'string' ? inner : '',
        url: '',
        username: '',
        tags: '',
        notes: '',
        vault_simple_kind: 'password',
      },
      errors,
    };
    }
    return {
      record: {
        title: pickString(o, ['title', 'name', 'label']) || titleFb,
        password: pickString(o, ['password', 'pass', 'secret', 'passwd', 'credential_key', 'token', 'key']),
        url: pickString(o, ['url', 'uri', 'href', 'website', 'login_url', 'login_uri', 'link']),
        username: pickString(o, ['username', 'user', 'login', 'account', 'email']),
        tags: pickString(o, ['tags', 'tag', 'labels']),
        notes: pickString(o, ['notes', 'note']),
        vault_simple_kind: 'password',
      },
      errors,
    };
  }

  if (itemType === 'key') {
    let o = asObject(inner);
    if (o !== null) {
      o = mergeNestedImportObjects(o);
    }
    if (o === null) {
      return {
        record: {
          title: titleFb,
          format: '',
          public_key: '',
          fingerprint: '',
          material: typeof inner === 'string' ? inner : '',
          tags: '',
          notes: '',
          vault_simple_kind: 'key',
        },
        errors,
      };
    }
    return {
      record: {
        title: pickString(o, ['title', 'name', 'label']) || titleFb,
        format: pickString(o, ['format', 'type', 'kind']),
        public_key: pickString(o, ['public_key', 'publickey', 'certificate', 'cert', 'pub']),
        fingerprint: pickString(o, ['fingerprint', 'thumbprint', 'key_fingerprint', 'ssh_fingerprint']),
        material: pickString(o, ['material', 'pem', 'private_key', 'privatekey', 'key', 'seed', 'mnemonic']),
        tags: pickString(o, ['tags', 'tag', 'labels']),
        notes: pickString(o, ['notes', 'note']),
        vault_simple_kind: 'key',
      },
      errors,
    };
  }

  if (itemType === 'id') {
    let o = asObject(inner);
    if (o !== null) {
      o = mergeNestedImportObjects(o);
    }
    if (o === null) {
      return {
        record: {
          title: titleFb,
          id_kind: '',
          identifier: '',
          issuer: '',
          expires: '',
          tags: '',
          notes: '',
          vault_simple_kind: 'id',
        },
        errors,
      };
    }
    return {
      record: {
        title: pickString(o, ['title', 'name', 'label']) || titleFb,
        id_kind: pickString(o, ['id_kind', 'type', 'kind', 'document_type']),
        identifier: pickString(o, ['identifier', 'number', 'document_number', 'documentnumber', 'id']),
        issuer: pickString(o, ['issuer', 'country', 'authority']),
        expires: pickString(o, ['expires', 'expiry', 'expiration', 'valid_until', 'renew_by']),
        tags: pickString(o, ['tags', 'tag', 'labels']),
        notes: pickString(o, ['notes', 'note']),
        vault_simple_kind: 'id',
      },
      errors,
    };
  }

  if (itemType === 'secure_note') {
    let o = asObject(inner);
    if (o !== null) {
      o = mergeNestedImportObjects(o);
    }
    if (o === null) {
      const body = typeof inner === 'string' ? inner : JSON.stringify(inner);
      return {
        record: { title: titleFb, category: '', tags: '', body, vault_simple_kind: 'secure_note' },
        errors,
      };
    }
    const body =
      pickString(o, ['body', 'content', 'text', 'markdown', 'note', 'notes', 'data', 'private_note', 'secure_note']) ||
      JSON.stringify(o);
    return {
      record: {
        title: pickString(o, ['title', 'name', 'label', 'tag', 'subject']) || titleFb,
        category: pickString(o, ['category', 'folder', 'group', 'vault_folder']),
        tags: pickString(o, ['tags', 'tag', 'labels']),
        body,
        vault_simple_kind: 'secure_note',
      },
      errors,
    };
  }

  errors.push(`Unsupported item_type for import: ${itemType}`);
  return { record: { title: titleFb, tags: '', body: JSON.stringify(inner) }, errors };
}

/**
 * Import path does not enforce required fields: users may leave any vault field empty.
 * (Manual create forms may still validate elsewhere.)
 */
export function validateNormalizedRecord(_record: Record<string, unknown>, _itemType: string): string[] {
  return [];
}
