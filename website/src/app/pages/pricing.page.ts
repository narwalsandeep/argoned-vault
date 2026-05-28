import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const VAULT_ORIGIN = 'https://vault.argoned.com';
const REPO_URL = 'https://github.com/switchcodes/argoned';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="site-hero">
      <div
        class="site-hero-glow"
        style="background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(199,62,62,0.35), transparent), radial-gradient(circle at 15% 50%, rgba(199,62,62,0.12), transparent 40%), radial-gradient(circle at 85% 30%, rgba(199,62,62,0.1), transparent 45%);"
        aria-hidden="true"
      ></div>
      <div class="site-hero-inner">
        <p class="site-kicker mb-6 md:mb-7">Pricing</p>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
          <span class="site-badge">Same crypto on every tier</span>
          <span class="site-tag">GBP · billed in the vault</span>
        </div>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Plans with personality, limits without drama</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Pick a capacity that fits you: same client-side encryption and free updates on every tier.
        </p>
        <div class="site-hero-actions">
          <a href="${VAULT_ORIGIN}/pricing" rel="noopener noreferrer" class="site-btn-primary">
            <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Open vault pricing
          </a>
          <a routerLink="/security" class="site-btn-secondary">
            <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Why trust us
          </a>
        </div>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band site-home-band--alt">
        <div class="site-band-stack">
          <div class="site-section-head mx-auto max-w-3xl text-center">
            <h2 class="site-section-title">Three ways to say “my keys, my rules”</h2>
            <p class="site-p mx-auto mt-2 max-w-2xl">
              Numbers match what you see inside the vault: no marketing inflation, no mystery fees hiding in the footnotes.
            </p>
          </div>

          <aside class="site-pricing-import-spotlight" aria-labelledby="site-pricing-import-title">
            <div class="site-pricing-import-inner">
              <div class="site-pricing-import-icon" aria-hidden="true">
                <svg fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M4.5 3.75h15a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-15a.75.75 0 0 1 .75-.75Z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="site-pricing-import-pill">Pro &amp; Lifetime</p>
                <h3 id="site-pricing-import-title" class="site-pricing-import-title">Bring every password in with one encrypted import</h3>
                <p class="site-pricing-import-lede">
                  Drop a <strong class="text-app-text">CSV</strong> or <strong class="text-app-text">JSON</strong> export from your old manager (or a custom dump).
                </p>
              </div>
              <div class="site-pricing-import-actions">
                <a
                  href="${VAULT_ORIGIN}/new/import"
                  rel="noopener noreferrer"
                  class="site-btn-primary inline-flex w-full items-center justify-center gap-2 whitespace-nowrap px-5 py-3 text-center sm:w-max"
                >
                  Open import in the vault
                </a>
              </div>
            </div>
          </aside>

          <div class="site-pricing-tier-grid">
            <!-- Free -->
            <article class="site-pricing-card">
              <div class="site-pricing-flair">
                <div class="site-pricing-flair-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <p class="site-pricing-flair-copy">
                  Free is free forever with no card required, and it is honestly amazing. Stay as safe as possible without
                  opening your wallet; we will still cheer for you from the sidelines.
                </p>
              </div>
              <div class="site-pricing-heading-rule" role="presentation"></div>
              <div class="site-pricing-name-row">
                <h3 class="site-pricing-name m-0">Free</h3>
              </div>
              <p class="site-pricing-price">£0 <span class="site-pricing-period">forever</span></p>
              <p class="site-pricing-blurb">Perfect for trying Argoned or a small personal vault.</p>
              <ul class="site-pricing-list" role="list">
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">Up to 8</strong> vault items</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Full encryption pipeline (same as paid)</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">All future updates</strong> included</span>
                </li>
                <li class="site-pricing-list-item--muted" role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  <span
                    ><strong class="text-app-text">Bulk import (CSV / JSON)</strong> is for
                    <strong class="text-app-text">Pro &amp; Lifetime</strong>; upgrade when your export is ready.</span
                  >
                </li>
              </ul>
              <div class="site-pricing-actions">
                <a
                  href="${VAULT_ORIGIN}/pricing#pricing-plan-pro"
                  rel="noopener noreferrer"
                  class="site-btn-outline w-full justify-center py-3 text-center"
                >
                  Compare upgrades
                </a>
              </div>
            </article>

            <!-- Pro -->
            <article class="site-pricing-card" aria-labelledby="site-pricing-pro-title">
              <div class="site-pricing-flair">
                <div class="site-pricing-flair-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.75 13.5 10.5 2.25 12 9 21 8.25 12.75 21.75 11.25 15 3 15.75 3.75 13.5Z"
                    />
                  </svg>
                </div>
                <p class="site-pricing-flair-copy">
                  About the price of one chai latte a month for us: you keep the cup, we keep your passwords absurdly safe. Every
                  future upgrade ships to you at no extra charge.
                </p>
              </div>
              <div class="site-pricing-heading-rule" role="presentation"></div>
              <div class="site-pricing-name-row">
                <h3 class="site-pricing-name m-0" id="site-pricing-pro-title">Pro</h3>
              </div>
              <p class="site-pricing-price">
                £2.99 <span class="site-pricing-period">/ month · GBP</span>
              </p>
              <p class="site-pricing-blurb">More room for individuals who keep most secrets in one vault.</p>
              <ul class="site-pricing-list" role="list">
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">Up to 512</strong> vault items</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span
                    ><strong class="text-app-text">Bulk vault import</strong>: guided <strong class="text-app-text">CSV</strong> &amp;
                    <strong class="text-app-text">JSON</strong> to migrate an entire export in one session</span
                  >
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Same security &amp; recovery options as Free</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">All future updates</strong> included</span>
                </li>
              </ul>
              <div class="site-pricing-actions">
                <a
                  href="${VAULT_ORIGIN}/pricing?plan=pro"
                  rel="noopener noreferrer"
                  class="site-btn-primary w-full justify-center py-3 text-center"
                >
                  Upgrade to Pro in the vault
                </a>
              </div>
            </article>

            <!-- Lifetime -->
            <article class="site-pricing-card">
              <div class="site-pricing-flair">
                <div class="site-pricing-flair-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                    />
                  </svg>
                </div>
                <p class="site-pricing-flair-copy">
                  Pay once, party forever: maximum vault, minimum subscription fatigue. It is the deluxe seatbelt you buy before
                  you even know you will need it, and yes, it still sparkles.
                </p>
              </div>
              <div class="site-pricing-heading-rule" role="presentation"></div>
              <div class="site-pricing-name-row">
                <h3 class="site-pricing-name m-0">Lifetime</h3>
                <button
                  type="button"
                  class="site-pricing-lifetime-policy-trigger"
                  aria-label="Lifetime availability, discontinuation notice, and refunds"
                  [attr.aria-expanded]="lifetimePolicyOpen()"
                  (click)="openLifetimePolicy()"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
              <p class="site-pricing-price">
                £99 <span class="site-pricing-period">one-time · GBP</span>
              </p>
              <p class="site-pricing-blurb">
                Maximum vault capacity for a single payment, ideal if you prefer pay-once over a subscription.
              </p>
              <ul class="site-pricing-list" role="list">
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">Up to 512</strong> vault items</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span
                    ><strong class="text-app-text">Bulk vault import</strong>: same <strong class="text-app-text">CSV</strong> &amp;
                    <strong class="text-app-text">JSON</strong> tools as Pro for one-time vault moves</span
                  >
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No recurring charge after purchase</span>
                </li>
                <li role="listitem">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong class="text-app-text">All future updates</strong> included</span>
                </li>
              </ul>
              <div class="site-pricing-actions">
                <a
                  href="${VAULT_ORIGIN}/pricing?plan=lifetime"
                  rel="noopener noreferrer"
                  class="site-btn-primary w-full justify-center py-3 text-center"
                >
                  Get Lifetime in the vault
                </a>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="site-card-soft">
        <div class="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 class="site-h2 m-0">Security &amp; product</h2>
          <span class="text-sm font-semibold text-app-text-muted">·</span>
          <p class="m-0 text-sm font-semibold uppercase tracking-wide text-app-accent">Every plan</p>
        </div>
        <p class="site-p mb-8 max-w-none">
          We do not sell tiers that strip encryption. Limits are about capacity; the vault model stays the same.
        </p>
        <div class="site-pricing-security-grid">
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">AES-256-GCM envelopes</p>
              <p class="mt-1 text-sm text-app-text-muted">
                Per-item keys wrapped under your vault key, encrypted in the browser before upload.
              </p>
            </div>
          </div>
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">Argon2id vault unlock</p>
              <p class="mt-1 text-sm text-app-text-muted">
                Memory-hard KDF with server-stored salt and parameters, no plaintext master key on disk.
              </p>
            </div>
          </div>
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">Session &amp; CSRF hygiene</p>
              <p class="mt-1 text-sm text-app-text-muted">
                Cookie auth with CSRF on mutating API calls; vault key cleared on lock or logout.
              </p>
            </div>
          </div>
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">Recovery artifacts</p>
              <p class="mt-1 text-sm text-app-text-muted">
                Optional recovery material separate from your login password; export an emergency kit from Settings.
              </p>
            </div>
          </div>
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">Typed credentials</p>
              <p class="mt-1 text-sm text-app-text-muted">
                Website, database, SSH-style flows with room to grow, same vault encryption for each subtype.
              </p>
            </div>
          </div>
          <div class="site-pricing-security-item">
            <div class="site-pricing-security-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-app-text">Updates for everyone</p>
              <p class="mt-1 text-sm text-app-text-muted">
                New features and hardening ship to every tier; limits stay about item counts, not trust.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p class="site-p text-center text-sm">
        Curious about the nitty-gritty? Visit
        <a routerLink="/faq" class="font-semibold text-app-accent underline-offset-2 hover:underline">FAQ</a>
        and
        <a routerLink="/security" class="font-semibold text-app-accent underline-offset-2 hover:underline">Security</a>
        , or
        <a href="${REPO_URL}" class="font-semibold text-app-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer"
          >browse the repo on GitHub</a
        >.
      </p>

      <nav class="site-page-nav site-page-nav--explore" aria-label="Explore more">
        <a routerLink="/product" class="site-explore-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Product tour
        </a>
        <a href="${VAULT_ORIGIN}" rel="noopener noreferrer" class="site-explore-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Open web vault
        </a>
      </nav>

      @if (lifetimePolicyOpen()) {
        <div class="site-pricing-dialog-overlay" role="presentation" (click)="closeLifetimePolicy()">
          <div
            class="site-pricing-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-pricing-lifetime-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              class="site-pricing-dialog-close"
              aria-label="Close dialog"
              (click)="closeLifetimePolicy()"
            >
              <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p class="m-0 text-xs font-semibold uppercase tracking-wide text-app-accent">Pay-once tier</p>
            <h2 id="site-pricing-lifetime-dialog-title" class="site-h2 m-0 mt-2 text-xl sm:text-2xl">
              Lifetime availability &amp; refunds
            </h2>
            <p class="site-p m-0 mt-4 text-sm leading-relaxed text-app-text-muted">
              Lifetime is available while Argoned is operated. If we discontinue the service, we will provide advance notice and
              in-app guidance for account closure and data handling options that are available at that time. Refunds, if offered,
              may be requested only within the first 30 days after purchase; see
              <a routerLink="/terms" class="font-semibold text-app-accent underline-offset-2 hover:underline">Terms</a>.
            </p>
            <div class="mt-6 flex justify-center border-t border-app-border pt-4">
              <button type="button" class="site-btn-primary px-8" (click)="closeLifetimePolicy()">Got it</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PricingPageComponent {
  readonly lifetimePolicyOpen = signal(false);

  openLifetimePolicy(): void {
    this.lifetimePolicyOpen.set(true);
  }

  closeLifetimePolicy(): void {
    this.lifetimePolicyOpen.set(false);
  }
}
