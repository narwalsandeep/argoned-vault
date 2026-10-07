import { describe, expect, it } from 'vitest';

import { formatMappingConfidenceLabel, formatVaultTypeLabel } from './import-preview-labels';

describe('import-preview-labels', () => {
  it('formatMappingConfidenceLabel title-cases known values', () => {
    expect(formatMappingConfidenceLabel('high')).toBe('High');
    expect(formatMappingConfidenceLabel('medium')).toBe('Medium');
    expect(formatMappingConfidenceLabel('low')).toBe('Low');
    expect(formatMappingConfidenceLabel(undefined)).toBe('—');
  });

  it('formatVaultTypeLabel uses category option labels', () => {
    expect(formatVaultTypeLabel('credential:website')).toBe('Credential — website');
    expect(formatVaultTypeLabel('credential:api-key')).toBe('Credential — API key');
  });

  it('formatVaultTypeLabel falls back to raw item_type', () => {
    expect(formatVaultTypeLabel('unknown:type')).toBe('unknown:type');
  });
});
