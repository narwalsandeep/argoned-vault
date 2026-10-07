import { describe, expect, it, vi } from 'vitest';

import { isLocalhostAppHost } from './is-localhost-app-host';

describe('isLocalhostAppHost', () => {
  it('returns false when window is undefined', () => {
    vi.stubGlobal('window', undefined as unknown as Window & typeof globalThis);
    expect(isLocalhostAppHost()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('returns true for localhost', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(isLocalhostAppHost()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('returns true for 127.0.0.1', () => {
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
    expect(isLocalhostAppHost()).toBe(true);
    vi.unstubAllGlobals();
  });
});
