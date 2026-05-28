/** Matches server {@see \Blackbox\Domain\Vault\VaultFilePolicy} and billing caps. */
export const VAULT_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const VAULT_FILE_TOTAL_BYTES = 1024 * 1024 * 1024;
export const VAULT_FILE_MAX_PER_VAULT_ITEM = 64;
export const VAULT_FILE_UPLOAD_BATCH_MAX = 8;

export const VAULT_FILE_ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** When `File.type` is empty (common on Linux / some browsers), infer from extension for client-side checks. */
const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * MIME for upload validation + encryption metadata. Prefer `file.type`; fall back to extension when empty.
 */
export function mimeTypeForVaultUpload(file: File): string {
  const fromBrowser = (file.type ?? '').trim().toLowerCase();
  if (fromBrowser !== '') {
    return fromBrowser;
  }
  const name = file.name ?? '';
  const dot = name.lastIndexOf('.');
  if (dot < 0) {
    return '';
  }
  const ext = name.slice(dot).toLowerCase();

  return EXTENSION_TO_MIME[ext] ?? '';
}
