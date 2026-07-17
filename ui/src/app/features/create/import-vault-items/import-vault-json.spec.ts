import { describe, expect, it } from 'vitest';

import { buildImportJsonPreview, buildPreviewFields, extractImportRawItems } from './import-vault-json';

describe('import-vault-json', () => {
  it('rejects invalid JSON', () => {
    const r = buildImportJsonPreview('{ not json');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('invalid_json');
    }
  });

  it('rejects empty paste', () => {
    const r = buildImportJsonPreview('   \n  ');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('empty');
      expect(r.message).toMatch(/paste/i);
    }
  });

  it('accepts root array and maps elements', () => {
    const r = buildImportJsonPreview('[{"title":"A"},{"name":"B"},3]');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.length).toBe(3);
      expect(r.items[0].raw).toEqual({ title: 'A' });
      expect(r.items[0].title).toBe('A');
      expect(r.items[0].fields).toEqual([
        { key: 'title', value: 'A' },
      ]);
      expect(r.items[1].title).toBe('B');
      expect(r.items[1].fields).toEqual([{ key: 'name', value: 'B' }]);
      expect(r.items[2].payloadKind).toBe('number');
      expect(r.items[2].fields).toEqual([{ key: 'value', value: '3' }]);
    }
  });

  it('uses items array on object root', () => {
    const r = buildImportJsonPreview('{"items":[1,2],"noise":true}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.length).toBe(2);
    }
  });

  it('uses vault_items when present', () => {
    const r = buildImportJsonPreview('{"vault_items":[{"title":"X"}]}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items.length).toBe(1);
      expect(r.items[0].title).toBe('X');
    }
  });

  it('splits plain object into keyed items', () => {
    const raw = extractImportRawItems({ a: 1, b: { c: 2 } });
    expect(raw).not.toBeNull();
    expect(raw!.length).toBe(2);
    const r = buildImportJsonPreview('{"a":1,"b":{"c":2}}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items[0].title).toBe('a');
      expect(r.items[0].fields).toEqual([{ key: 'value', value: '1' }]);
      expect(r.items[1].title).toBe('b');
      expect(r.items[1].fields).toEqual([{ key: 'c', value: '2' }]);
    }
  });

  it('buildPreviewFields lists array indices', () => {
    expect(buildPreviewFields([10, 20])).toEqual([
      { key: '[0]', value: '10' },
      { key: '[1]', value: '20' },
    ]);
  });

  it('buildPreviewFields keeps arbitrary object keys as rows (sorted keys)', () => {
    expect(buildPreviewFields({ url: 'https://x.test', n: 1 })).toEqual([
      { key: 'n', value: '1' },
      { key: 'url', value: 'https://x.test' },
    ]);
  });

  it('rejects empty array', () => {
    const r = buildImportJsonPreview('[]');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('no_items');
    }
  });
});
