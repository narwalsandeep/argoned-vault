import { buildPreviewItemForRaw, type ImportJsonResult, type ImportPreviewItem } from './import-vault-json';

/** Hard cap so a pasted file cannot exhaust browser memory in one shot. */
export const IMPORT_CSV_MAX_DATA_ROWS = 10_000;

/**
 * RFC 4180-style CSV: comma delimiter, `"` wrapping, `""` escape, `\r\n` / `\n` / `\r` row breaks.
 * Fields may contain commas and newlines when quoted.
 */
export function parseCsvRows(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let quoteClosed = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const next = s[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
        quoteClosed = true;
      } else {
        field += c;
      }
    } else if (c === '"') {
      if (field !== '') {
        throw new Error('Unexpected quote in unquoted field.');
      }
      inQuotes = true;
      quoteClosed = false;
    } else if (c === ',') {
      row.push(field);
      field = '';
      quoteClosed = false;
    } else if (c === '\r' && next === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      quoteClosed = false;
      i++;
    } else if (c === '\n' || c === '\r') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      quoteClosed = false;
    } else if (quoteClosed) {
      if (c === ' ' || c === '\t') {
        continue;
      }
      throw new Error('Unexpected character after closing quote.');
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  if (inQuotes) {
    throw new Error('Unclosed double-quote in CSV.');
  }
  return rows;
}

function rowIsAllEmpty(cells: string[]): boolean {
  return cells.every((c) => c.trim() === '');
}

/** Header names → unique lowercase keys safe for JSON-like import maps. */
export function normalizeCsvHeaderKeys(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((raw, i) => {
    const t = raw.trim();
    const base = t === '' ? `column_${i + 1}` : t.toLowerCase();
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base}__${n}`;
  });
}

/**
 * Parse pasted CSV into the same {@link ImportPreviewItem} list as JSON import (one object per data row).
 * Row order is preserved; each row has exactly one value per header column (short rows padded).
 * Rows with extra non-empty columns are rejected to avoid silent column drift/data mismatch.
 */
export function buildImportCsvPreview(text: string): ImportJsonResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, code: 'empty', message: 'Paste JSON or CSV first.' };
  }
  let matrix: string[][];
  try {
    matrix = parseCsvRows(trimmed);
  } catch {
    return {
      ok: false,
      code: 'invalid_csv',
      message: 'Could not parse CSV (unclosed quote or invalid structure). Check quoting and try again.',
    };
  }

  while (matrix.length > 0 && rowIsAllEmpty(matrix[matrix.length - 1]!)) {
    matrix.pop();
  }
  if (matrix.length < 2) {
    return {
      ok: false,
      code: 'no_csv_rows',
      message: 'CSV needs a header row and at least one data row (empty trailing lines are ignored).',
    };
  }

  const headerCells = matrix[0]!.map((h) => h.trim());
  const width = headerCells.length;
  if (width === 0) {
    return { ok: false, code: 'invalid_csv', message: 'CSV header row has no columns.' };
  }

  const keys = normalizeCsvHeaderKeys(headerCells);
  const dataRowCount = matrix.length - 1;
  if (dataRowCount > IMPORT_CSV_MAX_DATA_ROWS) {
    return {
      ok: false,
      code: 'csv_too_many_rows',
      message: `This CSV has ${String(dataRowCount)} data rows; import supports at most ${String(IMPORT_CSV_MAX_DATA_ROWS)} per paste. Split the file and paste in batches.`,
    };
  }

  const items: ImportPreviewItem[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r]!;
    if (rowIsAllEmpty(cells)) {
      continue;
    }
    if (cells.length > width) {
      const overflow = cells.slice(width);
      if (overflow.some((c) => c.trim() !== '')) {
        return {
          ok: false,
          code: 'invalid_csv',
          message: `CSV row ${String(r + 1)} has more values than the header. Fix quoting for commas and try again.`,
        };
      }
    }
    const rec: Record<string, unknown> = {};
    for (let c = 0; c < width; c++) {
      const key = keys[c]!;
      rec[key] = c < cells.length ? cells[c]! : '';
    }
    items.push(buildPreviewItemForRaw(rec, items.length));
  }

  if (items.length === 0) {
    return {
      ok: false,
      code: 'no_csv_rows',
      message: 'CSV had no non-empty data rows after the header.',
    };
  }

  return { ok: true, items };
}
