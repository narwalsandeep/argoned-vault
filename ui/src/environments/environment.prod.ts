export const environment = {
  production: true,
  apiBaseUrl: 'https://api.argoned.com',
  /**
   * Mirror `UI_SHOW_LIFETIME_PRICING` in `api/.env` for operators; set true and rebuild the UI to show Lifetime again.
   * The browser bundle does not read `.env` at runtime—rebuild after changing this flag.
   */
  showLifetimeOnPricing: true,
};
