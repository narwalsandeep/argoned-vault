import { describe, expect, it } from 'vitest';

import { VaultFieldShareCryptoService } from './vault-field-share-crypto.service';
import { SHARE_MAX_PAYLOAD_BYTES } from './vault-field-share.constants';

describe('VaultFieldShareCryptoService', () => {
  const service = new VaultFieldShareCryptoService();

  it('generates valid 128-bit access code format', () => {
    const code = service.generateAccessCode();
    expect(service.isValidAccessCodeFormat(code)).toBe(true);
  });

  it('encrypts and decrypts roundtrip', async () => {
    const accessCode = service.generateAccessCode();
    const shareId = 'a'.repeat(32);
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    const payload = {
      v: 1,
      field_key: 'password',
      field_label: 'Password',
      item_type: 'credential:website',
      value: 'hunter2',
    };

    const blob = await service.encryptFieldShare(accessCode, shareId, expiresAt, payload);
    const out = await service.decryptFieldShare(accessCode, shareId, {
      ...blob,
      kdf_algo: 'argon2id',
      kdf_params: { timeCost: 3, memoryKiB: 65536, parallelism: 1 },
      expires_at: expiresAt,
    });

    expect(out.value).toBe('hunter2');
  });

  it('rejects wrong access code on decrypt', async () => {
    const accessCode = service.generateAccessCode();
    const shareId = 'b'.repeat(32);
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    const blob = await service.encryptFieldShare(accessCode, shareId, expiresAt, {
      v: 1,
      field_key: 'secret',
      field_label: 'Secret',
      item_type: 'secret',
      value: 'x',
    });

    await expect(
      service.decryptFieldShare('WRONG-WRONG-WRONG-WRNG', shareId, {
        ...blob,
        kdf_algo: 'argon2id',
        kdf_params: { timeCost: 3, memoryKiB: 65536, parallelism: 1 },
        expires_at: expiresAt,
      }),
    ).rejects.toThrow(/Incorrect access code/);
  });

  it('rejects oversized payload', async () => {
    const big = 'x'.repeat(SHARE_MAX_PAYLOAD_BYTES + 1);
    await expect(
      service.encryptFieldShare(service.generateAccessCode(), 'c'.repeat(32), new Date().toISOString(), {
        v: 1,
        field_key: 'secret',
        field_label: 'Secret',
        item_type: 'secret',
        value: big,
      }),
    ).rejects.toThrow(/too large/);
  });
});
