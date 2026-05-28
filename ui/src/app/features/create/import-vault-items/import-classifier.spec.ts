import { describe, expect, it } from 'vitest';

import { classifyImportRow } from './import-classifier';

describe('import-classifier', () => {
  it('detects website credential from keys', () => {
    const r = classifyImportRow({ url: 'https://a.test', username: 'u', password: 'p' });
    expect(r.suggestedItemType).toBe('credential:website');
    expect(r.confidence).toBe('high');
  });

  it('detects key material from PEM substring', () => {
    const r = classifyImportRow({ material: '-----BEGIN PRIVATE KEY-----\nabc' });
    expect(r.suggestedItemType).toBe('key');
  });

  it('sees nested access keys for API classification', () => {
    const r = classifyImportRow({ service: 'x', access: { key: 'a', secret: 'b' } });
    expect(r.suggestedItemType).toBe('credential:api-key');
  });

  it('classifies db_details as database', () => {
    const r = classifyImportRow({
      id: 40,
      db_details: { server: 'sql40.example.test', user: 'u', password: 'p', database: 'd' },
    });
    expect(r.suggestedItemType).toBe('credential:database');
  });

  it('classifies cloud access + secret pair as API key (task.md-style)', () => {
    const r = classifyImportRow({
      cloud_access_key: 'CLOUDACCESS018',
      cloud_secret_key: 'CLOUDSECRET018',
      id: 18,
      region: 'eu-west-2',
    });
    expect(r.suggestedItemType).toBe('credential:api-key');
    expect(r.confidence).toBe('high');
  });

  it('classifies api_key + secret as API key (high)', () => {
    const r = classifyImportRow({
      api_key: 'app_demo_key_002',
      secret: 'secret-demo-002',
      user: 'bob_dev',
      uuid: 'rec-0002',
    });
    expect(r.suggestedItemType).toBe('credential:api-key');
    expect(r.confidence).toBe('high');
  });

  it('classifies id/key/password/username as password vault item (high)', () => {
    const r = classifyImportRow({
      id: 1,
      key: 'key-demo-001',
      password: 'demoPass001!',
      username: 'alice01',
    });
    expect(r.suggestedItemType).toBe('password');
    expect(r.confidence).toBe('high');
  });

  it('classifies name + passcode + secret_key as password (medium)', () => {
    const r = classifyImportRow({
      account_id: 4,
      name: 'diana_admin',
      passcode: 'demo-code-004',
      secret_key: 'sec-demo-004',
    });
    expect(r.suggestedItemType).toBe('password');
    expect(r.confidence).toBe('medium');
  });

  it('classifies email + auth_token as email credential (high)', () => {
    const r = classifyImportRow({
      auth_token: 'auth-demo-006',
      credential_key: 'key-demo-006',
      email: 'frank@example.test',
      record_id: 6,
    });
    expect(r.suggestedItemType).toBe('credential:email');
    expect(r.confidence).toBe('high');
  });

  it('prefers SSH over password when host and private_key present (non-PEM value)', () => {
    const r = classifyImportRow({
      host: 'ssh.example.test',
      username: 'u',
      password: 'p',
      private_key: 'ssh-rsa AAAAB3NzaC1yc2E placeholder',
    });
    expect(r.suggestedItemType).toBe('credential:ssh');
  });
});
