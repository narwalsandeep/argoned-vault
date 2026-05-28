import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="site-hero site-hero--home">
      <div class="site-hero-home-backdrop" aria-hidden="true">
        <div class="site-hero-home-backdrop-grid"></div>
        <div class="site-hero-home-backdrop-glow"></div>
      </div>
      <div class="site-hero-home-wrap">
        <div class="site-hero-home-grid">
          <div class="site-hero-home-rail">
            <div class="site-hero-home-rail-mark" aria-hidden="true"></div>
            <div class="site-hero-home-rail-body">
              <p class="site-hero-home-eyebrow">Introducing</p>
              <h1 class="mt-0">
                <span class="site-hero-home-brand site-logo">
                  <span class="site-logo-accent">a</span><span class="site-logo-core">rgoned</span><span class="site-logo-accent">.</span>
                </span>
                <span class="site-hero-home-claim">Encrypt first. The server only ever sees ciphertext.</span>
              </h1>
              <p class="site-hero-home-lead">
                Argoned encrypts vault items before they touch the API. The server stores ciphertext, wrapping metadata, and
                access control, not your master key, unlock secret, or item plaintext.
                <span class="font-bold text-app-text/95"> We’re fine with that arrangement.</span>
              </p>
              <div class="site-hero-home-pills">
                <span class="site-badge"><span aria-hidden="true" class="mr-1.5">✓</span>Zero-knowledge</span>
                <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Argon2id</span>
                <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>AES-256-GCM</span>
                <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Client-side</span>
              </div>
              <div class="site-hero-home-actions">
                <a href="https://vault.argoned.com" rel="noopener noreferrer" class="site-btn-primary">
                  <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Get started
                </a>
                <a routerLink="/product" class="site-btn-secondary">
                  <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  How the vault works
                </a>
              </div>
            </div>
          </div>
          <aside class="site-hero-home-aside" aria-label="Illustration of what the server stores">
            <div class="site-hero-home-frame">
              <div class="site-hero-home-frame-inner">
                <div class="site-hero-home-frame-top">
                  <div class="site-hero-home-dots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                  <p class="site-hero-home-url">vault.argoned.com</p>
                </div>
                <p class="site-hero-home-block-label">On the server</p>
                <p class="site-hero-home-cipher" translate="no">
                  U2FsdGVkX1+…ciphertext…9mK4qL (truncated)<br />
                  <span class="text-app-text-muted/75">wrapping: AES-256-GCM · per-item nonce · vault metadata</span>
                </p>
                <div class="site-hero-home-divider" aria-hidden="true"></div>
                <p class="site-hero-home-block-label">Stays on your device</p>
                <ul class="site-hero-home-keep">
                  <li>Master key, unlock secret, recovery material you never upload</li>
                  <li>Item plaintext and decrypted fields</li>
                </ul>
                <div class="site-hero-home-frame-foot">
                  <span>Client-side crypto</span>
                  <span class="text-app-text-muted/45" aria-hidden="true">·</span>
                  <span>Zero-knowledge by design</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <div class="site-page site-page--home">
      <div class="site-home-band site-home-band--alt">
        <div class="site-band-stack">
            <div class="site-home-showcase-intro">
              <div class="flex items-center gap-3">
                <span class="site-crypto-icon-ring" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </span>
                <span class="site-showcase-eyebrow">Client-side vault</span>
              </div>
              <h2 class="site-subdisplay max-w-4xl text-balance">
                Secrets stay in <span class="text-app-accent">your</span> browser first.
              </h2>
            </div>
            <div class="site-card site-card-interactive border-app-border/40 shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]">
              <div class="grid gap-10 md:grid-cols-2 md:gap-12">
                <div class="flex min-w-0 flex-col gap-6">
                  <div class="flex items-center gap-3">
                    <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                      <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <span class="site-panel-label">In the tab</span>
                  </div>
                  <h3 class="site-showcase-title text-xl md:text-2xl">Encrypted before it leaves the tab</h3>
                  <p class="site-p">
                    Vault entries are encrypted in your browser; the API stores ciphertext and wrapping data, not plaintext or
                    your vault unlock secret.
                  </p>
                </div>
                <div class="flex min-w-0 flex-col gap-6">
                  <div class="flex items-center gap-3">
                    <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                      <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </span>
                    <span class="site-panel-label">On the wire</span>
                  </div>
                  <h3 class="site-showcase-title text-xl md:text-2xl">Useful backend, not an all-seeing key holder</h3>
                  <p class="site-p">
                    Sessions, auth, rate limits, and persistence, without the server being able to decrypt your vault for routine
                    work.
                  </p>
                </div>
              </div>
            </div>
        </div>
      </div>

      <div class="site-home-band">
        <section class="site-section !mt-0 !space-y-0">
          <div class="site-band-stack">
              <div class="site-home-showcase-intro">
                <div class="flex items-center gap-3">
                  <span class="site-crypto-icon-ring" aria-hidden="true">
                    <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </span>
                  <span class="site-showcase-eyebrow">Key flow</span>
                </div>
                <h2 class="site-showcase-title max-w-4xl text-balance">
                  Your <span class="text-app-accent">unlock key (UK)</span> wraps the
                  <span class="text-app-accent">vault key (VK)</span>; VK wraps each item’s
                  <span class="text-app-accent">DEK</span>, three layers from your secret to every entry.
                </h2>
                <p class="site-p max-w-3xl py-1 md:py-2">
                  Only ciphertext and wrapping data travel to the server; Argon2id and AES-256-GCM do the heavy lifting in the
                  browser.
                </p>
              </div>

              <div class="site-keyflow mx-auto min-w-0 max-w-4xl">
                <div class="site-keyflow-pipeline">
              <div class="site-keyflow-node">
                <span class="site-keyflow-node-code">UK</span>
                <span class="site-keyflow-node-hint">Unlock key, Argon2id from your vault secret + salt</span>
              </div>
              <div class="site-keyflow-mobile-join" aria-hidden="true">
                <div class="site-keyflow-mobile-join-line">
                  <span class="site-keyflow-mobile-travel"></span>
                </div>
              </div>
              <div class="site-keyflow-bridge" aria-hidden="true">
                <span class="site-keyflow-bridge-line"></span>
                <span class="site-keyflow-bridge-cap site-keyflow-bridge-cap--start"></span>
                <span class="site-keyflow-bridge-cap site-keyflow-bridge-cap--end"></span>
                <span class="site-keyflow-bridge-travel"></span>
              </div>
              <div class="site-keyflow-node">
                <span class="site-keyflow-node-code">VK</span>
                <span class="site-keyflow-node-hint">Vault key, random AES-256, wrapped by UK for storage</span>
              </div>
              <div class="site-keyflow-mobile-join site-keyflow-mobile-join--b" aria-hidden="true">
                <div class="site-keyflow-mobile-join-line">
                  <span class="site-keyflow-mobile-travel"></span>
                </div>
              </div>
              <div class="site-keyflow-bridge" aria-hidden="true">
                <span class="site-keyflow-bridge-line"></span>
                <span class="site-keyflow-bridge-cap site-keyflow-bridge-cap--start"></span>
                <span class="site-keyflow-bridge-cap site-keyflow-bridge-cap--end"></span>
                <span class="site-keyflow-bridge-travel"></span>
              </div>
              <div class="site-keyflow-node">
                <span class="site-keyflow-node-code">DEK</span>
                <span class="site-keyflow-node-hint">Per-item keys, wrapped under VK; payloads encrypted with GCM</span>
              </div>
            </div>
            <ul class="site-keyflow-detail list-none">
              <li>
                <span
                  ><strong class="text-app-text">Session reality:</strong> while the vault is open, UK unwraps VK in this tab;
                  lock, logout, or closing the tab clears that path, the server still has only wrapped material.</span
                >
              </li>
              <li>
                <span
                  ><strong class="text-app-text">Recovery honesty:</strong> lose every legitimate unlock path and the ciphertext
                  stays unreadable, not a hidden back door, by design.</span
                >
              </li>
            </ul>
              </div>
          </div>
        </section>
      </div>

      <div class="site-home-band site-home-band--alt">
        <section class="site-section !mt-0 !space-y-0">
          <div class="site-band-stack">
              <div class="site-home-showcase-intro">
                <div class="flex items-center gap-3">
                  <span class="site-crypto-icon-ring" aria-hidden="true">
                    <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </span>
                  <span class="site-showcase-eyebrow">What lives where</span>
                </div>
                <h2 class="site-showcase-title">Who can read what</h2>
              </div>
              <div
                class="site-card site-card-interactive overflow-hidden border-app-border/40 p-0 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.55)]"
              >
                <div class="site-table-wrap site-table-wrap--showcase border-0">
                  <table class="site-table site-table--showcase">
                    <thead>
                      <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Location</th>
                        <th scope="col">Server plaintext?</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Account password</td>
                        <td>users (hash)</td>
                        <td><span class="site-table-tag site-table-tag--soft">Verify only</span></td>
                      </tr>
                      <tr>
                        <td>Vault unlock secret</td>
                        <td>You / PM</td>
                        <td><span class="site-table-tag site-table-tag--soft">Not for crypto</span></td>
                      </tr>
                      <tr>
                        <td>Vault key (raw)</td>
                        <td>Tab memory</td>
                        <td><span class="site-table-tag site-table-tag--soft">No</span></td>
                      </tr>
                      <tr>
                        <td>Wrapped VK + KDF</td>
                        <td>vault_profiles</td>
                        <td><span class="site-table-tag site-table-tag--soft">Ciphertext + params</span></td>
                      </tr>
                      <tr>
                        <td>Items</td>
                        <td>vault_items</td>
                        <td><span class="site-table-tag site-table-tag--soft">Opaque blobs</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </section>
      </div>

      <div class="site-home-band">
        <div class="site-band-stack">
            <div class="site-home-showcase-intro">
              <div class="flex items-center gap-3">
                <span class="site-crypto-icon-ring" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                <span class="site-showcase-eyebrow">Crypto parameters</span>
              </div>
              <h2 class="site-showcase-title max-w-4xl text-balance">
                Tuned for real devices and real threat models, two unlock lanes, one zero-knowledge boundary.
              </h2>
            </div>
            <div class="site-crypto-bento">
            <div class="site-crypto-bento-main">
              <div class="site-crypto-bento-main-inner">
                <div class="mb-6 flex items-center gap-3">
                  <span class="site-crypto-icon-ring" aria-hidden="true">
                    <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <span class="site-panel-label">Argon2id</span>
                </div>
                <h3 class="site-showcase-title">Memory-hard unlock cost</h3>
                <p class="site-p mt-4 max-w-xl text-[1.05rem] md:text-[1.125rem]">
                  Iteration count and RAM are turned up on purpose so offline guessing stays expensive, without running KDF on
                  every routine request.
                </p>
                <div class="mt-10 grid gap-8 sm:grid-cols-2">
                  <div class="site-crypto-metric-block">
                    <div class="site-crypto-metric-value">2 to 6</div>
                    <p class="site-crypto-metric-label">Time cost (iterations)</p>
                    <p class="site-crypto-metric-hint">Bounded, profile-driven</p>
                    <div class="site-crypto-bar" aria-hidden="true">
                      <span class="site-crypto-bar-fill site-crypto-bar-fill--time"></span>
                    </div>
                  </div>
                  <div class="site-crypto-metric-block">
                    <div class="site-crypto-metric-value">64 to 256</div>
                    <p class="site-crypto-metric-label">Memory (MiB)</p>
                    <p class="site-crypto-metric-hint">Stepped workload</p>
                    <div class="site-crypto-bar" aria-hidden="true">
                      <span class="site-crypto-bar-fill site-crypto-bar-fill--mem"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="site-crypto-bento-stack">
              <div class="site-crypto-bento-card">
                <div class="site-crypto-bento-card-glow" aria-hidden="true"></div>
                <span class="site-crypto-icon-ring site-crypto-icon-ring--sm mb-5" aria-hidden="true">
                  <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </span>
                <div class="font-mono text-4xl font-bold tracking-tight text-app-accent md:text-5xl">256</div>
                <p class="mt-2 text-sm font-bold uppercase tracking-wider text-app-text">Bit AES keys</p>
                <p class="site-p mt-4 text-[0.95rem] leading-relaxed">
                  Per-item material with AES-256-GCM, authenticated encryption for every vault entry.
                </p>
              </div>
              <div class="site-crypto-bento-card site-crypto-bento-card--muted">
                <span class="site-crypto-icon-ring site-crypto-icon-ring--sm mb-5 opacity-90" aria-hidden="true">
                  <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </span>
                <p class="text-sm font-bold uppercase tracking-wider text-app-text">Browser-native crypto</p>
                <p class="site-p mt-4 text-[0.95rem] leading-relaxed">
                  Standard browser APIs for AES-GCM wraps and payloads; Argon2id derivation tuned for real devices, not server-only
                  assumptions.
                </p>
                <div class="mt-6 flex flex-wrap gap-2">
                  <span class="site-crypto-chip">AES-GCM</span>
                  <span class="site-crypto-chip">AEAD</span>
                  <span class="site-crypto-chip">Argon2id</span>
                </div>
              </div>
            </div>
          </div>
          <div class="site-story-grid">
              <div class="site-home-story">
                <div class="mb-6 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <span class="site-panel-label">Unlock cost</span>
                </div>
                <h3 class="site-showcase-title">Memory-hard KDF</h3>
                <p class="site-p mt-5">
                  Argon2id runs in your browser: memory-hard work makes guessing expensive compared with plain fast hashes.
                  Derivation runs on bootstrap/unlock, not every request. Keep the tab open; a short wait is part of the design.
                </p>
              </div>
              <div class="site-home-story site-home-story--muted">
                <div class="mb-6 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <span class="site-panel-label">Recovery lane</span>
                </div>
                <h3 class="site-showcase-title">Second envelope</h3>
                <p class="site-p mt-5">
                  Optional recovery artifact wraps the same VK under a separate recovery secret (different derivation path).
                  Lose <strong class="text-app-text">both</strong> lanes and ciphertext stays math, intentional zero-knowledge,
                  not spite.
                </p>
              </div>
          </div>
        </div>
      </div>

      <div class="site-home-band site-home-band--plain">
      <div class="site-divider">
        <div class="site-divider-line"></div>
        <span class="site-divider-label">Explore</span>
        <div class="site-divider-line"></div>
      </div>

      <nav class="site-page-nav site-page-nav--explore" aria-label="Explore more">
        <a routerLink="/product" class="site-explore-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Product
        </a>
        <a routerLink="/security" class="site-explore-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Security
        </a>
        <a routerLink="/faq" class="site-explore-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          FAQ
        </a>
      </nav>
      </div>
    </div>
  `,
})
export class HomePageComponent {}
