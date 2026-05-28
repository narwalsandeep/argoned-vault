import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  VAULT_ENCRYPTED_ITEMS_ROUTE,
  VAULT_SESSION_ROUTE,
  VAULT_SETTINGS_ROUTE,
} from '../../core/vault/vault-app-paths';
import { DASHBOARD_CRYPTO_STATS } from '../dashboard/dashboard-stats.constants';

export interface DocsTocItem {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [RouterLink],
  template: `<div class="page-content page-pad--settings settings-page-fill text-left">
  <div class="app-page-layout">
    <div class="app-page-main app-page-main--full w-full max-w-none">
      <header class="docs-hero" aria-labelledby="docs-main-title">
        <div class="docs-hero-pattern" aria-hidden="true"></div>
        <div class="docs-hero-inner">
          <p class="docs-hero-kicker">Argoned · In-app guide</p>
          <h1 id="docs-main-title" class="docs-hero-title">How this platform works</h1>
          <p class="docs-hero-lede">
            Client-side vault cryptography, how the shell is organized, and what each area of the app is for. Use the
            shortcuts below or the table of contents to jump around. Everything here describes the behavior implemented in
            this codebase.
          </p>
        </div>
      </header>

      <nav class="docs-shell-nav" aria-label="App pages">
        @for (link of shellQuickLinks; track link.path) {
          <a [routerLink]="link.path" class="docs-shell-nav-link">{{ link.label }}</a>
        }
      </nav>

      <div class="docs-page-grid">
        <aside class="docs-toc" aria-label="On this page">
          <div class="docs-toc-inner">
            <p class="docs-toc-title">On this page</p>
            <ul class="docs-toc-list list-none p-0">
              @for (item of tocItems; track item.id) {
                <li>
                  <a class="docs-toc-link" [href]="'#' + item.id">{{ item.label }}</a>
                </li>
              }
            </ul>
          </div>
        </aside>

        <div class="docs-main-column">
          <div class="docs-body">
            <section class="docs-section" id="overview" aria-labelledby="docs-overview-h">
              <h2 id="docs-overview-h" class="docs-section-title">Platform overview</h2>
              <p class="docs-section-kicker">
                A secrets workspace: your browser encrypts; the server stores opaque envelopes and session metadata.
              </p>
              <div class="docs-pillar-grid" aria-label="Design pillars">
                <div class="docs-pillar">
                  <div class="docs-pillar-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p class="docs-pillar-title">Encrypt before upload</p>
                  <p class="docs-pillar-text">
                    Structured items (e.g. website credentials) are turned into JSON, encrypted with AES-256-GCM using a
                    per-item key, then uploaded as ciphertext + wraps. The API never receives your vault master key or item
                    plaintext.
                  </p>
                </div>
                <div class="docs-pillar">
                  <div class="docs-pillar-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p class="docs-pillar-title">Server is a vault wall</p>
                  <p class="docs-pillar-text">
                    The backend persists Argon2id salts, wrapped vault keys, item metadata, and ciphertext fields. A
                    compromised server still leaves attackers without your unlock secret, recovery bundle, or active in-tab
                    vault key.
                  </p>
                </div>
                <div class="docs-pillar">
                  <div class="docs-pillar-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <p class="docs-pillar-title">Tab-scoped unlock</p>
                  <p class="docs-pillar-text">
                    Unlocking loads the vault AES key only in <strong class="text-app-text">this browser tab’s memory</strong>.
                    Other tabs and devices do not share it. Auto-lock and explicit Lock clear that key without deleting server
                    data.
                  </p>
                </div>
              </div>
              <div class="docs-prose">
                <p>
                  <strong class="text-app-text">Login</strong> (email + password) proves who you are to the API and sets a
                  session cookie. <strong class="text-app-text">Vault unlock</strong> is a separate step: you enter your
                  long vault secret so the app can derive an AES key, unwrap the vault key from your profile, and decrypt
                  items. Losing the vault secret while keeping the login password does <em>not</em> recover ciphertext, plan
                  recovery artifacts if you need a backup lane.
                </p>
              </div>
            </section>

            <section class="docs-section" id="shell" aria-labelledby="docs-shell-h">
              <h2 id="docs-shell-h" class="docs-section-title">Shell &amp; navigation</h2>
              <p class="docs-section-kicker">Authenticated layout: left rail, main column, right rail.</p>
              <div class="docs-def-block">
                <div class="docs-def-row">
                  <p class="docs-def-term">Left rail (primary)</p>
                  <p class="docs-def-desc">
                    <strong class="text-app-text">Add</strong> → <code>/new</code> create hub.
                    <strong class="text-app-text">Vault</strong> → encrypted items workspace.
                    <strong class="text-app-text">Settings</strong> → vault profile and recovery. Idle auto-lock presets live
                    under Vault → Session.
                    <strong class="text-app-text">Account</strong> → profile &amp; password (account-level, not vault crypto).
                    <strong class="text-app-text">Logout</strong> ends the API session.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Right rail (secondary)</p>
                  <p class="docs-def-desc">
                    <strong class="text-app-text">Alert</strong>, <strong class="text-app-text">Pricing</strong>,
                    <strong class="text-app-text">Billing</strong>, and <strong class="text-app-text">Docs</strong> are quick
                    jumps; Docs is this page.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Main scroll region</p>
                  <p class="docs-def-desc">
                    Route outlet content uses the same spacing tokens as Settings (<code>page-pad--settings</code>,
                    <code>settings-layout</code> where a page has a help column). Pages without a right column still align
                    to the same grid width for consistency.
                  </p>
                </div>
              </div>
            </section>

            <section class="docs-section" id="encryption" aria-labelledby="docs-enc-h">
              <h2 id="docs-enc-h" class="docs-section-title">Encryption architecture</h2>
              <p class="docs-section-kicker">End-to-end flow from first setup to saving an item, implemented in WebCryptoService.</p>
              <ol class="docs-step-list">
                <li>
                  <span class="docs-step-num" aria-hidden="true">1</span>
                  <span
                    ><strong class="text-app-text">Bootstrap profile.</strong> You choose an unlock secret (12+ characters;
                    spaces count). The
                    app runs <strong>Argon2id</strong> (<code>hash-wasm</code>) with your configured time / memory / parallelism
                    to derive a 256-bit AES-GCM key (“unlock key”). It generates a random vault AES-256 key, encrypts it
                    under the unlock key, and stores salt + wrapped vault key + IV + tag on the server.</span
                  >
                </li>
                <li>
                  <span class="docs-step-num" aria-hidden="true">2</span>
                  <span
                    ><strong class="text-app-text">Unlock.</strong> The same Argon2id derivation re-computes the unlock key,
                    decrypts the wrapped vault key in the browser, and imports it as a non-extractable
                    <code>CryptoKey</code> for AES-GCM. That key stays in memory until lock, idle auto-lock, or logout
                    clears it.</span
                  >
                </li>
                <li>
                  <span class="docs-step-num" aria-hidden="true">3</span>
                  <span
                    ><strong class="text-app-text">Save item.</strong> For each item the app generates a fresh random
                    <abbr title="data encryption key">DEK</abbr>, wraps the DEK under the vault key (AES-GCM, 12-byte nonce),
                    encrypts the JSON payload under the DEK, and uploads base64 ciphertext + tags + nonces.</span
                  >
                </li>
                <li>
                  <span class="docs-step-num" aria-hidden="true">4</span>
                  <span
                    ><strong class="text-app-text">Open item.</strong> Unwrap DEK with vault key, decrypt payload, parse JSON.
                    If the vault is locked, decryption is refused until you unlock again.</span
                  >
                </li>
              </ol>
              <div class="docs-callout">
                <strong class="text-app-text">Web Crypto API.</strong> AES-256-GCM is used for wrapping and payloads. Each
                GCM operation uses a random 96-bit (12-byte) IV. Authentication tags are split and stored alongside ciphertext
                fields as in <code>WebCryptoService</code> (<code>splitCipherAndTag</code> / <code>combineCipherAndTag</code>).
              </div>
            </section>

            <section class="docs-section" id="keys-and-secrets" aria-labelledby="docs-keys-h">
              <h2 id="docs-keys-h" class="docs-section-title">Keys &amp; secrets</h2>
              <p class="docs-section-kicker">Separate concerns: account login vs vault crypto vs recovery.</p>
              <div class="docs-prose">
                <h3 class="docs-h3">Unlock secret → unlock key → vault key</h3>
                <p>
                  The <strong class="text-app-text">unlock secret</strong> is high-entropy input you memorize (or store in a
                  password manager). It is <em>not</em> sent to the server. Argon2id produces the
                  <strong class="text-app-text">unlock key</strong>, which only wraps the
                  <strong class="text-app-text">vault key</strong>. Rotating the
                  vault profile re-wraps a new vault key; old ciphertext may become unreadable if you do not re-encrypt
                  items.
                </p>
                <h3 class="docs-h3">Login password</h3>
                <p>
                  Used by the auth API for session cookies. It does not directly decrypt vault items. Changing the login
                  password under <strong class="text-app-text">Account</strong> does not change your vault unlock secret or
                  wrapped vault key.
                </p>
                <h3 class="docs-h3">Defaults (bootstrap)</h3>
                <p>
                  If you use the default Argon2id profile in code: time cost <code>3</code>, memory <code>65536</code> KiB,
                  parallelism <code>1</code>, 32-byte output, tunable in Settings → Vault Profile before first save.
                </p>
              </div>
            </section>

            <section class="docs-section" id="items-and-dek" aria-labelledby="docs-items-h">
              <h2 id="docs-items-h" class="docs-section-title">Vault items &amp; credential types</h2>
              <p class="docs-section-kicker">Per-item DEKs, JSON payloads, and typed credentials for the UI.</p>
              <div class="docs-prose">
                <p>
                  Each stored row includes <code>wrapped_dek_*</code> and <code>payload_*</code> fields (ciphertext, nonce,
                  tag). The plaintext JSON can include fields like <code>name</code>, <code>url</code>,
                  <code>username</code>, <code>password</code> for website logins. The field
                  <code>credential_subtype</code> (e.g. <code>website</code>) becomes
                  <code>item_type: credential:website</code> so lists can show the right icon.
                </p>
                <p>
                  <code>crypto_version</code> on items and profile marks the wire format so future cipher or KDF changes can
                  coexist with legacy ciphertext during migration.
                </p>
              </div>
            </section>

            <section class="docs-section" id="recovery" aria-labelledby="docs-rec-h">
              <h2 id="docs-rec-h" class="docs-section-title">Recovery</h2>
              <p class="docs-section-kicker">Optional second lane: recovery secret + artifact, distinct from daily unlock.</p>
              <div class="docs-prose">
                <p>
                  While the vault is unlocked, you can build a <strong class="text-app-text">recovery artifact</strong> that
                  wraps the vault key under a key derived from a separate <strong class="text-app-text">recovery secret</strong>
                  (also 12+ chars minimum in code). The recovery key is derived with <strong>SHA-256</strong> over the UTF-8
                  secret, then AES-GCM wraps the raw vault key. See <code>buildRecoveryArtifact</code> and
                  <code>unlockFromRecoveryArtifact</code>.
                </p>
                <p>
                  Store the artifact and secret independently (e.g. encrypted backup + offline paper). Losing both unlock
                  secret and recovery material can mean <strong class="text-app-text">permanent loss</strong> of item
                  plaintext. The emergency kit export in Settings is meant to bundle human-readable recovery instructions.
                </p>
              </div>
            </section>

            <section class="docs-section" id="session-memory" aria-labelledby="docs-sess-h">
              <h2 id="docs-sess-h" class="docs-section-title">Session &amp; memory</h2>
              <p class="docs-section-kicker">What lives in RAM, auto-lock, and “this tab only”.</p>
              <div class="docs-prose">
                <p>
                  <code>WebCryptoService</code> holds <code>vaultKey: CryptoKey | null</code>. Successful unlock sets it and
                  starts an auto-lock timer (default <strong class="text-app-text">8 minutes</strong> of idle unless
                  changed). Activity resets the timer. <strong class="text-app-text">Lock vault</strong> clears the key
                  immediately without a server round-trip.
                </p>
                <p>
                  The <strong class="text-app-text">Vault Session</strong> page (<code>/vault/session</code>) sets idle auto-lock
                  with minute presets (apply immediately; while unlocked, a new choice restarts the full idle window from that
                  tap). While unlocked, the <strong class="text-app-text">time until auto-lock</strong> appears in the left rail
                  under the green vault status control. Session also shows status, lock, and links to Settings/Create. Unlock
                  still happens when the app prompts, not from Settings.
                </p>
              </div>
            </section>

            <section class="docs-section" id="pages-by-area" aria-labelledby="docs-pages-h">
              <h2 id="docs-pages-h" class="docs-section-title">Pages, menus &amp; tabs</h2>
              <p class="docs-section-kicker">What each major screen is designed to do in this shell.</p>
              <div class="docs-def-block">
                <div class="docs-def-row">
                  <p class="docs-def-term">Stats (<code>/dashboard</code>)</p>
                  <p class="docs-def-desc">
                    Overview: vault locked/unlocked in this tab, encrypted item count from the API, session posture, and static
                    crypto reference tiles. Right column lists shortcuts (text links) to Vault, Create, Settings, Docs.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Create hub (<code>/new</code>)</p>
                  <p class="docs-def-desc">
                    Choose what to add. Credential flow goes to <code>/new/credentials</code> → pick subtype (e.g. Website) →
                    <code>/new/credentials/:subtype</code> form. Help rail explains client-side encryption before upload.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Vault items (<code>/vault/items</code>)</p>
                  <p class="docs-def-desc">
                    List/select ciphertext rows, decrypt when unlocked, modal unlock if needed. In-context docs rail on the
                    right.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Vault session (<code>/vault/session</code>)</p>
                  <p class="docs-def-desc">
                    Idle minute presets, lock vault, status, and links; in-context docs rail. Idle time remaining is shown on
                    the left rail when unlocked.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Settings (<code>/settings</code>)</p>
                  <p class="docs-def-desc">
                    Tabs: <strong class="text-app-text">Vault Profile</strong> (Argon2id params, bootstrap/update wrapped
                    vault key). <strong class="text-app-text">Recovery</strong> (artifacts, rotate/load, emergency kit export). Help
                    rail
                    content switches per tab.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Account (<code>/profile</code>)</p>
                  <p class="docs-def-desc">
                    Tabs: <strong class="text-app-text">Profile</strong> (display name / email fields tied to account API).
                    <strong class="text-app-text">Password</strong> (change login password, separate from vault unlock).
                    Right rail explains account vs vault boundaries.
                  </p>
                </div>
                <div class="docs-def-row">
                  <p class="docs-def-term">Alert, Status, Pricing</p>
                  <p class="docs-def-desc">
                    <strong class="text-app-text">Alert</strong>: reserved for security/comms placeholders.
                    <strong class="text-app-text">Status</strong>: operational / API health placeholders.
                    <strong class="text-app-text">Pricing</strong>: plans copy + link here and to GitHub.
                  </p>
                </div>
              </div>
            </section>

            <section class="docs-section" id="api" aria-labelledby="docs-api-h">
              <h2 id="docs-api-h" class="docs-section-title">Vault HTTP API</h2>
              <p class="docs-section-kicker">REST under <code>/api/v1/vault/…</code>; JSON bodies; ciphertext is opaque to the server.</p>
              <div class="docs-prose">
                <p>
                  Reads use the session cookie only. Writes require a CSRF token (see next section). List endpoints return
                  metadata and encrypted fields as stored, no server-side decryption.
                </p>
              </div>
              <ul class="docs-api-list">
                <li><code>GET /api/v1/vault/profile</code>: salt, kdf params, wrapped vault key envelope, version.</li>
                <li><code>PUT /api/v1/vault/profile</code>: create or replace profile after client-side bootstrap (CSRF).</li>
                <li><code>GET /api/v1/vault/items</code>: paginated/list metadata + ciphertext fields for all items.</li>
                <li><code>POST /api/v1/vault/items</code>: create item from client-encrypted payload (CSRF).</li>
                <li><code>GET /api/v1/vault/items/:id</code>: single envelope for detail view.</li>
                <li><code>PUT /api/v1/vault/items/:id</code>: replace ciphertext/metadata (CSRF).</li>
                <li><code>DELETE /api/v1/vault/items/:id</code>: soft delete flag (CSRF).</li>
                <li><code>POST /api/v1/vault/recovery/artifact</code>: persist recovery artifact blob (CSRF).</li>
              </ul>
            </section>

            <section class="docs-section" id="auth-csrf" aria-labelledby="docs-auth-h">
              <h2 id="docs-auth-h" class="docs-section-title">Auth sessions &amp; CSRF</h2>
              <p class="docs-section-kicker">How the SPA attaches safety tokens on mutating requests.</p>
              <div class="docs-prose">
                <p>
                  After login or <code>/api/v1/auth/me</code>, the client keeps a CSRF token and sends it on
                  <code>PUT</code>, <code>POST</code>, and <code>DELETE</code> via <code>ApiClientService</code>. The browser
                  includes the session cookie on API calls; the CSRF header pairs with that cookie for double-submit style
                  protection on mutating requests.
                </p>
              </div>
            </section>

            <section class="docs-section" id="repo" aria-labelledby="docs-repo-h">
              <h2 id="docs-repo-h" class="docs-section-title">Repository documentation</h2>
              <p class="docs-section-kicker">Long-form markdown next to the backend (not rendered in this app).</p>
              <div class="docs-prose">
                <p>Authoritative markdown in <code>docs/</code> (not rendered here). Start with <code>README.md</code>, then:</p>
                <ul>
                  <li><code>system-reference.md</code>: API routes, Angular routes, DB tables, import/billing pointers</li>
                  <li><code>security-program-and-hardening-roadmap.md</code>: implemented controls, residual risks, remediation backlog</li>
                  <li><code>architecture-security-and-threats.md</code>: security model diagrams, sequences, browser extension threats</li>
                  <li><code>vault-crypto-and-data-lifecycle.md</code>: fields, profile rotation vs items, recovery</li>
                  <li><code>development-phases-plan.md</code>: phased delivery and risks</li>
                  <li><code>operations-runbooks.md</code>: Docker local + EC2 deploy</li>
                  <li><code>research-todos-and-backlog.md</code>: backlog, GDPR/legal TODOs, import research</li>
                </ul>
              </div>
            </section>

            <section class="docs-section docs-section--last" id="routes" aria-labelledby="docs-routes-h">
              <h2 id="docs-routes-h" class="docs-section-title">All routes (quick open)</h2>
              <p class="docs-section-kicker">Router entries in this Angular app, click to navigate.</p>
              @for (group of routeLinkGroups; track group.title) {
                <div class="docs-route-group">
                  <h3 class="docs-route-group-title">{{ group.title }}</h3>
                  <p class="docs-route-group-kicker">{{ group.kicker }}</p>
                  <div class="docs-route-group-links">
                    @for (link of group.links; track link.path) {
                      <a [routerLink]="link.path" class="docs-shell-nav-link">{{ link.label }}</a>
                    }
                  </div>
                </div>
              }
            </section>

            <section class="docs-section" aria-labelledby="docs-ref-h">
              <h2 id="docs-ref-h" class="docs-section-title">Crypto reference table</h2>
              <p class="docs-section-kicker">Static labels aligned with dashboard tiles and implementation details.</p>
              <ul class="docs-crypto-ref-list">
                @for (stat of cryptoStats; track stat.label) {
                  <li>
                    <span class="docs-crypto-ref-label">{{ stat.label }}</span>
                    <span class="docs-crypto-ref-value">{{ stat.value }}</span>
                    <span class="docs-crypto-ref-detail">{{ stat.detail }}</span>
                  </li>
                }
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`,
})
export class DocsComponent {
  public readonly cryptoStats = DASHBOARD_CRYPTO_STATS;

