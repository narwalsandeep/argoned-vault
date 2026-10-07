/**
 * Pure helpers for the Stats (dashboard) live tiles; easy to unit test without DOM.
 */

export interface VaultItemTypeRow {
  readonly item_type: string;
  readonly deleted_at: string | null;
}

export interface ItemTypeSummary {
  readonly activeCount: number;
  readonly distinctTypes: number;
  /** Highest count first, then type name. */
  readonly sortedEntries: ReadonlyArray<{ type: string; count: number }>;
}

export function summarizeVaultItemTypes(items: ReadonlyArray<VaultItemTypeRow>): ItemTypeSummary {
  const map = new Map<string, number>();
  for (const row of items) {
    if (row.deleted_at !== null) {
      continue;
    }
    const t = row.item_type || '(unknown)';
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  const sortedEntries = [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return {
    activeCount: sortedEntries.reduce((s, e) => s + e.count, 0),
    distinctTypes: sortedEntries.length,
    sortedEntries,
  };
}

function readPositiveInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return null;
  }
  const n = Math.floor(v);
  return n > 0 ? n : null;
}

/**
 * One-line Argon2 / KDF tuning for the profile row (matches server `kdf_params_json` keys).
 */
export function formatArgonProfileTune(
  kdfAlgo: string | undefined,
  kdfParams: Record<string, unknown> | undefined,
): string {
  if (!kdfAlgo?.trim() && !kdfParams) {
    return 'No profile';
  }
  const algo = (kdfAlgo ?? 'kdf').trim();
  const t = readPositiveInt(kdfParams?.['time_cost']);
  const memKib = readPositiveInt(kdfParams?.['memory_kib']);
  const p = readPositiveInt(kdfParams?.['parallelism']);
  const parts: string[] = [algo];
  if (t !== null) {
    parts.push(`t=${t}`);
  }
  if (memKib !== null) {
    parts.push(`m=${memKib} KiB`);
  }
  if (p !== null) {
    parts.push(`p=${p}`);
  }
  return parts.join(' · ');
}

/** Compact countdown for live dashboard tiles (e.g. `4:32`, `59s`). */
export function formatLiveCountdown(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }
  return `${sec}s`;
}

/** First 8 bytes of a base64 KDF salt as hex preview (dashboard profile tile). */
export function kdfSaltHexPreviewFromBase64(b64: string): string {
  try {
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const slice = raw.slice(0, 8);
    return (
      Array.from(slice)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('') + '…'
    );
  } catch {
    return 'N/A';
  }
}
