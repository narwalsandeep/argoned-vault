import { describe, expect, it } from 'vitest';

import { isSafeAppInternalPath } from './app-return-path';

describe('isSafeAppInternalPath', () => {
  it('accepts simple and query paths', () => {
    expect(isSafeAppInternalPath('/new')).toBe(true);
    expect(isSafeAppInternalPath('/new/item/file')).toBe(true);
    expect(isSafeAppInternalPath('/vault/items?x=1')).toBe(true);
  });

  it('rejects protocol-relative and external-like values', () => {
    expect(isSafeAppInternalPath('//evil.test/path')).toBe(false);
    expect(isSafeAppInternalPath('https://evil.test')).toBe(false);
    expect(isSafeAppInternalPath('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty and overlong', () => {
    expect(isSafeAppInternalPath('')).toBe(false);
    expect(isSafeAppInternalPath('a'.repeat(2049))).toBe(false);
  });
});
