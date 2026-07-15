/**
 * Validates a same-tab app path for `returnUrl` (guards, post-unlock redirect). Rejects open redirects and `//` hosts.
 */
export function isSafeAppInternalPath(path: string): boolean {
  if (path.length === 0 || path.length > 2048) {
    return false;
  }
  if (!path.startsWith('/')) {
    return false;
  }
  if (path.startsWith('//')) {
    return false;
  }
  if (path.includes('://')) {
    return false;
  }
  return true;
}
