import { normalizeImportRow, validateNormalizedRecord } from './import-normalize';

/**
 * One row that blocked an all-or-nothing import (validation or encryption).
 */
export interface ImportBlockingIssue {
  readonly rowIndex: number;
  /** 1-based row number for user-facing copy. */
  readonly rowNumber: number;
  readonly title: string;
  readonly messages: readonly string[];
  readonly kind: 'validation' | 'encrypt';
}

/** Normalize + validate messages often repeat the same constraint (e.g. URL required). */
export function dedupeImportValidationMessages(messages: readonly string[]): string[] {
  const out: string[] = [];
  const seenExact = new Set<string>();
  let keptWebsiteUrl = false;

  for (const raw of messages) {
    const t = raw.trim();
    if (t.length === 0) {
      continue;
    }
    const lower = t.toLowerCase();
    if (seenExact.has(lower)) {
      continue;
    }
    if (/website credential needs.*url/i.test(t)) {
      if (keptWebsiteUrl) {
        continue;
      }
      keptWebsiteUrl = true;
      const preferred =
        t.includes('map or fix') || t.includes('map or fix JSON')
          ? t
          : 'Website credential needs a URL (map columns or fix the source row).';
      out.push(preferred);
      seenExact.add(preferred.toLowerCase());
      continue;
    }
    seenExact.add(lower);
    out.push(t);
  }
  return out;
}

export function collectImportRowValidationMessages(
  raw: unknown,
  itemType: string,
  normalizeOptions: { titleFallback: string; keyMap?: Record<string, string> },
): string[] {
  const { record, errors } = normalizeImportRow(raw, itemType, normalizeOptions);
  const verr = validateNormalizedRecord(record, itemType);
  return dedupeImportValidationMessages([...errors, ...verr]);
}

export function buildImportBlockingIssuesFromValidation(
  rows: readonly { index: number; title: string; raw: unknown }[],
  effectiveItemType: (index: number) => string,
  normalizeOptionsForRow: (index: number, titleFallback: string) => { titleFallback: string; keyMap?: Record<string, string> },
): ImportBlockingIssue[] {
  const issues: ImportBlockingIssue[] = [];
  for (const row of rows) {
    const itemType = effectiveItemType(row.index);
    const messages = collectImportRowValidationMessages(
      row.raw,
      itemType,
      normalizeOptionsForRow(row.index, row.title),
    );
    if (messages.length > 0) {
      issues.push({
        rowIndex: row.index,
        rowNumber: row.index + 1,
        title: row.title,
        messages,
        kind: 'validation',
      });
    }
  }
  return issues.sort((a, b) => a.rowIndex - b.rowIndex);
}
