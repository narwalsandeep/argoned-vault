import { describe, expect, it } from 'vitest';

import { getImportFieldSelectOptions, IMPORT_KEY_MAP_IGNORE } from './import-field-catalog';
import {
  applyImportKeyMap,
  buildImportMappingGroups,
  buildSuggestedKeyMap,
  extractImportSourceKeys,
  findDuplicateImportMapTargets,
  importMappingGroupId,
  mergeImportSampleRawsForSuggestion,
  readImportSourceValue,
  suggestImportTargetForSourceKey,
} from './import-key-map';
import type { ImportPreviewItem } from './import-vault-json';

/** Unique top-level keys across `task.md` demo JSON (regenerate if that file changes). */
const TASK_DEMO_TOP_LEVEL_KEYS: readonly string[] = JSON.parse(`[
  "access","access_key","account","account_id","algorithm","api","apiKeys","api_key","app_id","app_key","app_secret",
  "assigned_to","auth_token","aws_access_key_id","aws_profile","aws_secret_access_key","azure_client_id",
  "azure_client_secret","category","cert_password","certificate","cloud_access_key","cloud_secret_key","cluster",
  "connection_string","credential_key","credentials","database","db_details","db_host","db_id","db_name",
  "db_password","db_port","db_user","default_region","description","docker_password","docker_registry","docker_user",
  "email","encryption_key","endpoint","entry_id","fingerprint","from_email","ftp_host","ftp_password","ftp_user",
  "gcp_service_account","github_token","gitlab","handle","hostname","id","identifier","item_id","item_uuid",
  "json_key_ref","key","key_arn","key_id","kms_key_alias","label","license_key","location","login","login_name",
  "login_username","mailer_user","mixed_entry","mode","mongodb_uri","name","npm_token","oauth_client_id",
  "oauth_client_secret","oracle_conn","owner","package_scope","pass","passcode","passwd","password","password_hash",
  "pem_file_ref","port","postgres","private_key_ref","private_note","product","project_id","provider","purpose","pwd",
  "rabbitmq","record","record_id","region","registry","repo","role","scope","secret","secret_key","secret_value",
  "secure_blob","secure_note","sendgrid_api_key","service","sftp","shared_secret","slack_bot_token","smtp_host",
  "smtp_password","ssh_key","stripe_key","stripe_webhook_secret","tag","tenant_id","title","token","twilio_auth_token",
  "twilio_sid","uid","updated_by","usage","user","userRef","user_id","user_name","username","uuid","vault_item_id",
  "vpn_name","vpn_secret","vpn_user","webhook_secret","wifi_password","wifi_ssid","workspace"
]`) as string[];

