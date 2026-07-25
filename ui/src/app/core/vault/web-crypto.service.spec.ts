import { describe, expect, it, vi } from 'vitest';

/** Real hash-wasm output is rejected by Vitest's Web Crypto; mock yields same-realm bytes and password-dependent keys. */
vi.mock('hash-wasm', () => ({
  argon2id: async (options: {
    password: string | Uint8Array;
    salt: string | Uint8Array;
    hashLength: number;
  }) => {
    const enc = new TextEncoder();
    const pwd = typeof options.password === 'string' ? enc.encode(options.password) : new Uint8Array(options.password);
    const salt =
      typeof options.salt === 'string' ? enc.encode(options.salt) : new Uint8Array(options.salt);
    const combined = new Uint8Array(pwd.length + salt.length);
    combined.set(pwd, 0);
    combined.set(salt, pwd.length);
    const digest = await crypto.subtle.digest('SHA-512', combined);
    return new Uint8Array(digest).slice(0, options.hashLength);
  },
}));

import { VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES, VAULT_UNLOCK_SECRET_MIN_LENGTH } from './vault-unlock-policy';
import { WebCryptoService } from './web-crypto.service';

function tamperBase64(input: string): string {
  const raw = Uint8Array.from(atob(input), (char) => char.charCodeAt(0));
  if (raw.length === 0) {
    return input;
  }
  raw[raw.length - 1] ^= 0x01;
  let binary = '';
  for (const byte of raw) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

describe('WebCryptoService', () => {
  it('exposes default idle auto-lock via getAutoLockTimeoutMs', () => {
    const cryptoService = new WebCryptoService();
    expect(cryptoService.getAutoLockTimeoutMs()).toBe(VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES * 60 * 1000);
  });

  it('tracks auto-lock deadline after bootstrap profile and clears it with clearVaultKey', async () => {
    const cryptoService = new WebCryptoService();
    await cryptoService.bootstrapVaultProfile('123456789012', { timeCost: 2, memoryKiB: 65536, parallelism: 1 });
    const d = cryptoService.getAutoLockDeadlineEpochMs();
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(Date.now());
    expect(d!).toBeLessThanOrEqual(Date.now() + cryptoService.getAutoLockTimeoutMs() + 100);
    cryptoService.clearVaultKey();
    expect(cryptoService.getAutoLockDeadlineEpochMs()).toBeNull();
  });

  it('applyIdleAutoLockPresetMinutes sets timeout for allowed presets', () => {
    const cryptoService = new WebCryptoService();
    cryptoService.applyIdleAutoLockPresetMinutes(32);
    expect(cryptoService.getAutoLockTimeoutMs()).toBe(32 * 60 * 1000);
  });

  it('applyIdleAutoLockPresetMinutes rejects non-preset minutes', () => {
    const cryptoService = new WebCryptoService();
    expect(() => cryptoService.applyIdleAutoLockPresetMinutes(99)).toThrow(/Invalid idle auto-lock preset/);
  });

  it('rejects bootstrap when unlock secret is shorter than bootstrap minimum', async () => {
    const cryptoService = new WebCryptoService();
    const short = 'a'.repeat(VAULT_UNLOCK_SECRET_MIN_LENGTH - 1);
    await expect(cryptoService.bootstrapVaultProfile(short, { timeCost: 2, memoryKiB: 65536, parallelism: 1 })).rejects.toThrow(
      /at least/,
    );
  });

  it('accepts bootstrap when unlock secret is exactly minimum length using only spaces', async () => {
    const cryptoService = new WebCryptoService();
    const secret = ' '.repeat(VAULT_UNLOCK_SECRET_MIN_LENGTH);
    const profile = await cryptoService.bootstrapVaultProfile(secret, { timeCost: 2, memoryKiB: 65536, parallelism: 1 });
    expect(profile.kdf_algo).toBe('argon2id');
  });

  it('rejects unlock when secret raw length is below minimum', async () => {
    const cryptoService = new WebCryptoService();
    const profile = await cryptoService.bootstrapVaultProfile('123456789012', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });
    cryptoService.clearVaultKey();
    await expect(cryptoService.unlockVaultFromProfile('12345678901', profile)).rejects.toThrow(/at least/);
  });

  it('rejects unlock with wrong secret', async () => {
    const cryptoService = new WebCryptoService();
    const profile = await cryptoService.bootstrapVaultProfile('correct secret value', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });
    expect(profile.kdf_algo).toBe('argon2id');
    cryptoService.clearVaultKey();

    await expect(cryptoService.unlockVaultFromProfile('wrong secret value', profile)).rejects.toThrow(
      /Could not unlock the vault/,
    );
  });

  it('rejects decryption when payload tag is tampered', async () => {
    const cryptoService = new WebCryptoService();
    await cryptoService.bootstrapVaultProfile('correct secret value', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });

    const payload = await cryptoService.encryptCredentialItem({
      username: 'alice',
      password: 'secret',
    });

    const tampered = {
      ...payload,
      payload_tag: tamperBase64(payload.payload_tag),
    };

    await expect(cryptoService.decryptItemPayload(tampered)).rejects.toBeTruthy();
  });

  it('can unlock with recovery artifact and decrypt existing item', async () => {
    const cryptoService = new WebCryptoService();
    await cryptoService.bootstrapVaultProfile('correct secret value', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });

    const payload = await cryptoService.encryptCredentialItem({
      username: 'alice',
      password: 'secret',
    });
    const artifact = await cryptoService.buildRecoveryArtifact('recovery secret value');
    cryptoService.clearVaultKey();

    await cryptoService.unlockFromRecoveryArtifact('recovery secret value', artifact);
    const decrypted = await cryptoService.decryptItemPayload(payload);
    expect(decrypted['username']).toBe('alice');
    expect(decrypted['password']).toBe('secret');
  });

  it('builds recovery artifact after profile unlock (non-extractable vault key)', async () => {
    const cryptoService = new WebCryptoService();
    const profile = await cryptoService.bootstrapVaultProfile('correct secret value', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });
    const payload = await cryptoService.encryptCredentialItem({
      username: 'bob',
      password: 'x',
    });
    cryptoService.clearVaultKey();
    await cryptoService.unlockVaultFromProfile('correct secret value', profile);

    const artifact = await cryptoService.buildRecoveryArtifact('recovery secret value');
    cryptoService.clearVaultKey();

    await cryptoService.unlockFromRecoveryArtifact('recovery secret value', artifact);
    const decrypted = await cryptoService.decryptItemPayload(payload);
    expect(decrypted['username']).toBe('bob');
  });

  it('does not store searchable_words inside the encrypted JSON payload', async () => {
    const cryptoService = new WebCryptoService();
    await cryptoService.bootstrapVaultProfile('correct secret value', {
      timeCost: 2,
      memoryKiB: 65536,
      parallelism: 1,
    });
    const payload = await cryptoService.encryptVaultItem(
      {
        name: 'Site',
        url: 'https://example.test',
        username: '',
        password: '',
        notes: '',
        searchable_words: 'plaintext hint only',
      },
      'credential:website',
    );
    const decrypted = await cryptoService.decryptItemPayload(payload);
    expect(decrypted['searchable_words']).toBeUndefined();
    expect(decrypted['name']).toBe('Site');
  });
});