  public readonly tocItems: readonly DocsTocItem[] = [
    { id: 'overview', label: 'Platform overview' },
    { id: 'shell', label: 'Shell & navigation' },
    { id: 'encryption', label: 'Encryption architecture' },
    { id: 'keys-and-secrets', label: 'Keys & secrets' },
    { id: 'items-and-dek', label: 'Vault items & DEKs' },
    { id: 'recovery', label: 'Recovery' },
    { id: 'session-memory', label: 'Session & memory' },
    { id: 'pages-by-area', label: 'Pages, menus & tabs' },
    { id: 'api', label: 'Vault API' },
    { id: 'auth-csrf', label: 'Auth & CSRF' },
    { id: 'repo', label: 'Repo documentation' },
    { id: 'routes', label: 'All routes' },
  ];

  public readonly shellQuickLinks: ReadonlyArray<{ path: string; label: string }> = [
    { path: '/new', label: 'Create' },
    { path: VAULT_ENCRYPTED_ITEMS_ROUTE, label: 'Vault items' },
    { path: VAULT_SESSION_ROUTE, label: 'Vault session' },
    { path: VAULT_SETTINGS_ROUTE, label: 'Settings' },
    { path: '/profile', label: 'Account' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/alert', label: 'Alerts' },
    { path: '/status', label: 'Status' },
    { path: '/docs', label: 'Docs' },
  ];

  public readonly routeLinkGroups: ReadonlyArray<{
    title: string;
    kicker: string;
    links: ReadonlyArray<{ path: string; label: string }>;
  }> = [
    {
      title: 'Public & account',
      kicker: 'Sign-in, recovery, and legal.',
      links: [
        { path: '/login', label: 'Login' },
        { path: '/signup', label: 'Sign up' },
        { path: '/forgot-password', label: 'Forgot password' },
        { path: '/recovery', label: 'Recovery' },
        { path: '/terms', label: 'Terms' },
        { path: '/privacy', label: 'Privacy' },
      ],
    },
    {
      title: 'Workspace',
      kicker: 'While you are signed in.',
      links: [
        { path: '/new', label: 'Create hub' },
        { path: '/new/credentials', label: 'Credential types' },
        { path: '/new/credentials/website', label: 'New website login' },
        { path: VAULT_ENCRYPTED_ITEMS_ROUTE, label: 'Vault items' },
        { path: VAULT_SESSION_ROUTE, label: 'Vault session' },
        { path: '/settings', label: 'Settings' },
        { path: '/profile', label: 'Account' },
        { path: '/alert', label: 'Alerts' },
        { path: '/status', label: 'Status' },
        { path: '/pricing', label: 'Pricing' },
        { path: '/docs', label: 'Docs' },
        { path: '/logout', label: 'Logout' },
      ],
    },
  ];
}
