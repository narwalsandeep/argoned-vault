/** One row in the step-2 preview (plain key : value for humans). */
export interface ImportPreviewField {
  key: string;
  value: string;
}

export interface ImportPreviewItem {
  index: number;
  title: string;
  payloadKind: string;
  /** Truncated JSON/raw fallback; prefer `fields` in the UI. */
  snippet: string;
  fields: ImportPreviewField[];
  /** Original parsed value for this row (classification + normalize + encrypt). */
  raw: unknown;
}

export type ImportJsonResult =
  | { ok: true; items: ImportPreviewItem[] }
  | {
      ok: false;
      code: 'invalid_json' | 'empty' | 'no_items' | 'invalid_csv' | 'no_csv_rows' | 'csv_too_many_rows';
      message: string;
    };

const SNIPPET_MAX = 320;
const FIELD_VALUE_MAX = 480;
const FIELD_ROWS_MAX = 80;

const COLLECTION_KEYS = ['items', 'vault_items', 'entries', 'records'] as const;

function truncateFieldText(s: string): string {
  if (s.length <= FIELD_VALUE_MAX) {
    return s;
  }
  return `${s.slice(0, FIELD_VALUE_MAX)}…`;
}

function formatLeafForField(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return truncateFieldText(snippetFrom(value));
}

/**
 * Flatten one raw import value into key : value rows for the preview list.
 * - Synthetic `{ __importKey, value }` from plain-object split → unwrap to `value`.
 * - Objects → one row per own key (`__importKey` omitted); nested values as JSON text.
 * - Arrays → `[0]`, `[1]`, …
 * - Scalars → single row `value : …`
 */
export function buildPreviewFields(value: unknown): ImportPreviewField[] {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    const hasImportMeta =
      keys.length === 2 &&
      keys.includes('__importKey') &&
      keys.includes('value') &&
      rec['value'] !== undefined;
    if (hasImportMeta) {
      return buildPreviewFields(rec['value']);
    }
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [{ key: 'value', value: formatLeafForField(value) }];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ key: '(array)', value: '[]' }];
    }
    const cap = Math.min(value.length, FIELD_ROWS_MAX);
    const rows: ImportPreviewField[] = [];
    for (let i = 0; i < cap; i++) {
      rows.push({ key: `[${i}]`, value: formatLeafForField(value[i]) });
    }
    if (value.length > FIELD_ROWS_MAX) {
      rows.push({
        key: '…',
        value: `${value.length - FIELD_ROWS_MAX} more element(s) not shown`,
      });
    }
    return rows;
  }

  const rec = value as Record<string, unknown>;
  const keyList = Object.keys(rec)
    .filter((k) => k !== '__importKey')
    .sort((a, b) => a.localeCompare(b));
  if (keyList.length === 0) {
    return [{ key: '(object)', value: '{}' }];
  }
  const cap = Math.min(keyList.length, FIELD_ROWS_MAX);
  const rows: ImportPreviewField[] = [];
  for (let i = 0; i < cap; i++) {
    const k = keyList[i];
    const v = rec[k];
    rows.push({ key: k, value: formatLeafForField(v) });
  }
  if (keyList.length > FIELD_ROWS_MAX) {
    rows.push({
      key: '…',
      value: `${keyList.length - FIELD_ROWS_MAX} more key(s) not shown`,
    });
  }
  return rows;
}

function snippetFrom(value: unknown): string {
  let s: string;
  if (typeof value === 'string') {
    s = value;
  } else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  if (s.length <= SNIPPET_MAX) {
    return s;
  }
  return `${s.slice(0, SNIPPET_MAX)}…`;
}

function readStringFieldCi(o: Record<string, unknown>, names: readonly string[]): string {
  const want = new Set(names.map((n) => n.toLowerCase()));
  for (const k of Object.keys(o)) {
    if (!want.has(k.toLowerCase())) {
      continue;
    }
    const v = o[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function inferTitle(value: unknown, index: number): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const key = o['__importKey'];
    if (typeof key === 'string' && key.trim()) {
      return key.trim();
    }
    const t = readStringFieldCi(o, ['title', 'name', 'label']);
    if (t) {
      return t;
    }
  }
  return `Item ${index + 1}`;
}

function payloadKind(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `array (${value.length})`;
  }
  const t = typeof value;
  if (t === 'object') {
    return 'object';
  }
  return t;
}

/**
 * Turn parsed JSON into a flat list of values that will each become one vault item later.
 * - Root array → each element is one item.
 * - Root object with a non-empty `items` / `vault_items` / `entries` / `records` array → those elements.
 * - Other non-empty objects → one item per top-level key (key preserved for the preview title).
 */
export function extractImportRawItems(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed.length > 0 ? parsed : null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  for (const key of COLLECTION_KEYS) {
    const v = o[key];
    if (Array.isArray(v) && v.length > 0) {
      return v;
    }
  }
  const keys = Object.keys(o);
  if (keys.length === 0) {
    return null;
  }
  return keys.map((key) => ({ __importKey: key, value: o[key] }));
}

/** One import row for preview + normalize (JSON object or CSV row as plain strings). */
export function buildPreviewItemForRaw(value: unknown, index: number): ImportPreviewItem {
  return {
    index,
    title: inferTitle(value, index),
    payloadKind: payloadKind(value),
    snippet: snippetFrom(value),
    fields: buildPreviewFields(value),
    raw: value,
  };
}

export function buildImportJsonPreview(text: string): ImportJsonResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, code: 'empty', message: 'Paste JSON or CSV first.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      code: 'invalid_json',
      message: 'This is not valid JSON. Fix the text and try again.',
    };
  }
  const raw = extractImportRawItems(parsed);
  if (!raw || raw.length === 0) {
    return {
      ok: false,
      code: 'no_items',
      message:
        'No importable items found. Use a JSON array, or an object with a non-empty "items" (or "vault_items" / "entries" / "records") array, or a plain object whose top-level keys each become one item.',
    };
  }
  const items: ImportPreviewItem[] = raw.map((value, index) => buildPreviewItemForRaw(value, index));
  return { ok: true, items };
}
