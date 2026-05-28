import { vaultItemListLabel } from './vault-item-display';

export interface VaultItemListEntry {
  id: string;
  /** Per-user vault item number from the server; omit on legacy API responses. */
  display_number?: number;
  item_type: string;
  crypto_version: number;
  /** Plaintext server field for search; may be null. */
  searchable_words: string | null;
}

export interface VaultListSearchOptions {
  /** When true, the whole text query (non-`#` segments, joined with spaces) must appear as a substring in `searchable_words`. */
  fullWord?: boolean;
  /** When true, `searchable_words` matching is case-sensitive (metadata stays case-insensitive). */
  caseSensitive?: boolean;
}

/**
 * Splits vault list search input on whitespace, commas, and similar separators; ignores empties.
 * Segments keep their original casing (used for case-sensitive searchable matching).
 */
export function tokenizeVaultListSearchQuery(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed
    .split(/[\s,;/|]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Splits search input into free-text tokens and `#123` display-number tokens (exact match on {@link VaultItemListEntry.display_number}).
 */
export function parseVaultListSearchTokens(raw: string): { textTokens: string[]; displayNumbers: number[] } {
  const split = tokenizeVaultListSearchQuery(raw);
  const textTokens: string[] = [];
  const displayNumbers: number[] = [];
  for (const t of split) {
    const m = /^#(\d+)$/.exec(t);
    if (m) {
      displayNumbers.push(Number.parseInt(m[1], 10));
    } else {
      textTokens.push(t);
    }
  }
  return { textTokens, displayNumbers };
}

function searchableWordsMatch(
  sw: string,
  textTokens: string[],
  fullWord: boolean,
  caseSensitive: boolean,
): boolean {
  if (sw.length === 0) {
    return false;
  }
  if (fullWord) {
    const phrase = textTokens.join(' ');
    if (phrase.length === 0) {
      return false;
    }
    if (caseSensitive) {
      return sw.includes(phrase);
    }
    return sw.toLowerCase().includes(phrase.toLowerCase());
  }
  for (const token of textTokens) {
    if (caseSensitive) {
      if (sw.includes(token)) {
        return true;
      }
    } else if (sw.toLowerCase().includes(token.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * True when the entry matches the search query (text + optional `#` display numbers).
 * Metadata (`item_type`, `id`, human label) is always matched case-insensitively.
 * `searchable_words` uses {@link VaultListSearchOptions} when provided.
 */
export function vaultListEntryMatchesSearchTokens(
  entry: VaultItemListEntry,
  rawQuery: string,
  options?: VaultListSearchOptions,
): boolean {
  const fullWord = options?.fullWord === true;
  const caseSensitive = options?.caseSensitive === true;

  const { textTokens, displayNumbers } = parseVaultListSearchTokens(rawQuery);
  if (textTokens.length === 0 && displayNumbers.length === 0) {
    return true;
  }
  if (displayNumbers.length > 0) {
    const num = entry.display_number;
    if (num === undefined || !displayNumbers.includes(num)) {
      return false;
    }
  }
  if (textTokens.length === 0) {
    return true;
  }
  const label = vaultItemListLabel(entry.item_type).toLowerCase();
  const metaHaystack = `${entry.item_type.toLowerCase()} ${entry.id.toLowerCase()} ${label}`;
  for (const token of textTokens) {
    if (metaHaystack.includes(token.toLowerCase())) {
      return true;
    }
  }
  const sw = entry.searchable_words ?? '';
  return searchableWordsMatch(sw, textTokens, fullWord, caseSensitive);
}
