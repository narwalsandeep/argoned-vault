import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-faq-page',
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
        <p class="site-kicker mb-6 md:mb-7">FAQ</p>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
          <span class="site-badge"><span aria-hidden="true" class="mr-1.5">✓</span>Recovery</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Encryption</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Privacy</span>
        </div>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">What people ask about Argoned</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Plain-language answers first, with technical detail where it helps. Nothing here is legal advice; for GDPR or
          contracts, involve your counsel or data protection officer.
        </p>
        <div class="site-hero-actions">
          <a routerLink="/security" class="site-btn-primary">
            <svg class="site-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Security
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
    </section>

    <div class="site-page site-page--product">
      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Basics</h2>
          <p class="site-p">Getting oriented without jargon.</p>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What is Argoned in one sentence?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                A vault where your secrets are encrypted <strong class="text-app-text">in your browser</strong> before they
                reach our servers, so we design the product around <strong class="text-app-text">not</strong> needing your
                plaintext.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Is this the same as “encrypted at rest”?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Disk encryption protects disks. Argoned assumes the <strong class="text-app-text">application and database</strong>
                could be copied: what leaves your device is still <strong class="text-app-text">ciphertext</strong> the operator
                cannot decrypt without your unlock material.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Can you reset my vault password if I forget it?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">No</strong>, not in a way that silently decrypts old data. That is intentional
                zero-knowledge behavior. Use your <strong class="text-app-text">recovery</strong> path if you set one up; if every
                legitimate unlock path is lost, ciphertext stays unreadable.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Why is my login password not the same as my vault unlock?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">Login</strong> proves who you are to the service. <strong class="text-app-text">Vault unlock</strong>
                derives keys that wrap your vault. Splitting them limits blast radius: rotating login does not automatically
                re-encrypt the whole vault, and a stolen session cookie still does not equal your unlock secret.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Recovery &amp; secrets</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What happens during recovery?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                If you configure recovery, a <strong class="text-app-text">separate secret</strong> (and derivation path) can wrap
                the same vault key. You use it only when the primary unlock path fails. The server stores an
                <strong class="text-app-text">encrypted recovery artifact</strong>, not your recovery passphrase.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What if I lose both my unlock secret and recovery?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Then there is <strong class="text-app-text">no cryptographic path</strong> to the plaintext. Backups of
                ciphertext do not help without keys. This is harsh by design for true zero-knowledge, not spite.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>If I change my vault unlock secret, what happens?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                You typically get a <strong class="text-app-text">new unlock key (UK)</strong> from the new secret; the
                <strong class="text-app-text">vault key (VK)</strong> may stay the same or rotate depending on product flow.
                If the vault key rotates, <strong class="text-app-text">existing item ciphertext must be re-wrapped or
                re-encrypted</strong>, that is not something the server can do without you unlocking. Plan migrations
                carefully. See also <a routerLink="/product" class="font-semibold text-app-accent underline-offset-2 hover:underline">Product</a>.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Should I reuse the same passphrase for unlock and recovery?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">No.</strong> Recovery is meant to be an independent envelope. Reusing one secret
                collapses two lanes into one guessable surface.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Encryption &amp; “under the hood”</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>How strong is the encryption?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Vault crypto uses <strong class="text-app-text">AES-256-GCM</strong> (authenticated encryption) for wrapping and
                item payloads, and <strong class="text-app-text">Argon2id</strong> for deriving the unlock key from your vault
                secret. Key sizes are <strong class="text-app-text">256-bit</strong> for AES material. Strength still depends on
                your passphrase quality and endpoint security, math cannot fix a pasted password or malware on your machine.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What are UK, VK, and DEK?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">Unlock key (UK)</strong>, derived from your vault secret (Argon2id). It wraps the
                vault key.<br />
                <strong class="text-app-text">Vault key (VK)</strong>, a random AES key; wrapped for storage, lives in memory when
                unlocked.<br />
                <strong class="text-app-text">Data encryption key (DEK)</strong>, per-item random key, wrapped by VK, used to
                encrypt that item’s payload. Compromise of one item’s material does not automatically unwrap everything else.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Where does encryption run?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                In <strong class="text-app-text">your browser</strong> for vault cryptographic operations. The service stores
                blobs and metadata needed to sync, not your master unlock secret or raw vault key.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What is a “nonce” or “tag” in this context?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                AES-GCM uses a <strong class="text-app-text">nonce</strong> (unique per encryption) and produces a
                <strong class="text-app-text">tag</strong> that proves integrity. If ciphertext is tampered with, decryption
                fails, you want that loud failure instead of silent garbage.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Why Argon2id specifically?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                It is <strong class="text-app-text">memory-hard</strong>: attackers with GPUs pay more for each guess than with
                plain fast hashes. Unlock can take noticeable seconds, that is the cost profile working as intended.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Compared to other approaches</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>How is this different from a typical cloud password manager?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Many products encrypt client-side <em>sometimes</em> or hold server-side keys for features. Argoned is built so
                <strong class="text-app-text">routine server operation does not require decrypting your vault</strong>. Exact
                threat models differ by vendor, ask yours for architecture diagrams and key custody.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Is zero-knowledge a marketing term?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                It is often overloaded. Here it means: <strong class="text-app-text">we do not rely on seeing item plaintext or
                your vault unlock secret</strong> to run sync and storage. It does <strong class="text-app-text">not</strong>
                mean “immune to malware,” “anonymous,” or “law-proof.” See the next question for a tighter technical reading.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What do we mean by zero-knowledge, technically?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel space-y-4">
              <p class="site-p text-sm md:text-base">
                In cryptography, <strong class="text-app-text">zero-knowledge proofs</strong> are a specific protocol idea: you
                prove a statement without revealing the witness. Password managers rarely use that formalism; they use
                <strong class="text-app-text">zero-knowledge</strong> informally to describe
                <strong class="text-app-text">data and key custody</strong>.
              </p>
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">In Argoned’s sense:</strong> under normal operation the service stores and moves
                <strong class="text-app-text">ciphertext</strong>, <strong class="text-app-text">wrapped keys</strong> (vault key
                and per-item keys encrypted to other keys), <strong class="text-app-text">KDF parameters and salts</strong>, and
                <strong class="text-app-text">non-cryptographic metadata</strong> needed for the app (e.g. listing hints). It
                should <strong class="text-app-text">not</strong> need your <strong class="text-app-text">vault unlock
                secret</strong>, your <strong class="text-app-text">raw vault key</strong>, or
                <strong class="text-app-text">item plaintext</strong> to persist or sync vault data.
              </p>
              <p class="site-p text-sm md:text-base">
                So “zero-knowledge” here means <strong class="text-app-text">no intentional reliance on server-side knowledge of
                those secrets</strong>, not that the server learns literally nothing (it sees blobs, sizes, traffic patterns,
                account identifiers) and not that the client is trusted forever (malware, XSS, and shoulder surfing still
                matter).
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Why might Argoned feel “less convenient” than some apps?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Strong KDFs take time. Separate login vs unlock adds friction. <strong class="text-app-text">Those trade-offs
                buy clearer boundaries</strong> between account compromise and vault compromise.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Hosting, data &amp; GDPR-style questions</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Where is data hosted?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Depends on <strong class="text-app-text">how your operator deploys</strong> Argoned, region, cloud, or
                on-prem. This marketing site does not promise a single global region. Your administrator should document
                infrastructure and subprocessors for your privacy notice.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What can the platform operator see?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Typically: account metadata, session identifiers, rate-limit signals, and <strong class="text-app-text">vault
                ciphertext plus cryptographic wrapping blobs</strong>. They should <strong class="text-app-text">not</strong>
                need item plaintext or your vault unlock secret for normal operation. Logs and support tooling must be designed
                not to capture vault plaintext.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Does GDPR require you to decrypt my vault on request?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">Not as a magic bypass.</strong> Access and erasure rights apply to personal data
                you control. If data is ciphertext-only on the server, the practical response may be deletion or export of blobs,
                not “we guessed your passphrase.” Legal interpretation belongs to your counsel.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Can I export or delete my data?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Product capabilities depend on release and policy. Operators should offer <strong class="text-app-text">account
                deletion</strong> and clarify what remains (e.g. backups, logs). Ask your admin for the concrete process.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Backups, devices &amp; operations</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Should I back up my vault?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                <strong class="text-app-text">Yes.</strong> Sync is not the same as an offline backup of recovery material.
                If the service or your account were lost, ciphertext without keys is useless, export or archive according to
                your operator’s guidance.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Can I use the same vault on multiple devices?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                If the product supports it, each device still needs to <strong class="text-app-text">unlock</strong> with your
                secret; ciphertext syncs, keys do not magically hop between machines unwrapped.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Who is the “data controller” for GDPR?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Usually the <strong class="text-app-text">organization running Argoned</strong> for its users, not this
                marketing page. They should name a controller, DPO if required, legal basis, retention, and subprocessors in
                their privacy notice.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What happens if you are served a subpoena?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Operators may be compelled to produce what they hold, often <strong class="text-app-text">account metadata and
                ciphertext</strong>. They should not be able to produce vault plaintext without cooperation that includes your
                secrets. Legal process varies by jurisdiction; this is not legal advice.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section class="site-section">
        <div class="site-section-head">
          <h2 class="site-h2">Safety, threats &amp; honesty</h2>
        </div>
        <div class="site-vtabs">
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Is Argoned “safer than X”?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Security is <strong class="text-app-text">system + people + operations</strong>. Argoned’s architecture
                reduces server-side exposure of vault plaintext, but <strong class="text-app-text">XSS, malware, phishing, and
                weak passwords</strong> can still hurt you. Compare architectures, incident history, and transparency, not
                slogans.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What if someone steals my session cookie?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                They may act as you <strong class="text-app-text">for the account layer</strong>, but vault crypto still needs
                unlock in the browser. Combine with HttpOnly cookies, CSRF protections, short sessions, and device hygiene.
                Details on <a routerLink="/security" class="font-semibold text-app-accent underline-offset-2 hover:underline">Security</a>.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>What about quantum computers?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                Symmetric AES-256 is generally expected to need larger keys under mature quantum attacks; today’s practical
                concern for most users is still <strong class="text-app-text">endpoint and password hygiene</strong>. Migration
                strategies (e.g. post-quantum hybrids) are a roadmap topic for any long-lived crypto product.
              </p>
            </div>
          </details>
          <details class="site-vtabs-item" open>
            <summary class="site-vtabs-trigger">
              <span>Has the crypto been formally audited?</span>
              <span class="site-vtabs-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="site-vtabs-panel">
              <p class="site-p text-sm md:text-base">
                This page is <strong class="text-app-text">descriptive marketing</strong>, not a certification. For production,
                operators should run <strong class="text-app-text">reviews, tests, and independent audits</strong> appropriate
                to their risk level and publish results if they can.
              </p>
            </div>
          </details>
        </div>
      </section>

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
          <a href="https://vault.argoned.com" rel="noopener noreferrer" class="site-explore-link">
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
    </div>
  `,
})
export class FaqPageComponent {}
