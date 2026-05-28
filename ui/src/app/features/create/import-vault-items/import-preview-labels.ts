import { IMPORT_CATEGORY_OPTIONS, type ImportConfidence } from './import-classifier';

/** Title case for the review step (e.g. “Mapping confidence: High”). */
export function formatMappingConfidenceLabel(confidence: ImportConfidence | undefined): string {
  switch (confidence) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return '—';
  }
}

/** Human label for API `item_type` using import category options. */
export function formatVaultTypeLabel(itemType: string): string {
  const hit = IMPORT_CATEGORY_OPTIONS.find((o) => o.value === itemType);
  return hit?.label ?? itemType;
}
