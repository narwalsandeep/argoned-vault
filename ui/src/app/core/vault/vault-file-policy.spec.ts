import { describe, expect, it } from 'vitest';

import {
  VAULT_FILE_MAX_BYTES,
  VAULT_FILE_MAX_PER_VAULT_ITEM,
  mimeTypeForVaultUpload,
  vaultFileMaxSizeLabel,
} from './vault-file-policy';

describe('mimeTypeForVaultUpload', () => {
  it('uses browser MIME when present', () => {
    const f = new File([new Uint8Array([1])], 'x.bin', { type: 'application/pdf' });
    expect(mimeTypeForVaultUpload(f)).toBe('application/pdf');
  });

  it('infers MIME from extension when browser type is empty', () => {
    const f = new File([new Uint8Array([1])], 'report.PDF', { type: '' });
    expect(mimeTypeForVaultUpload(f)).toBe('application/pdf');
  });

  it('returns empty when no type and no known extension', () => {
    const f = new File([new Uint8Array([1])], 'noext', { type: '' });
    expect(mimeTypeForVaultUpload(f)).toBe('');
  });
});

describe('vault file limits', () => {
  it('caps each file vault item at 32 files', () => {
    expect(VAULT_FILE_MAX_PER_VAULT_ITEM).toBe(32);
  });

  it('caps each file at 16 MB', () => {
    expect(VAULT_FILE_MAX_BYTES).toBe(16 * 1024 * 1024);
    expect(vaultFileMaxSizeLabel()).toBe('16 MB');
  });
});
