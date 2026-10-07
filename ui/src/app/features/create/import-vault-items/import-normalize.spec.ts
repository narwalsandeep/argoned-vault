import { describe, expect, it } from 'vitest';

import { normalizeImportRow, validateNormalizedRecord } from './import-normalize';

describe('import-normalize', () => {
  it('merges nested access object so OAuth-style key + secret map to app id and client secret', () => {
    const { record, errors } = normalizeImportRow(
      { service: 'payments-api', access: { key: 'client-id', secret: 'client-secret-value' } },
      'credential:api-key',
      { titleFallback: 'T' },
    );
    expect(errors).toEqual([]);
    expect(record['service']).toBe('payments-api');
    expect(record['oauth_client_id']).toBe('client-id');
    expect(record['client_secret']).toBe('client-secret-value');
    expect(record['key']).toBe('');
    expect(validateNormalizedRecord(record, 'credential:api-key')).toEqual([]);
  });

  it('maps website credential fields', () => {
    const { record, errors } = normalizeImportRow(
      { login_uri: 'https://x.test', user: 'me', pass: 's' },
      'credential:website',
      { titleFallback: 'T' },
    );
    expect(errors).toEqual([]);
    expect(record['url']).toBe('https://x.test');
    expect(record['username']).toBe('me');
    expect(record['password']).toBe('s');
    const verr = validateNormalizedRecord(record, 'credential:website');
    expect(verr).toEqual([]);
  });

  it('infers website URL from title when Url column is empty (1Password-style CSV)', () => {
    const fullUrlTitle = normalizeImportRow(
      { title: 'https://www.example.com/path', username: 'u', password: 'p' },
      'credential:website',
      { titleFallback: 'ignored' },
    );
    expect(fullUrlTitle.errors).toEqual([]);
    expect(fullUrlTitle.record['url']).toBe('https://www.example.com/path');
    expect(fullUrlTitle.record['name']).toBe('https://www.example.com/path');

    const urlThenNote = normalizeImportRow(
      { title: 'https://accounts.intuit.com/ quickbooks', username: 'u', password: 'p' },
      'credential:website',
      {},
    );
    expect(urlThenNote.errors).toEqual([]);
    expect(urlThenNote.record['url']).toBe('https://accounts.intuit.com/');

    const bareHost = normalizeImportRow(
      { title: 'devportal.portara.io', username: 'u', password: 'p' },
      'credential:website',
      {},
    );
    expect(bareHost.errors).toEqual([]);
    expect(bareHost.record['url']).toBe('https://devportal.portara.io');

    const noUrl = normalizeImportRow({ title: 'HMRC Self Assessment', username: 'u', password: 'p' }, 'credential:website', {});
    expect(noUrl.errors).toEqual([]);
    expect(noUrl.record['url']).toBe('');
    expect(validateNormalizedRecord(noUrl.record, 'credential:website')).toEqual([]);
  });

  it('maps password item', () => {
    const { record } = normalizeImportRow({ title: 'x', password: 'y' }, 'password', {});
    expect(record['title']).toBe('x');
    expect(record['password']).toBe('y');
  });

  it('maps website optional fields from JSON', () => {
    const { record, errors } = normalizeImportRow(
      {
        login_uri: 'https://x.test',
        user: 'me',
        pass: 's',
        tags: 'a,b',
        category: 'Work',
        alternative_url: 'https://app.x.test',
      },
      'credential:website',
      { titleFallback: 'T' },
    );
    expect(errors).toEqual([]);
    expect(record['tags']).toBe('a,b');
    expect(record['category']).toBe('Work');
    expect(record['alternative_url']).toBe('https://app.x.test');
  });

  it('maps credential:database and credential:license', () => {
    const db = normalizeImportRow(
      {
        connection_name: 'Prod',
        db_host: 'db.internal',
        db_port: '5432',
        db_name: 'app',
        db_user: 'u',
        db_password: 'p',
        connection_string: 'postgres://u:p@db.internal/app',
        ssl_mode: 'require',
        tags: 'prod',
      },
      'credential:database',
      { titleFallback: 'F' },
    );
    expect(db.errors).toEqual([]);
    expect(db.record['name']).toBe('Prod');
    expect(db.record['host']).toBe('db.internal');
    expect(db.record['connection_string']).toContain('postgres://');
    expect(db.record['ssl_mode']).toBe('require');

    const lic = normalizeImportRow(
      {
        product: 'IDE',
        vendor: 'JetBrains',
        license_key: 'XXXX-YYYY',
        assigned_to: 'Team A',
        expires: '2027-01-01',
        tags: 'dev',
      },
      'credential:license',
      {},
    );
    expect(lic.errors).toEqual([]);
    expect(lic.record['product']).toBe('IDE');
    expect(lic.record['vendor']).toBe('JetBrains');
    expect(lic.record['license_key']).toBe('XXXX-YYYY');
    expect(lic.record['assigned_to']).toBe('Team A');
    expect(lic.record['expires']).toBe('2027-01-01');
  });

  it('maps password and key simple items with extended fields', () => {
    const pw = normalizeImportRow(
      { title: 'x', password: 'y', url: 'https://z.test', username: 'u', tags: 't1' },
      'password',
      {},
    );
    expect(pw.record['url']).toBe('https://z.test');
    expect(pw.record['username']).toBe('u');
    expect(pw.record['tags']).toBe('t1');

    const key = normalizeImportRow(
      {
        title: 'k1',
        format: 'PEM',
        public_key: '-----BEGIN',
        fingerprint: 'SHA256:abc',
        private_key: '-----BEGIN PRIVATE',
        tags: 'ssh',
      },
      'key',
      {},
    );
    expect(key.record['public_key']).toBe('-----BEGIN');
    expect(key.record['fingerprint']).toBe('SHA256:abc');
    expect(key.record['material']).toContain('PRIVATE');
  });

  it('applies explicit keyMap before built-in aliases', () => {
    const keyMap: Record<string, string> = {
      custom_url: 'url',
      custom_user: 'username',
      custom_secret: 'password',
      noise: 'notes',
    };
    const { record, errors } = normalizeImportRow(
      { custom_url: 'https://z.test', custom_user: 'me', custom_secret: 's', noise: 'x' },
      'credential:website',
      { titleFallback: 'T', keyMap },
    );
    expect(errors).toEqual([]);
    expect(record['url']).toBe('https://z.test');
    expect(record['username']).toBe('me');
    expect(record['password']).toBe('s');
    expect(record['notes']).toBe('noise=x');
    expect(record['name']).toBe('T');
  });

  it('rejects keyMap when two sources map to the same vault field', () => {
    const keyMap: Record<string, string> = {
      a: 'url',
      b: 'url',
    };
    const { errors } = normalizeImportRow(
      { a: 'https://a.test', b: 'https://b.test', name: 'X' },
      'credential:website',
      { titleFallback: 'T', keyMap },
    );
    expect(errors.some((e) => e.includes('Field map assigns'))).toBe(true);
  });
});
