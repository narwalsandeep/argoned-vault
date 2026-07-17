import { describe, expect, it } from 'vitest';

import { buildImportCsvPreview, normalizeCsvHeaderKeys, parseCsvRows } from './import-vault-csv';

describe('import-vault-csv', () => {
  it('parseCsvRows handles quoted commas and newlines', () => {
    const csv = 'a,b\n1,"hello, world",x\n';
    expect(parseCsvRows(csv)).toEqual([
      ['a', 'b'],
      ['1', 'hello, world', 'x'],
      [''],
    ]);
  });

  it('parseCsvRows escapes doubled quotes', () => {
    expect(parseCsvRows('k\n"a""b"')).toEqual([['k'], ['a"b']]);
  });

  it('normalizeCsvHeaderKeys lowercases and dedupes', () => {
    expect(normalizeCsvHeaderKeys(['Title', 'URL', 'title'])).toEqual(['title', 'url', 'title__2']);
  });

  it('buildImportCsvPreview maps 1Password-style header to row objects', () => {
    const csv = 'Title,Url,Username,Password\nAcme,https://a.test,u,p\n';
    const r = buildImportCsvPreview(csv);
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.items.length).toBe(1);
    expect(r.items[0].title).toBe('Acme');
    const raw = r.items[0].raw as Record<string, unknown>;
    expect(raw['title']).toBe('Acme');
    expect(raw['url']).toBe('https://a.test');
    expect(raw['username']).toBe('u');
    expect(raw['password']).toBe('p');
  });

  it('buildImportCsvPreview pads short rows and skips empty data rows', () => {
    const csv = 'a,b,c\n1,2\n\n3,4,5\n';
    const r = buildImportCsvPreview(csv);
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.items.length).toBe(2);
    expect((r.items[0].raw as Record<string, string>)['a']).toBe('1');
    expect((r.items[0].raw as Record<string, string>)['b']).toBe('2');
    expect((r.items[0].raw as Record<string, string>)['c']).toBe('');
    expect((r.items[1].raw as Record<string, string>)['c']).toBe('5');
  });

  it('buildImportCsvPreview rejects rows with extra non-empty columns', () => {
    const r = buildImportCsvPreview('a,b,c\n1,2,3,overflow\n');
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.code).toBe('invalid_csv');
    expect(r.message).toMatch(/more values than the header/i);
  });

  it('buildImportCsvPreview allows trailing empty overflow columns', () => {
    const r = buildImportCsvPreview('a,b,c\n1,2,3,\n');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect((r.items[0].raw as Record<string, string>)['c']).toBe('3');
  });

  it('buildImportCsvPreview rejects unclosed quote', () => {
    const r = buildImportCsvPreview('a,b\n"open');
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.code).toBe('invalid_csv');
  });

  it('buildImportCsvPreview rejects characters after closing quote', () => {
    const r = buildImportCsvPreview('a,b\n"x"oops,y\n');
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.code).toBe('invalid_csv');
  });
});
