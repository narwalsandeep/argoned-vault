import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-page',
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
        <p class="site-kicker mb-6 md:mb-7">Product</p>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
          <span class="site-badge"><span aria-hidden="true" class="mr-1.5">✓</span>Onboarding</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Vault session</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Client-side crypto</span>
        </div>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Where the crypto actually runs</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Onboarding, vault profile, unlock, item encryption, and guard rails, all in the app you use in the browser, with
          cryptography designed so routine sync never needs your plaintext.
        </p>
        <div class="site-hero-actions">
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
          <a routerLink="/security" class="site-btn-secondary">
            <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Security deep dive
          </a>
        </div>
      </div>
    </section>

    <div class="site-page site-page--product">
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Onboarding &amp; unlock</span>
            </div>
            <h2 class="site-subdisplay max-w-4xl text-balance">From first login to keys held only in memory.</h2>
          </div>
          <div class="space-y-16 md:space-y-24">
            <section aria-labelledby="product-onboarding-timeline-title">
              <h3 id="product-onboarding-timeline-title" class="site-timeline-track-title">First-time setup</h3>
              <ol class="site-timeline">
                <li class="site-timeline-step site-timeline-step--left">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">1</span>
                    </div>
                    <h4 class="site-timeline-title">Welcome &amp; your unlock secret</h4>
                    <p class="site-timeline-body">
                      You go through a short welcome flow and choose a <strong class="text-app-text">vault unlock secret</strong>. The
                      app enforces a strong minimum so guessing stays hard. You can show or copy it carefully if you need to.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--right">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">2</span>
                    </div>
                    <h4 class="site-timeline-title">One-time “heavy lift” in the browser</h4>
                    <p class="site-timeline-body">
                      Next, <strong class="text-app-text">Argon2id</strong> runs in your tab with safe limits for real laptops (time,
                      memory, parallelism). It can take a little while. <strong class="text-app-text">Keep the tab open</strong> until
                      it finishes. This is normal, not a bug.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--left">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">3</span>
                    </div>
                    <h4 class="site-timeline-title">Pick how long the app can sit idle</h4>
                    <p class="site-timeline-body">
                      You set <strong class="text-app-text">session auto-lock</strong>. After that many minutes of no mouse, keyboard,
                      or touch, the vault locks itself.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--right">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">4</span>
                    </div>
                    <h4 class="site-timeline-title">Keys stay with you; the server gets locks, not secrets</h4>
                    <p class="site-timeline-body">
                      When you save, this device creates random material, derives an <strong class="text-app-text">unlock key</strong>,
                      creates a <strong class="text-app-text">vault key</strong>, and wraps the vault key so only your secret can open
                      it. Only <strong class="text-app-text">protected data and settings</strong> are uploaded, never your raw vault
                      key or unlock secret.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
              </ol>
            </section>

            <div class="site-timeline-between" role="presentation"></div>

            <section aria-labelledby="product-return-timeline-title">
              <h3 id="product-return-timeline-title" class="site-timeline-track-title">When you come back</h3>
              <ol class="site-timeline">
                <li class="site-timeline-step site-timeline-step--left">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">1</span>
                    </div>
                    <h4 class="site-timeline-title">Sign in to your account</h4>
                    <p class="site-timeline-body">
                      You log in the usual way. The app downloads your <strong class="text-app-text">vault profile</strong> (salt,
                      wrapped keys, and related metadata), not plaintext passwords or raw vault keys.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--right">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">2</span>
                    </div>
                    <h4 class="site-timeline-title">Enter your unlock secret again</h4>
                    <p class="site-timeline-body">
                      The app runs the same hard work in your browser, rebuilds the keys, and <strong class="text-app-text">only keeps
                      the vault key in this tab’s memory</strong> while you work.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--left">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">3</span>
                    </div>
                    <h4 class="site-timeline-title">Use the vault; activity resets the timer</h4>
                    <p class="site-timeline-body">
                      Mouse, keyboard, and touch activity <strong class="text-app-text">reset the auto-lock countdown</strong> so an
                      active session stays open until you stop or hit the limit.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
                <li class="site-timeline-step site-timeline-step--right">
                  <div class="site-timeline-panel">
                    <div class="site-timeline-panel-head">
                      <span class="site-timeline-badge" aria-hidden="true">4</span>
                    </div>
                    <h4 class="site-timeline-title">Lock or log out when you’re done</h4>
                    <p class="site-timeline-body">
                      <strong class="text-app-text">Lock</strong> or <strong class="text-app-text">logout</strong> clears the vault key
                      from memory. Extra route guards can clear it when you navigate away, a safety net if you walk away without
                      locking.
                    </p>
                  </div>
                  <div class="site-timeline-spine--mobile" aria-hidden="true"></div>
                  <div class="site-timeline-axis" aria-hidden="true"><span class="site-timeline-node"></span></div>
                  <div class="site-timeline-gutter" aria-hidden="true"></div>
                </li>
              </ol>
            </section>
          </div>
        </div>
      </div>

      <div class="site-home-band site-home-band--plain">
        <div class="site-divider">
          <div class="site-divider-line"></div>
          <span class="site-divider-label">Items</span>
          <div class="site-divider-line"></div>
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
                <span class="site-showcase-eyebrow">Vault items</span>
              </div>
              <h2 class="site-showcase-title max-w-4xl text-balance">Creating &amp; editing vault items</h2>
            </div>
            <div class="site-statement">
              <p class="site-statement-text">
                Each secret is sealed in its own encrypted package, harmless listing details stay on the side, and the app only
                finishes a save when your vault is really unlocked, if something is wrong, you get a clear error instead of a quiet
                “saved” that never actually happened.
              </p>
            </div>
            <div class="site-story-grid">
              <div class="site-home-story">
                <div class="mb-6 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </span>
                  <span class="site-panel-label">Envelope</span>
                </div>
                <h3 class="site-showcase-title text-xl md:text-2xl">DEK + payload</h3>
                <p class="site-p mt-5">
                  With VK loaded, each save generates a <strong class="text-app-text">random per-item DEK</strong>. The client
                  wraps the DEK with VK and encrypts canonical item JSON. Optional
                  <strong class="text-app-text">label</strong> ciphertext keeps list views from leaking titles on the server.
                </p>
                <p class="site-p mt-4">
                  <strong class="text-app-text">item_type</strong> is UX metadata, security comes from the AEAD blobs.
                </p>
              </div>
              <div class="site-home-story site-home-story--muted">
                <div class="mb-6 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </span>
                  <span class="site-panel-label">Guard rail</span>
                </div>
                <h3 class="site-showcase-title text-xl md:text-2xl">Vault must be unlocked</h3>
                <p class="site-p mt-5">
                  Create flows check unlock before encrypting; otherwise a clear error, not a silent fake save.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Free plan</span>
            </div>
            <h2 class="site-subdisplay max-w-4xl text-balance">Zero cost to start. No fine-print traps.</h2>
            <p class="site-p max-w-3xl">
              Argoned ships with a <strong class="text-app-text">free tier</strong> on purpose: everyone deserves access to a
              serious, client-side vault, not a stripped teaser that turns hostile after a week. No credit card, no surprise
              charges, and no strings attached.
            </p>
          </div>
          <div
            class="site-card site-card-interactive mx-auto min-w-0 max-w-2xl border-app-border/40 shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]"
          >
            <div class="space-y-6 p-7 md:space-y-7 md:p-9">
              <ul class="site-promise-list">
                <li class="flex gap-3.5">
                  <span class="site-check-bubble" aria-hidden="true">
                    <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="site-p !text-[1.02rem] md:!text-[1.08rem]">
                    <strong class="text-app-text">No hidden costs</strong>, what you see is what you get. We do not bury fees,
                    “activation” charges, or mandatory add-ons in the flow.
                  </span>
                </li>
                <li class="flex gap-3.5">
                  <span class="site-check-bubble" aria-hidden="true">
                    <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="site-p !text-[1.02rem] md:!text-[1.08rem]">
                    <strong class="text-app-text">No strings attached</strong>, use the product because it helps you, not because
                    you are locked into a contract or upsell treadmill.
                  </span>
                </li>
                <li class="flex gap-3.5">
                  <span class="site-check-bubble" aria-hidden="true">
                    <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="site-p !text-[1.02rem] md:!text-[1.08rem]">
                    <strong class="text-app-text">For everyone</strong>, especially individuals who want a clear crypto model
                    without a sales call first.
                  </span>
                </li>
              </ul>
              <div class="flex flex-col items-center gap-4 border-t border-app-border/40 pt-6 md:pt-7">
                <p class="text-center text-sm font-medium text-app-text-muted md:text-base">
                  Paid options may exist later for heavier use, the free plan stays an honest baseline, not a bait-and-switch.
                </p>
                <a href="https://vault.argoned.com" rel="noopener noreferrer" class="site-btn-primary">
                  <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Get started free
                </a>
              </div>
            </div>
          </div>
        </div>
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Expectations</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">Zero-knowledge reality check</h2>
          </div>
          <div class="site-card site-card-interactive border-app-border/40 shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]">
            <div class="p-7 md:p-9">
              <div class="mb-4 flex items-center gap-3">
                <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                  <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </span>
                <span class="site-panel-label">No magic reset</span>
              </div>
              <p class="site-p">
                If you expect the server to “reset my vault password” and decrypt old rows, you will be disappointed in a rigorous
                way. That is the model working as intended.
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

        <nav class="site-page-nav site-page-nav--explore" aria-label="Related pages">
          <a routerLink="/" class="site-explore-link">
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
export class ProductPageComponent {}
