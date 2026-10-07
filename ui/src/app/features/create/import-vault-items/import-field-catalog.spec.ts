import { describe, expect, it } from 'vitest';

import {
  coerceImportMapSelectValue,
  getImportFieldFallbackTarget,
  getImportFieldSelectOptions,
  getImportFieldTargetCount,
  sanitizeImportKeyMapValues,
} from './import-field-catalog';

describe('import-field-catalog', () => {
  it('coerceImportMapSelectValue keeps valid website targets', () => {
    expect(coerceImportMapSelectValue('credential:website', 'url')).toBe('url');
    expect(coerceImportMapSelectValue('credential:website', 'name')).toBe('name');
  });

  it('coerceImportMapSelectValue maps unknown targets to fallback', () => {
    expect(coerceImportMapSelectValue('credential:website', 'title')).toBe(getImportFieldFallbackTarget('credential:website'));
  });

  it('sanitizeImportKeyMapValues coerces each entry', () => {
    const fb = getImportFieldFallbackTarget('credential:website');
    const out = sanitizeImportKeyMapValues('credential:website', {
      a: 'url',
      b: 'not_a_field',
    });
    expect(out['a']).toBe('url');
    expect(out['b']).toBe(fb);
  });

  it('getImportFieldTargetCount matches select options length', () => {
    expect(getImportFieldTargetCount('credential:api-key')).toBe(
      getImportFieldSelectOptions('credential:api-key').length,
    );
  });
});
