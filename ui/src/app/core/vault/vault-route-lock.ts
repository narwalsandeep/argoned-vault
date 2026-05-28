/**
 * When navigating inside the authenticated app (dashboard, vault, vault/items, create, settings, …),
 * the in-memory vault key must stay loaded so users can save encrypted items after unlock.
 *
 * Only clear the vault key when navigating to **public / auth / legal** routes where
 * the user leaves the protected shell (login, signup, etc.).
 */
const ROUTES_THAT_CLEAR_VAULT_KEY = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/recovery',
  '/terms',
  '/privacy',
]);

function normalizeNavigationPath(url: string): string {
  const path = url.split('?')[0]?.split('#')[0] ?? '';
  if (path === '') {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function shouldClearVaultKeyOnNavigation(url: string): boolean {
  const path = normalizeNavigationPath(url);
  if (ROUTES_THAT_CLEAR_VAULT_KEY.has(path)) {
    return true;
  }
  return [...ROUTES_THAT_CLEAR_VAULT_KEY].some(
    (prefix) => prefix !== '/' && path.startsWith(`${prefix}/`),
  );
}
