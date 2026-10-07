/**
 * Canonical vault-related routes for navigation, guards, and deep links.
 * Keep paths centralized when adding child routes (e.g. /vault/items/:id later).
 */
/** Vault profile (server wrap), recovery — Settings. Idle presets: Vault → Session page. */
export const VAULT_SETTINGS_ROUTE = '/settings';
export const VAULT_ENCRYPTED_ITEMS_ROUTE = '/vault/items';
export const VAULT_SESSION_ROUTE = '/vault/session';

/** Default route after sign-in, onboarding, or guest redirect (vault unlock guard sends locked users to Session). */
export const APP_POST_AUTH_LANDING_ROUTE = VAULT_ENCRYPTED_ITEMS_ROUTE;
