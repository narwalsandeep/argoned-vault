/**
 * Operator, brand, and public endpoints for legal pages and contact.
 * Counsel may add company registration number and registered office address to Terms/Privacy body copy when finalised.
 *
 * When you publish a material Terms/Privacy change: bump `LEGAL_SIGNUP_DOCS_VERSION` and set API `LEGAL_SIGNUP_DOCS_VERSION`
 * (or `legal.signup_docs_version` in settings) to the same value.
 */
/** Machine-readable policy bundle id sent at signup; must match API `LEGAL_SIGNUP_DOCS_VERSION`. */
export const LEGAL_SIGNUP_DOCS_VERSION = '2026-04-16';

export const LEGAL_CONTACT = {
  brandName: 'Argoned',
  companyLegalName: 'Switchcodes Ltd',
  companyJurisdiction: 'United Kingdom',
  contactEmail: 'team@switchcodes.com',
  contactMailto: 'mailto:team@switchcodes.com',
  marketingSiteUrl: 'https://argoned.com',
  vaultAppUrl: 'https://vault.argoned.com',
  apiUrl: 'https://api.argoned.com',
  hostingSummary: 'Amazon Web Services (AWS)',
  policyEffectiveLabel: '16 April 2026',
} as const;
