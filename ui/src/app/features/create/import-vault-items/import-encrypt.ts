import type { VaultItemPayload } from '../../../core/vault/vault.service';
import { WebCryptoService } from '../../../core/vault/web-crypto.service';

/**
 * Encrypt one normalized import row using the same rules as manual create forms.
 */
export async function encryptImportRow(
  crypto: WebCryptoService,
  record: Record<string, unknown>,
  itemType: string,
): Promise<VaultItemPayload> {
  if (itemType === 'credential' || itemType.startsWith('credential:')) {
    const subtype = itemType.startsWith('credential:') ? itemType.slice('credential:'.length) : null;
    return crypto.encryptCredentialItem(record, subtype);
  }
  return crypto.encryptVaultItem(record, itemType);
}
