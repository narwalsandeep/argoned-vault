import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-security-page',
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
        <p class="site-kicker mb-6 md:mb-7">Security</p>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
          <span class="site-badge"><span aria-hidden="true" class="mr-1.5">✓</span>Zero-knowledge</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>AES-256-GCM</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Argon2id</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>CSRF</span>
        </div>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Controls, threats, and limitations</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          How Argoned separates account login from vault crypto, what the server can and cannot see, and where real-world risk
          still lives, in plain language first, with implementation detail where it matters.
        </p>
        <div class="site-hero-actions">
          <a routerLink="/faq" class="site-btn-primary">
            <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            FAQ
          </a>
          <a href="https://vault.argoned.com" rel="noopener noreferrer" class="site-btn-secondary">
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Principles</span>
            </div>
            <h2 class="site-subdisplay max-w-4xl text-balance">Specified algorithms, not slogans</h2>
          </div>
          <div
            class="site-card site-card-interactive mx-auto min-w-0 max-w-3xl border-app-border/40 text-left shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]"
          >
            <div class="border-l-4 border-l-app-accent py-5 pl-5 pr-6 md:py-6 md:pl-7 md:pr-8">
              <p class="site-panel-label mb-2">Stance</p>
              <p class="site-p text-base font-medium italic leading-relaxed text-app-text/90 md:text-lg">
                If your checklist says “bank-grade,” we prefer specified algorithms, explicit trust boundaries, and tests that
                fail when someone gets cute.
              </p>
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Orientation</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">How to read this page</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              Skim the plain-English column first; use the technical column when you are validating architecture or writing
              runbooks.
            </p>
          </div>
          <div class="site-panel-grid site-card-interactive">
            <div class="site-panel-grid-inner">
              <section class="site-panel-grid-cell" aria-labelledby="sec-security-orient-plain">
                <div class="flex flex-col gap-3">
                  <p class="site-panel-label">In plain English</p>
                  <h3 id="sec-security-orient-plain" class="text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">
                    What you are protecting
                  </h3>
                  <p class="site-p text-sm leading-relaxed md:text-base">
                    Your <strong class="text-app-text">passwords and vault items</strong> should stay private even if a database
                    backup leaks. The service can still enforce <strong class="text-app-text">who</strong> is allowed to sync, but
                    it is not designed to read item contents without your unlock material.
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell site-panel-grid-cell--technical" aria-labelledby="sec-security-orient-tech">
                <div class="flex flex-col gap-3">
                  <p class="site-panel-label">Technical</p>
                  <h3 id="sec-security-orient-tech" class="text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">
                    What to verify
                  </h3>
                  <p class="site-p text-sm leading-relaxed md:text-base">
                    Trace <strong class="text-app-text">encrypt → network → store</strong> in the client bundle and API handlers.
                    Confirm payloads are <strong class="text-app-text">AEAD ciphertext + IV/nonce + tag</strong>, not cleartext
                    fields. Treat <strong class="text-app-text">XSS and endpoint compromise</strong> as in-scope threats.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Claims</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">What we claim</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              Executive properties, read alongside the FAQ and your operator’s internal docs.
            </p>
          </div>
          <div class="site-panel-grid site-card-interactive">
            <div class="site-panel-grid-inner">
              <section class="site-panel-grid-cell">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Client-side vault</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Decryption happens in <strong class="text-app-text">your browser</strong>; the network mostly moves locked
                  blobs.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> Vault plaintext and raw VK stay in the browser. The API
                    stores ciphertext, IVs/nonce, and GCM tags.
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell site-panel-grid-cell--technical">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Account vs vault</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Resetting or rotating your <strong class="text-app-text">login</strong> is not the same as re-wrapping the
                  whole vault.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> Account authentication is separate from vault unlock.
                    Changing the login password does not rotate vault ciphertext keys.
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell site-panel-grid-cell--technical">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Sessions</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  You sign in with email and password; the browser keeps a <strong class="text-app-text">session cookie</strong>
                  so you are not typing your login on every click.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> HttpOnly, SameSite=Lax session cookies (Secure when
                    configured in production).
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Cryptography in the browser</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  A slow, memory-hard step turns your unlock secret into keys; each item can use its own data key so a leak of
                  one blob does not unravel everything.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> Argon2id derives the unlock key; AES-256-GCM for wraps and
                    item payloads; per-item DEKs.
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell site-panel-grid-cell--emphasis site-panel-grid-cell--span-2">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Recovery &amp; loss</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  If you lose <strong class="text-app-text">every</strong> legitimate way to unlock or recover, we cannot “email
                  you your data back” in readable form, that is intentional for zero-knowledge designs.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> Recovery is optional; loss of all user-held secrets can mean
                    permanent data loss.
                  </p>
                </div>
              </section>
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
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Web sessions</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">Sessions, CSRF, and mutating requests</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              Cookies prove the browser tab; CSRF tokens prove the request came from your app’s JavaScript, not a random form
              on another site.
            </p>
          </div>
          <div class="site-panel-grid site-card-interactive">
            <div class="site-panel-grid-inner">
              <section class="site-panel-grid-cell">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Cookie vs database</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Stealing a <strong class="text-app-text">database backup</strong> should not hand an attacker a working
                  “copy-paste this as session” string.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> After login, the API returns JSON (including a CSRF token)
                    and sets <strong class="text-app-text">bb_session</strong> (name may vary). The raw session token lives in the
                    cookie; the database stores a <strong class="text-app-text">SHA-256 hash</strong> of that token.
                  </p>
                </div>
              </section>
              
              <section class="site-panel-grid-cell site-panel-grid-cell--technical">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Mutations require CSRF</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Another website should not be able to post a hidden form that changes your vault just because your browser
                  sends cookies.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> For POST, PUT, PATCH, DELETE, middleware requires a valid
                    session <strong class="text-app-text">and</strong> an
                    <strong class="text-app-text">X-CSRF-Token</strong> header matching the session row, compared in constant time.
                    Cross-site form posts cannot mutate vault data with cookies alone, they need JS in your origin (a different
                    problem: XSS).
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
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
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">API surface</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">API transport hardening</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              These controls shrink the browser attack surface; they do not replace vault crypto or good deployment hygiene.
            </p>
          </div>
          <div
            class="site-card site-card-interactive overflow-hidden border-app-border/40 p-0 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.55)]"
          >
            <div class="site-table-wrap rounded-3xl border-0">
              <table class="site-table">
                <thead>
                  <tr>
                    <th scope="col">Control</th>
                    <th scope="col">Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-medium text-app-text">CORS allowlist</td>
                    <td>
                      Only trusted web origins may call the API from the browser; misconfiguration expands cross-site risk.
                    </td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Security headers</td>
                    <td>nosniff, frame DENY, referrer policy, strict CSP on API JSON, CORP same-site.</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Request size cap</td>
                    <td>Bounded body size (e.g. 1 MiB default).</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Rate limits</td>
                    <td>Auth and recovery windows, slows brute force and abuse.</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Account passwords</td>
                    <td>
                      <strong class="text-app-text">Argon2id</strong> password hashing for
                      <strong class="text-app-text">account login only</strong>, separate from vault unlock derivation.
                    </td>
                  </tr>
                </tbody>
              </table>
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Threats</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">Threat modeling (condensed)</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              No design removes all risk, this table states what we mitigate, what remains, and what you still own.
            </p>
          </div>
          <div
            class="site-card site-card-interactive overflow-hidden border-app-border/40 p-0 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.55)]"
          >
            <div class="site-table-wrap rounded-[1.35rem] border-0">
              <table class="site-table">
                <thead>
                  <tr>
                    <th scope="col">Threat</th>
                    <th scope="col">Mitigation / note</th>
                    <th scope="col">Residual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-medium text-app-text">Database breach</td>
                    <td>Ciphertext + wraps; still needs unlock/recovery secrets.</td>
                    <td>High effort if secrets are strong</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">API compromise</td>
                    <td>Same ciphertext story; writes still need cookie + CSRF.</td>
                    <td>Ops + hardening</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">XSS in the web app</td>
                    <td>
                      Malicious JS can read the DOM and memory; the
                      <strong class="text-app-text">vault key</strong> is at risk.
                    </td>
                    <td>CSP, audits, sanitization</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Session theft</td>
                    <td>HttpOnly reduces JS exfiltration; SameSite reduces CSRF class issues.</td>
                    <td>Malware, physical access</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Weak user secrets</td>
                    <td>Minimum lengths and UX nudges, cannot fix human optimism.</td>
                    <td>Policy + training</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-app-text">Lost secrets</td>
                    <td>No server “decrypt my old vault”, <strong class="text-app-text">by design</strong>.</td>
                    <td>Permanent lockout of plaintext</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Cryptography</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">Algorithms &amp; recovery lane</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              AEAD for confidentiality and integrity; a separate path for emergency recovery so daily unlock and break-glass do
              not share the same derivation.
            </p>
          </div>
          <div class="site-panel-grid site-card-interactive">
            <div class="site-panel-grid-inner">
              <section class="site-panel-grid-cell">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Why AES-GCM</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Tampered ciphertext should fail loudly on decrypt instead of yielding garbage that looks fine.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> GCM gives confidentiality and integrity in one AEAD.
                    Tampering fails decrypt loudly. Nonces are <strong class="text-app-text">96-bit (12-byte)</strong> per
                    operation, uniqueness per wrap/encrypt matters.
                  </p>
                </div>
              </section>
              <section class="site-panel-grid-cell site-panel-grid-cell--technical">
                <p class="site-panel-label">In plain English</p>
                <h3 class="mt-0.5 text-left text-lg font-extrabold tracking-tight text-app-text md:text-xl">Recovery lane</h3>
                <p class="site-p mt-2 text-sm leading-relaxed md:text-base">
                  Recovery is a <strong class="text-app-text">different key story</strong> from your day-to-day unlock. Do not
                  reuse the same passphrase in both lanes.
                </p>
                <div class="site-panel-grid-detail">
                  <p class="site-p text-xs leading-relaxed text-app-text-muted md:text-sm">
                    <strong class="text-app-text">Technical:</strong> Recovery uses a different derivation: recovery secret →
                    SHA-256 digest → imported AES-GCM key → wrap/unwrap <strong class="text-app-text">VK</strong> into a
                    server-stored artifact. Not the same path as daily Argon2id unlock.
                  </p>
                </div>
              </section>
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </span>
              <span class="site-showcase-eyebrow">Operators</span>
            </div>
            <h2 class="site-showcase-title max-w-4xl text-balance">Before production &amp; further reading</h2>
            <p class="site-p max-w-3xl py-1 text-app-text-muted md:py-2">
              Checklists and pointers, not a substitute for your own reviews and audits.
            </p>
          </div>
          <div class="site-card site-card-interactive border-app-border/40 shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]">
            <div class="flex flex-col gap-8 p-7 md:flex-row md:gap-12 md:p-9">
              <div class="min-w-0 flex-1">
                <div class="mb-3 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0 text-app-accent" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <span class="site-panel-label">Honesty checklist</span>
                </div>
                <p class="site-p text-sm md:text-base">
                  Enable <strong class="text-app-text">Secure</strong> cookies with HTTPS everywhere, complete in-repo
                  security checklists, <strong class="text-app-text">SCA</strong> and
                  <strong class="text-app-text">pentests</strong>, backup policies for client-held secrets, and verify
                  <strong class="text-app-text">logs never contain vault plaintext</strong>. Account MFA may be on the roadmap.
                  The vault still needs unlock.
                </p>
              </div>
              <div class="min-w-0 flex-1 border-t border-app-border/50 pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0 lg:pl-12">
                <div class="mb-3 flex items-center gap-3">
                  <span class="site-crypto-icon-ring site-crypto-icon-ring--sm shrink-0" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <span class="site-panel-label">Learn more</span>
                </div>
                <p class="site-p text-sm leading-relaxed">
                  For narrative Q&amp;A on recovery, rotation, GDPR-style questions, and comparisons to other designs, see the
                  <a routerLink="/faq" class="font-semibold text-app-accent underline-offset-2 hover:underline">FAQ</a>.
                  Operators should maintain internal architecture and runbooks separately.
                </p>
                <p class="site-p mt-3 text-xs text-app-text-muted/90">Marketing copy is descriptive, not a warranty.</p>
              </div>
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
          <a routerLink="/product" class="site-explore-link">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Product
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
export class SecurityPageComponent {}
