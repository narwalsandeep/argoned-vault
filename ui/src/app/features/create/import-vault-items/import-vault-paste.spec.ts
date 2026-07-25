import { describe, expect, it } from 'vitest';

import { buildImportPastePreview } from './import-vault-paste';

describe('import-vault-paste', () => {
  it('routes JSON starting with [ to JSON parser', () => {
    const r = buildImportPastePreview('[{"title":"Z"}]');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.items[0].title).toBe('Z');
  });

  it('routes CSV starting with letter to CSV parser', () => {
    const r = buildImportPastePreview('Title,Password\nX,y\n');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.items[0].title).toBe('X');
  });

  it('strips BOM before sniffing', () => {
    const r = buildImportPastePreview('\uFEFFTitle,Password\nX,y\n');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.items[0].title).toBe('X');
  });
});
