import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { catchError, filter, merge, of, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  VAULT_ENCRYPTED_ITEMS_ROUTE,
  VAULT_SESSION_ROUTE,
  VAULT_SETTINGS_ROUTE,
} from '../../core/vault/vault-app-paths';
import { VaultService } from '../../core/vault/vault.service';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultSessionService } from '../../core/vault/vault-session.service';
import { formatArgonProfileTune, summarizeVaultItemTypes } from './dashboard-live-stats.helpers';
import { DASHBOARD_CRYPTO_STATS, type DashboardStaticStat } from './dashboard-stats.constants';

interface HealthLivePayload {
  readonly status: string;
  readonly service: string;
  readonly check: string;
  readonly time: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="settings-layout">
        <div class="settings-main">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Stats</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">Overview</span>
            </h1>
          </header>

          <section class="mb-10" aria-labelledby="dash-live-heading">
            <h2 id="dash-live-heading" class="tab-panel-heading">
              <span class="tab-panel-heading-title">Live workspace</span>
              <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
              <span class="tab-panel-heading-kicker">This tab · vault</span>
            </h2>
            <div class="dashboard-stat-grid mt-5">
              <div class="dashboard-stat-card dashboard-stat-card--live">
                <div
                  class="dashboard-stat-icon"
                  [class.dashboard-stat-icon--vault-locked]="!vaultUnlocked"
                  aria-hidden="true"
                >
                  @if (vaultUnlocked) {
                    <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 11V7a5 5 0 0 1 9.9 -1"
                      />
                    </svg>
                  } @else {
                    <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  }
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Vault key (this tab)</div>
                  <div class="dashboard-stat-value">{{ vaultUnlocked ? 'Unlocked' : 'Locked' }}</div>
                </div>
                <p class="dashboard-stat-detail">{{ vaultKeyDetail }}</p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Encrypted items</div>
                  <div class="dashboard-stat-value">
                    @if (itemCount === null) {
                      <span class="text-app-text-muted">…</span>
                    } @else {
                      {{ itemCount }}<span class="ml-1.5 text-base font-normal text-app-text-muted">· {{ itemDistinctTypes }} types</span>
                    }
                  </div>
                </div>
                <p class="dashboard-stat-detail">
                  Counts use your vault item list metadata only; ciphertext stays sealed until you open an item.
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Session</div>
                  <div class="dashboard-stat-value">{{ apiSessionLabel }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  {{
                    hasCsrf
                      ? 'Signed in: the app keeps an extra browser token for sensitive changes. It stays ready while your session is active.'
                      : 'Signed in: extra protection finishes loading as your account details restore. Normal right after opening a new tab.'
                  }}
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">KDF salt (profile)</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">{{ kdfSaltPreview }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  @if (profileKdfTune !== 'No profile') {
                    <span class="dashboard-stat-detail-append font-mono text-app-text">{{ profileKdfTune }}</span>
                  }
                  @if (profileCryptoVersion !== null) {
                    <span class="dashboard-stat-detail-append font-mono text-app-text">
                      Profile format version: {{ profileCryptoVersion }}
                    </span>
                  }
                </p>
              </div>
            </div>
          </section>

          <section class="mb-10" aria-labelledby="dash-probes-heading">
            <h2 id="dash-probes-heading" class="tab-panel-heading">
              <span class="tab-panel-heading-title">Probes &amp; runtime</span>
              <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
              <span class="tab-panel-heading-kicker">Server · browser</span>
            </h2>
            <div class="dashboard-stat-grid mt-5">
              <div class="dashboard-stat-card dashboard-stat-card--live">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-16.5 0h16.5m-16.5 0l3.75 3.75M19.5 18l-3.75-3.75"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Server reachability</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">{{ apiHealthValue }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  About every 45 seconds this tab measures round-trip time and reads the server clock in UTC. Values refresh while you
                  stay on Stats.
                  @if (apiHealthServerTime) {
                    <span class="dashboard-stat-detail-append dashboard-stat-detail-append--clamp font-mono text-app-text">{{
                      apiHealthServerTime
                    }}</span>
                  }
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Web platform</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">{{ subtleCryptoLabel }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  Confirms Web Crypto, HTTPS context, and the host you are on.
                  <span class="dashboard-stat-detail-append break-all font-mono text-app-text"
                    >Secure context {{ secureContextLabel }} · {{ originLabel }}</span
                  >
                  @if (userAgentPreview !== '') {
                    <span class="dashboard-stat-detail-append dashboard-stat-detail-append--clamp text-app-text-muted">{{
                      userAgentPreview
                    }}</span>
                  }
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 6v12m6-6H6M3.75 3h16.5a.75.75 0 01.75.75v16.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 20.25V3.75A.75.75 0 013.75 3z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Auth transport</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">Cookie + CSRF</div>
                </div>
                <p class="dashboard-stat-detail">
                  Cookie-based sign-in covers normal browsing. Saving or changing protected data also sends a matching token issued to
                  this browser.
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 11-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Account posture</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">{{ accountIdentityLabel }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  Verification: {{ emailVerificationLabel }}. The name shown here prefers your profile name and falls back to your
                  email when no display name is set.
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 9v3.75m-6.75-1.5l-1.5 1.5m13.5-1.5l1.5 1.5M12 3.75v1.5m0 13.5v1.5M4.5 7.5l1.5 1.5m12-1.5l-1.5 1.5M3.75 12a8.25 8.25 0 1116.5 0 8.25 8.25 0 01-16.5 0z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Recovery artifact</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">{{ recoveryArtifactStatus }}</div>
                </div>
                <p class="dashboard-stat-detail">
                  Shows whether a recovery artifact exists for your account. Create or rotate one anytime from Settings → Recovery when
                  you rely on recovery.
                  @if (recoveryArtifactCreatedAtLabel !== null) {
                    <span class="dashboard-stat-detail-append dashboard-stat-detail-append--clamp font-mono text-app-text"
                      >Created {{ recoveryArtifactCreatedAtLabel }}</span
                    >
                  }
                </p>
              </div>

              <div class="dashboard-stat-card">
                <div class="dashboard-stat-icon" aria-hidden="true">
                  <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.75 9h16.5m-16.5 6.75h16.5M3.75 3h16.5A2.25 2.25 0 0122.5 5.25v13.5a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18.75V5.25A2.25 2.25 0 013.75 3zM6 12h.008v.008H6V12zm0 2.25h.008v.008H6v-.008zm0 2.25h.008v.008H6v-.008z"
                    />
                  </svg>
                </div>
                <div class="dashboard-stat-body">
                  <div class="dashboard-stat-label">Vault item envelope</div>
                  <div class="dashboard-stat-value font-mono text-sm sm:text-base">Per-item DEK</div>
                </div>
                <p class="dashboard-stat-detail">
                  Each saved item carries its own encryption layer on top of your vault key. Nothing in a row decrypts until you unlock
                  on this device.
                </p>
              </div>
            </div>
          </section>

          <section class="mb-10" aria-labelledby="dash-crypto-heading">
            <h2 id="dash-crypto-heading" class="tab-panel-heading">
              <span class="tab-panel-heading-title">Cryptographic stack</span>
              <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
              <span class="tab-panel-heading-kicker">Quick reference</span>
            </h2>
            <div class="dashboard-stat-grid mt-5">
              @for (stat of staticStats; track stat.label) {
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-icon" aria-hidden="true">
                    @switch (stat.icon) {
                      @case ('aes') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.967 3.746 3.746 0 01-3.967 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.967-1.043 3.745 3.745 0 01-1.043-3.967A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.967 3.746 3.746 0 013.967-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.967 1.043 3.746 3.746 0 011.043 3.967A3.745 3.745 0 0121 12z"
                          />
                        </svg>
                      }
                      @case ('argon') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                          />
                        </svg>
                      }
                      @case ('envelope') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M7.5 7.5h9v9h-9v-9zM7.5 7.5L12 3.75 16.5 7.5M12 12.75h.008v.008H12v-.008z"
                          />
                        </svg>
                      }
                      @case ('nonce') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                          />
                        </svg>
                      }
                      @case ('version') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                          />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                        </svg>
                      }
                      @case ('browser') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"
                          />
                        </svg>
                      }
                      @case ('routes') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 6.75H15M9 12h6m-6 5.25h12M4.875 19.125h-1.5a.375.375 0 01-.375-.375V5.25a.375.375 0 01.375-.375h1.5M4.875 12h.007v.008H4.875V12zm.375 0a.375.375 0 10-.375.375.375.375 0 00.375-.375zm7.875-3.375a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m-.375 0h.008v.008H12V8.625zM17.25 12h.007v.008h-.007V12zm.375 0a.375.375 0 10-.375.375.375.375 0 00.375-.375zm-7.875 3.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m-.375 0h.008v.008H12V15.375z"
                          />
                        </svg>
                      }
                      @case ('recovery') {
                        <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                          />
                        </svg>
                      }
                    }
                  </div>
                  <div class="dashboard-stat-body">
                    <div class="dashboard-stat-label">{{ stat.label }}</div>
                    <div class="dashboard-stat-value">{{ stat.value }}</div>
                  </div>
                  <p class="dashboard-stat-detail">{{ stat.detail }}</p>
                </div>
              }
            </div>
          </section>
        </div>

        <aside class="settings-aside" aria-label="Shortcuts and help for Stats">
          <div class="settings-help-panel">
            <h2 class="settings-help-heading">Shortcuts</h2>
            <div class="settings-help-hero">
              <div class="settings-help-hero-icon" aria-hidden="true">
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div class="settings-help-hero-text">
                <p class="settings-help-hero-title">Quick navigation</p>
                <p class="settings-help-hero-sub">
                  Shortcuts and tips; numbers and probes stay in the main column.
                </p>
              </div>
            </div>

            <nav class="dashboard-help-shortcuts settings-help-nav-links" aria-label="High-traffic app areas">
              <a [routerLink]="encryptedVaultPath" class="settings-help-nav-link">
                <span class="settings-help-nav-link-title">Vault</span>
                <span class="settings-help-nav-link-text">Unlock and open encrypted items.</span>
              </a>
              <a [routerLink]="sessionPath" class="settings-help-nav-link">
                <span class="settings-help-nav-link-title">Session</span>
                <span class="settings-help-nav-link-text">Idle lock and this-tab vault state.</span>
              </a>
              <a routerLink="/new" class="settings-help-nav-link">
                <span class="settings-help-nav-link-title">Create</span>
                <span class="settings-help-nav-link-text">Create new vault items.</span>
              </a>
              <a [routerLink]="settingsPath" class="settings-help-nav-link">
                <span class="settings-help-nav-link-title">Settings</span>
                <span class="settings-help-nav-link-text">Profile, KDF, recovery.</span>
              </a>
              <a routerLink="/docs" class="settings-help-nav-link">
                <span class="settings-help-nav-link-title">Docs</span>
                <span class="settings-help-nav-link-text">Routes and technical reference.</span>
              </a>
            </nav>

            <p class="settings-help-section-label">Reading this overview</p>
            <div class="settings-help-tips">
              <div class="settings-help-tip">
                <span class="settings-help-tip-icon" aria-hidden="true">
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </span>
                <p class="settings-help-tip-body">
                  <strong>Live workspace.</strong> Lock state is per tab. Counts use item list metadata only (no plaintext).
                </p>
              </div>
              <div class="settings-help-tip">
                <span class="settings-help-tip-icon" aria-hidden="true">
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-16.5 0h16.5m-16.5 0l3.75 3.75M19.5 18l-3.75-3.75"
                    />
                  </svg>
                </span>
                <p class="settings-help-tip-body">
                  <strong>Probes.</strong> Periodic reachability check: round-trip time and server clock. No vault unlock needed.
                </p>
              </div>
              <div class="settings-help-tip">
                <span class="settings-help-tip-icon" aria-hidden="true">
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </span>
                <p class="settings-help-tip-body">
                  <strong>Crypto stack.</strong> Short summary of how encryption is wired; see Docs for deeper technical notes.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  public readonly encryptedVaultPath = VAULT_ENCRYPTED_ITEMS_ROUTE;
  public readonly sessionPath = VAULT_SESSION_ROUTE;
  public readonly settingsPath = VAULT_SETTINGS_ROUTE;

  public readonly staticStats: readonly DashboardStaticStat[] = DASHBOARD_CRYPTO_STATS;

  public itemCount: number | null = null;
  public itemDistinctTypes = 0;
  public vaultUnlocked = false;
  public kdfSaltPreview = ', ';
  public profileKdfTune = 'No profile';
  public profileCryptoVersion: number | null = null;

  public apiHealthState: 'idle' | 'loading' | 'ok' | 'error' = 'idle';
  public apiHealthMs: number | null = null;
  public apiHealthServerTime: string | null = null;
  public apiHealthPayloadStatus = '';
  public recoveryArtifactStatus = 'Probing…';
  public recoveryArtifactCreatedAt: string | null = null;

  private readonly destroyRef = inject(DestroyRef);

  public constructor(
    public readonly auth: AuthService,
    private readonly api: ApiClientService,
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly vaultSession: VaultSessionService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    merge(
      this.vaultSession.vaultKeyCleared$,
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLiveStats();
        this.cdr.markForCheck();
      });
  }

  public ngOnInit(): void {
    this.refreshLiveStats();
    this.loadItemCount();
    this.loadProfileSaltPreview();
    this.loadRecoveryArtifactSummary();
    timer(0, 45_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshApiHealth());
  }

  public get hasCsrf(): boolean {
    return (this.auth.csrfToken() ?? '').length > 0;
  }

  public get apiSessionLabel(): string {
    return this.hasCsrf ? 'Authenticated' : 'Restoring…';
  }

  public get vaultKeyDetail(): string {
    if (!this.vaultUnlocked) {
      return 'Locked: unlock with your passphrase to derive the key. Nothing usable stays in memory until then.';
    }
    const ms = this.crypto.getAutoLockTimeoutMs();
    const min = Math.max(1, Math.round(ms / 60_000));
    const deadline = this.crypto.getAutoLockDeadlineEpochMs();
    const base =
      'Unlocked: encryption key lives in this tab only. Cleared on lock or sign-out.';
    if (deadline !== null) {
      const sec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      return `${base} Idle lock in ~${sec}s (up to ~${min} min idle).`;
    }
    return `${base} Auto-lock after about ${min} min idle.`;
  }

  public get apiHealthValue(): string {
    if (this.apiHealthState === 'loading') {
      return 'Probing…';
    }
    if (this.apiHealthState === 'error') {
      return 'Unreachable';
    }
    if (this.apiHealthState === 'idle') {
      return '—';
    }
    const ms = this.apiHealthMs ?? '—';
    const st = this.apiHealthPayloadStatus || 'ok';
    return `${st} · ${ms} ms`;
  }

  public get subtleCryptoLabel(): string {
    return typeof crypto !== 'undefined' && crypto.subtle ? 'SubtleCrypto ✓' : 'SubtleCrypto ✗';
  }

  public get secureContextLabel(): string {
    return globalThis.isSecureContext === true ? 'true' : 'false';
  }

  public get originLabel(): string {
    try {
      return globalThis.location?.origin ?? '—';
    } catch {
      return '—';
    }
  }

  public get userAgentPreview(): string {
    if (typeof navigator === 'undefined' || !navigator.userAgent) {
      return '';
    }
    const ua = navigator.userAgent;
    return ua.length > 96 ? `${ua.slice(0, 96)}…` : ua;
  }

  public get accountIdentityLabel(): string {
    const user = this.auth.user();
    if (user === null) {
      return 'No user';
    }
    return user.display_name?.trim() || user.email || user.id;
  }

  public get emailVerificationLabel(): string {
    const user = this.auth.user();
    if (user === null) {
      return 'unknown';
    }
    return user.email_verified === true ? 'verified' : 'pending';
  }

  public get recoveryArtifactCreatedAtLabel(): string | null {
    if (this.recoveryArtifactCreatedAt === null) {
      return null;
    }
    const date = new Date(this.recoveryArtifactCreatedAt);
    return Number.isNaN(date.getTime()) ? this.recoveryArtifactCreatedAt : date.toISOString();
  }

  private loadItemCount(): void {
    this.vault
      .listItems()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
      )
      .subscribe((items) => {
        const summary = summarizeVaultItemTypes(items);
        this.itemCount = summary.activeCount;
        this.itemDistinctTypes = summary.distinctTypes;
        this.cdr.markForCheck();
      });
  }

  private loadProfileSaltPreview(): void {
    this.vault
      .getProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((res) => {
        if (res?.profile?.kdf_salt) {
          const hex = this.hexPreviewFromBase64(res.profile.kdf_salt);
          this.kdfSaltPreview = hex;
        } else {
          this.kdfSaltPreview = 'No profile';
        }
        const p = res?.profile;
        if (p) {
          this.profileKdfTune = formatArgonProfileTune(p.kdf_algo, p.kdf_params_json);
          this.profileCryptoVersion = typeof p.crypto_version === 'number' ? p.crypto_version : null;
        } else {
          this.profileKdfTune = 'No profile';
          this.profileCryptoVersion = null;
        }
        this.cdr.markForCheck();
      });
  }

  private loadRecoveryArtifactSummary(): void {
    this.vault.getRecoveryArtifact().subscribe({
      next: (response) => {
        this.recoveryArtifactStatus = 'present';
        this.recoveryArtifactCreatedAt = response.artifact.created_at ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.recoveryArtifactCreatedAt = null;
        this.recoveryArtifactStatus = err?.status === 404 ? 'missing' : 'unreachable';
        this.cdr.markForCheck();
      },
    });
  }

  private refreshApiHealth(): void {
    this.apiHealthState = 'loading';
    this.cdr.markForCheck();
    const t0 = performance.now();
    this.api.get<HealthLivePayload>('/health/live').subscribe({
      next: (payload) => {
        this.apiHealthState = 'ok';
        this.apiHealthMs = Math.round(performance.now() - t0);
        this.apiHealthServerTime = payload.time;
        this.apiHealthPayloadStatus = payload.status;
        this.cdr.markForCheck();
      },
      error: () => {
        this.apiHealthState = 'error';
        this.apiHealthMs = null;
        this.apiHealthServerTime = null;
        this.apiHealthPayloadStatus = '';
        this.cdr.markForCheck();
      },
    });
  }

  private refreshLiveStats(): void {
    this.vaultUnlocked = this.crypto.isVaultUnlocked();
  }

  private hexPreviewFromBase64(b64: string): string {
    try {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const slice = raw.slice(0, 8);
      return (
        Array.from(slice)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('') + '…'
      );
    } catch {
      return 'N/A';
    }
  }
}
