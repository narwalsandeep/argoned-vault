import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-site-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div
      class="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-app-bg pb-[env(safe-area-inset-bottom)] text-app-text"
    >
      <div class="h-px w-full bg-gradient-to-r from-transparent via-app-accent to-transparent opacity-80" aria-hidden="true"></div>
      <header
        class="sticky top-0 z-50 border-b border-app-border/80 bg-app-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md"
      >
        <div
          class="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4 sm:pl-6 sm:pr-6"
        >
          <a routerLink="/" class="group flex shrink-0 items-center no-underline" aria-label="Argoned home">
            <span class="site-logo site-logo--nav">
              <span class="site-logo-accent">a</span><span class="site-logo-core">rgoned</span><span class="site-logo-accent">.</span>
            </span>
          </a>
          <nav class="site-header-nav touch-manipulation" aria-label="Primary">
            <a
              routerLink="/"
              routerLinkActive="router-link-active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="site-nav-link"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </a>
            <a routerLink="/product" routerLinkActive="router-link-active" class="site-nav-link">
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
            <a routerLink="/security" routerLinkActive="router-link-active" class="site-nav-link">
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
            <a routerLink="/faq" routerLinkActive="router-link-active" class="site-nav-link">
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
            <a routerLink="/pricing" routerLinkActive="router-link-active" class="site-nav-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V6m18 10.5v.375A2.25 2.25 0 0 1 17.25 16H6.75a2.25 2.25 0 0 1-2.25-2.25V16.5"
                />
              </svg>
              Pricing
            </a>
            <a
              href="https://vault.argoned.com"
              rel="noopener noreferrer"
              class="site-nav-link site-nav-link--cta"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Get started
            </a>
          </nav>
        </div>
      </header>
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <router-outlet />
      </main>
      <footer class="site-footer">
        <div class="site-footer-inner">
          <div class="site-footer-grid">
            <div class="site-footer-brand">
              <a routerLink="/" class="group inline-flex flex-col no-underline" aria-label="Argoned home">
                <span class="site-logo site-logo--footer">
                  <span class="site-logo-accent">a</span><span class="site-logo-core">rgoned</span><span class="site-logo-accent">.</span>
                </span>
                <span class="site-footer-tagline">
                  Client-side vault cryptography, clear trust boundaries, honest recovery, keys that stay with you.
                </span>
              </a>
              <p class="mt-6">
                <a
                  href="https://vault.argoned.com"
                  rel="noopener noreferrer"
                  class="site-footer-link inline-flex items-center gap-2 font-semibold text-app-accent hover:text-app-accent"
                >
                  <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Open web vault
                </a>
              </p>
            </div>
            <div class="site-footer-columns">
              <nav aria-label="Company">
                <p class="site-footer-col-title">Company</p>
                <ul class="site-footer-links">
                  <li>
                    <a routerLink="/pricing" class="site-footer-link">Pricing</a>
                  </li>
                  <li>
                    <a routerLink="/founders" class="site-footer-link">Founders</a>
                  </li>
                  <li>
                    <a routerLink="/company" class="site-footer-link">Company</a>
                  </li>
                  <li>
                    <a routerLink="/contact" class="site-footer-link">Contact</a>
                  </li>
                </ul>
              </nav>
              <nav aria-label="Legal">
                <p class="site-footer-col-title">Legal</p>
                <ul class="site-footer-links">
                  <li>
                    <a routerLink="/terms" class="site-footer-link">Terms of use</a>
                  </li>
                  <li>
                    <a routerLink="/privacy" class="site-footer-link">Privacy policy</a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
          <div class="site-footer-bottom">
            <p class="site-footer-bottom-note">
              Marketing copy is descriptive, not a warranty. Read the
              <a routerLink="/faq">FAQ</a> and <a routerLink="/security">Security</a> pages for how Argoned is designed to behave.
            </p>
            <p class="site-footer-copyright">© 2026 Argoned. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class SiteShellComponent {}
