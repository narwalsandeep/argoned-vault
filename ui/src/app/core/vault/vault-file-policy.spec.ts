import { describe, expect, it } from 'vitest';

import { mimeTypeForVaultUpload } from './vault-file-policy';

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
