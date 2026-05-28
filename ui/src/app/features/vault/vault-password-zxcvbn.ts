/**
 * Lazy-loaded module: `@zxcvbn-ts` + dictionaries (~major bundle weight).
 * Import via `import('./vault-password-zxcvbn')` only after decrypt when scanning password fields.
 */

import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/** Scores 0–2 → weak label (typical meter bands). */
const ZXCVBN_WEAK_SCORE_MAX = 2;

let optionsApplied = false;

function ensureZxcvbnOptions(): void {
  if (optionsApplied) {
    return;
  }
  zxcvbnOptions.setOptions({
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    translations: zxcvbnEnPackage.translations,
  });
  optionsApplied = true;
}

/** Weak password per client-side zxcvbn score. Empty strings → false. */
export function isWeakVaultPassword(value: string): boolean {
  const t = value.trim();
  if (t.length === 0) {
    return false;
  }
  ensureZxcvbnOptions();
  const { score } = zxcvbn(t);
  return score <= ZXCVBN_WEAK_SCORE_MAX;
}
