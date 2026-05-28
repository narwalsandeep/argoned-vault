import { buildImportCsvPreview } from './import-vault-csv';
import { buildImportJsonPreview, type ImportJsonResult } from './import-vault-json';

/**
 * Accept JSON (array / wrapper object / plain object split) or CSV (first non-whitespace char not `{` `[`).
 * JSON is tried when the trimmed paste starts with `{` or `[` after optional BOM strip.
 */
export function buildImportPastePreview(text: string): ImportJsonResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return { ok: false, code: 'empty', message: 'Paste JSON or CSV first.' };
  }
  const first = trimmed[0]!;
  if (first === '{' || first === '[') {
    return buildImportJsonPreview(text);
  }
  return buildImportCsvPreview(text);
}
