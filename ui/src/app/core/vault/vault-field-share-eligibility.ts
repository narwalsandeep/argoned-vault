import { vaultFieldKeyLooksLikePassword } from '../../features/vault/vault-password-weak';
import { SHARE_MAX_PAYLOAD_BYTES } from './vault-field-share.constants';

const SENSITIVE_KEY_SUFFIXES = ['password', 'secret', 'pin', 'api_key', 'token', 'passphrase', 'private_key', 'ssh_key'];

function isAlwaysVisibleFieldKey(fieldKey: string): boolean {
  return fieldKey === 'name' || fieldKey === 'url';
}

/** Whether a decrypted vault field may be shared ephemerally (v1). */
export function isVaultFieldShareEligible(fieldKey: string, value: string): boolean {
  if (isAlwaysVisibleFieldKey(fieldKey)) {
    return false;
  }
  if (value.trim() === '') {
    return false;
  }
  if (new TextEncoder().encode(value).length > SHARE_MAX_PAYLOAD_BYTES) {
    return false;
  }
  const lower = fieldKey.toLowerCase();
  if (vaultFieldKeyLooksLikePassword(fieldKey)) {
    return true;
  }
  return SENSITIVE_KEY_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith('.' + suffix) || lower.includes('.' + suffix + '.'));
}
