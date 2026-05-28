import { describe, expect, it } from 'vitest';

import {
  buildImportBlockingIssuesFromValidation,
  collectImportRowValidationMessages,
  dedupeImportValidationMessages,
} from './import-validation-messages';

describe('import-validation-messages', () => {
  it('dedupeImportValidationMessages removes duplicate website URL lines', () => {
    expect(
      dedupeImportValidationMessages([
        'Website credential needs a URL (map or fix JSON).',
        'Website credential needs URL.',
        'Other error',
      ]),
    ).toEqual(['Website credential needs a URL (map or fix JSON).', 'Other error']);
  });

  it('dedupeImportValidationMessages keeps exact duplicates once', () => {
    expect(dedupeImportValidationMessages(['Same', 'Same', 'x'])).toEqual(['Same', 'x']);
  });

  it('collectImportRowValidationMessages is empty when import has no structural errors', () => {
    const msgs = collectImportRowValidationMessages(
      { title: 'No url here', username: 'u', password: 'p' },
      'credential:website',
      { titleFallback: 'No url here' },
    );
    expect(msgs).toEqual([]);
  });

  it('buildImportBlockingIssuesFromValidation lists only failing rows in order', () => {
    const rows = [
      { index: 0, title: 'A', raw: { a: 'https://a.test', b: 'https://b.test', name: 'X' } },
      { index: 1, title: 'B', raw: { a: 'https://x.test', b: 'https://y.test', name: 'Y' } },
      { index: 2, title: 'C', raw: { url: 'https://c.test', username: 'u', password: 'p' } },
    ];
    const badMap = { a: 'url', b: 'url' } as Record<string, string>;
    const issues = buildImportBlockingIssuesFromValidation(
      rows,
      () => 'credential:website',
      (i, t) => ({ titleFallback: t, ...(i <= 1 ? { keyMap: badMap } : {}) }),
    );
    expect(issues.length).toBe(2);
    expect(issues[0].rowNumber).toBe(1);
    expect(issues[1].rowNumber).toBe(2);
    expect(issues[0].kind).toBe('validation');
    expect(issues[0].messages.some((m) => m.includes('Field map assigns'))).toBe(true);
  });
});