describe('import-key-map', () => {
  it('extractImportSourceKeys sorts object keys and skips import meta', () => {
    expect(extractImportSourceKeys({ z: 1, a: 2 })).toEqual(['a', 'z']);
    expect(extractImportSourceKeys({ __importKey: 'x', value: { b: 1, a: 2 } })).toEqual(['a', 'b']);
  });

  it('extractImportSourceKeys lists array indices as preview-style keys', () => {
    expect(extractImportSourceKeys(['x', 'y'])).toEqual(['[0]', '[1]']);
  });

  it('extractImportSourceKeys uses value for scalars', () => {
    expect(extractImportSourceKeys('hello')).toEqual(['value']);
  });

  it('readImportSourceValue reads bracket indices from arrays', () => {
    expect(readImportSourceValue(['a', 'b'], '[1]')).toBe('b');
  });

  it('findDuplicateImportMapTargets lists fields mapped from multiple sources', () => {
    const dups = findDuplicateImportMapTargets({
      legacy_pass: 'password',
      secret: 'password',
      user: 'username',
    });
    expect(dups).toEqual([{ target: 'password', sources: ['legacy_pass', 'secret'] }]);
  });

  it('findDuplicateImportMapTargets ignores multiple sources mapped to notes (merged at import)', () => {
    expect(findDuplicateImportMapTargets({ a: 'notes', b: 'notes' })).toEqual([]);
  });

  it('applyImportKeyMap last duplicate target wins', () => {
    const out = applyImportKeyMap({ a: 'first', b: 'second' }, { a: 'password', b: 'password' });
    expect(out['password']).toBe('second');
  });

  it('applyImportKeyMap remaps to canonical keys', () => {
    const out = applyImportKeyMap({ login_uri: 'https://x.test', user: 'me' }, {
      login_uri: 'url',
      user: 'username',
      extra: IMPORT_KEY_MAP_IGNORE,
    });
    expect(out).toEqual({ url: 'https://x.test', username: 'me' });
  });

  it('applyImportKeyMap merges multiple sources into notes', () => {
    const out = applyImportKeyMap(
      { body: 'Main body', favorite: 'false', archived: 'true', x: 'y' },
      { body: 'notes', favorite: 'notes', archived: 'notes', x: 'notes' },
    );
    expect(out['notes']).toContain('Main body');
    expect(out['notes']).toContain('archived=true');
    expect(out['notes']).toContain('favorite=false');
    expect(out['notes']).toContain('x=y');
  });

  it('buildSuggestedKeyMap suggests website fields from exporter-style keys', () => {
    const m = buildSuggestedKeyMap('credential:website', ['login_uri', 'user', 'pass', 'unknown']);
    expect(m['login_uri']).toBe('url');
    expect(m['user']).toBe('username');
    expect(m['pass']).toBe('password');
    expect(m['unknown']).toBe('notes');
    expect(new Set(Object.values(m)).size).toBe(4);
  });

  it('mergeImportSampleRawsForSuggestion prefers first non-empty per column across rows', () => {
    const merged = mergeImportSampleRawsForSuggestion([
      { url: '', username: 'first' },
      { url: 'https://filled.test', username: 'second' },
    ]) as Record<string, unknown>;
    expect(merged['url']).toBe('https://filled.test');
    expect(merged['username']).toBe('first');
  });

  it('buildSuggestedKeyMap with merged sample maps url to url when only an earlier row had blank url', () => {
    const merged = mergeImportSampleRawsForSuggestion([
      { password: 'p', url: '', username: 'u' },
      { password: 'p', url: 'https://later.test', username: 'u' },
    ]);
    const keys = extractImportSourceKeys(merged);
    const m = buildSuggestedKeyMap('credential:website', keys, merged);
    expect(m['url']).toBe('url');
    expect(m['password']).toBe('password');
    expect(m['username']).toBe('username');
  });

  it('buildSuggestedKeyMap keeps Url column on url when merged sample has no url (per-row cells may still have values)', () => {
    const merged = { title: 'A', url: '', username: 'u', password: 'p' };
    const m = buildSuggestedKeyMap('credential:website', ['title', 'url', 'username', 'password'], merged);
    expect(m['url']).toBe('url');
    expect(m['username']).toBe('username');
    expect(m['password']).toBe('password');
    expect(m['title']).toBe('name');
  });

  it('buildSuggestedKeyMap prioritizes login fields for 1Password-style rows and sends metadata to notes', () => {
    const raw = {
      archived: 'false',
      favorite: 'false',
      notes: '',
      otpauth: '',
      password: 'secret',
      tags: '',
      title: 'HMRC',
      url: 'https://example.test',
      username: 'u1',
    };
    const keys = Object.keys(raw).sort((a, b) => a.localeCompare(b));
    const m = buildSuggestedKeyMap('credential:website', keys, raw);
    expect(m['password']).toBe('password');
    expect(m['username']).toBe('username');
    expect(m['url']).toBe('url');
    expect(m['title']).toBe('name');
    expect(m['tags']).toBe('tags');
    expect(m['archived']).toBe('notes');
    expect(m['favorite']).toBe('notes');
    expect(m['otpauth']).toBe('notes');
    expect(m['notes']).toBe('notes');
  });

  it('buildSuggestedKeyMap assigns distinct vault fields when several keys suggest the same primary', () => {
    const m = buildSuggestedKeyMap('credential:website', ['password', 'secret', 'url']);
    expect(new Set(Object.values(m)).size).toBe(3);
    expect(m['password']).toBe('password');
    expect(m['url']).toBe('url');
    expect(m['secret']).not.toBe('password');
  });

  it('buildSuggestedKeyMap assigns distinct fields for api_key and secret-style keys', () => {
    const m = buildSuggestedKeyMap('credential:api-key', ['api_key', 'secret_key', 'service']);
    expect(new Set(Object.values(m)).size).toBe(3);
    expect(m['api_key']).toBe('key');
    expect(m['secret_key']).toBe('client_secret');
    expect(m['service']).toBe('service');
  });

  it('importMappingGroupId is stable for key order', () => {
    const a = importMappingGroupId({ b: 1, a: 2 }, 'credential:website');
    const b = importMappingGroupId({ a: 2, b: 1 }, 'credential:website');
    expect(a).toBe(b);
  });

  it('buildImportMappingGroups merges rows with same shape and type', () => {
    const items: ImportPreviewItem[] = [
      {
        index: 0,
        title: 'A',
        payloadKind: 'object',
        snippet: '',
        fields: [],
        raw: { url: 'https://a', user: 'u' },
      },
      {
        index: 1,
        title: 'B',
        payloadKind: 'object',
        snippet: '',
        fields: [],
        raw: { user: 'v', url: 'https://b' },
      },
    ];
    const groups = buildImportMappingGroups(items, () => 'credential:website');
    expect(groups.length).toBe(1);
    expect(groups[0].rowCount).toBe(2);
    expect(groups[0].sourceKeys).toEqual(['url', 'user']);
  });

  it('suggestImportTargetForSourceKey matches generic credential title', () => {
    expect(suggestImportTargetForSourceKey('label', 'credential:generic')).toBe('title');
  });

  it('maps login_name to username (not title) for generic', () => {
    expect(suggestImportTargetForSourceKey('login_name', 'credential:generic')).toBe('username');
  });

  it('maps ftp host and password fields for generic (task.md)', () => {
    expect(suggestImportTargetForSourceKey('ftp_host', 'credential:generic')).toBe('host');
    expect(suggestImportTargetForSourceKey('ftp_password', 'credential:generic')).toBe('password');
    expect(suggestImportTargetForSourceKey('ftp_user', 'credential:generic')).toBe('username');
    expect(suggestImportTargetForSourceKey('id', 'credential:generic')).toBe('external_reference');
  });

  it('buildSuggestedKeyMap routes second secret to tags when password is taken', () => {
    const m = buildSuggestedKeyMap('credential:generic', ['password_hash', 'shared_secret', 'username', 'userRef']);
    expect(m['password_hash']).toBe('password');
    expect(m['shared_secret']).toBe('tags');
    expect(m['username']).toBe('username');
    expect(m['userRef']).toBe('notes');
  });

  it('maps exporter-style keys from mixed JSON (task.md style)', () => {
    expect(suggestImportTargetForSourceKey('github_token', 'credential:api-key')).toBe('key');
    expect(suggestImportTargetForSourceKey('user', 'credential:api-key')).toBe('key_label');
    expect(suggestImportTargetForSourceKey('uuid', 'credential:api-key')).toBe('tags');
    expect(suggestImportTargetForSourceKey('db_password', 'credential:website')).toBe('password');
    expect(suggestImportTargetForSourceKey('mongodb_uri', 'credential:website')).toBe('url');
    expect(suggestImportTargetForSourceKey('webhook_secret', 'credential:generic')).toBe('password');
    expect(suggestImportTargetForSourceKey('fingerprint', 'credential:website')).toBe('notes');
    expect(suggestImportTargetForSourceKey('connection_string', 'credential:website')).toBe('url');
    expect(suggestImportTargetForSourceKey('login_username', 'credential:ssh')).toBe('username');
    expect(suggestImportTargetForSourceKey('stripe_webhook_secret', 'credential:generic')).toBe('password');
    expect(suggestImportTargetForSourceKey('vault_item_id', 'credential:generic')).toBe('tags');
  });

  it('every top-level key from task.md demo corpus maps to a valid field for common import types', () => {
    /** Keep in sync with unique key count in repo `task.md` when that fixture changes. */
    expect(TASK_DEMO_TOP_LEVEL_KEYS.length).toBe(141);
    const itemTypes = ['credential:generic', 'credential:website', 'credential:api-key', 'credential:ssh'] as const;
    for (const k of TASK_DEMO_TOP_LEVEL_KEYS) {
      for (const itemType of itemTypes) {
        const suggested = suggestImportTargetForSourceKey(k, itemType);
        const allowed = getImportFieldSelectOptions(itemType).map((o) => o.value);
        expect(allowed, `${itemType}: ${k} -> ${suggested}`).toContain(suggested);
      }
    }
  });
});
