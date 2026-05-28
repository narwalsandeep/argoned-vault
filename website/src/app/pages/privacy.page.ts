import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-page',
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
        <p class="site-kicker mb-6 md:mb-7">Legal</p>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Privacy policy</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Last updated: 7 April 2026. This policy explains how the Operator of your Argoned Vault app deployment at <strong class="text-app-text">vault.argoned.com</strong> processes personal data. Review with legal counsel before production launch.
        </p>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band">
        <div class="site-legal-doc">
          <section class="site-section">
            <h2 class="site-h2">1. Controller, processor, and contact</h2>
            <p class="site-p">
              The entity operating your Argoned deployment (named in signup flow, order form, invoice, or enterprise contract) is
              generally the <strong class="text-app-text">controller</strong> for account/support data. For enterprise deployments,
              that entity may be controller while Argoned acts as <strong class="text-app-text">processor</strong> for certain data.
              Contact:
              <a href="mailto:team@argoned.com" class="font-medium text-app-accent underline-offset-2 hover:underline"
                >team&#64;argoned.com</a
              >.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">2. Scope of this notice</h2>
            <p class="site-p">
              This notice covers personal data processed via Argoned website, web app, API, support channels, and operational logs.
              Read with
              <a routerLink="/terms" class="font-medium text-app-accent underline-offset-2 hover:underline">Terms of use</a> and
              <a routerLink="/security" class="font-medium text-app-accent underline-offset-2 hover:underline">Security</a>.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">3. Data we process</h2>
            <ul class="mt-4 list-disc space-y-3 pl-5 text-sm text-app-text-muted md:text-base">
              <li>
                <strong class="text-app-text">Account identity data:</strong> email, optional display name, account status, timestamps, and password-hash state used for account authentication.
              </li>
              <li>
                <strong class="text-app-text">Session and security data:</strong> session-token references, CSRF-token references, IP/user-agent hashes, expiry/revocation timestamps, plus authentication and abuse events.
              </li>
              <li>
                <strong class="text-app-text">Vault service metadata:</strong> encrypted vault profile, item, and recovery-artifact metadata (ciphertext/wrap blobs, salts, IV/nonce, tags, versions, timestamps).
              </li>
              <li>
                <strong class="text-app-text">Audit and operational logs:</strong> security event metadata and infrastructure logs.
              </li>
              <li>
                <strong class="text-app-text">Support/communications and commercial data:</strong> tickets, emails, plan,
                subscription, invoices, and payment references.
              </li>
            </ul>
          </section>

          <section class="site-section">
            <h2 class="site-h2">4. Data we are designed not to process in plaintext</h2>
            <p class="site-p">
              Argoned is designed so routine server operations do not require your vault unlock secret, raw unwrapped vault keys,
              or item plaintext. If you send secrets directly through support channels, those submissions can be processed as
              ordinary communications data.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">5. Sources of personal data</h2>
            <ul class="mt-4 list-disc space-y-2 pl-5 text-sm text-app-text-muted md:text-base">
              <li>Directly from you (registration, usage, support contact, billing details).</li>
              <li>From your organization administrators (workspace provisioning and account management).</li>
              <li>Automatically from your device/browser and service infrastructure logs.</li>
              <li>From payment and communications providers where relevant.</li>
            </ul>
          </section>

          <section class="site-section">
            <h2 class="site-h2">6. Purposes and legal bases (GDPR / UK GDPR)</h2>
            <ul class="mt-4 list-disc space-y-3 pl-5 text-sm text-app-text-muted md:text-base">
              <li>
                <strong class="text-app-text">Contract performance (Art. 6(1)(b)):</strong> account access, encrypted storage,
                synchronization, support, billing delivery.
              </li>
              <li>
                <strong class="text-app-text">Legitimate interests (Art. 6(1)(f)):</strong> service integrity, abuse prevention,
                fraud detection, troubleshooting, product reliability, internal metrics.
              </li>
              <li>
                <strong class="text-app-text">Legal obligations (Art. 6(1)(c)):</strong> accounting, tax, lawful requests,
                mandatory security or incident obligations.
              </li>
              <li>
                <strong class="text-app-text">Consent (Art. 6(1)(a)):</strong> optional cookies/marketing where required.
              </li>
            </ul>
          </section>

          <section class="site-section">
            <h2 class="site-h2">7. Cookies and similar technologies</h2>
            <p class="site-p">
              We use necessary cookies/storage for login session handling, CSRF protection, and core preferences. Non-essential
              analytics or marketing technologies are used only where consent is obtained if required by law. Browser settings can
              block cookies, but core authentication behavior may break.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">8. Security and abuse monitoring</h2>
            <p class="site-p">
              We process security logs to detect credential stuffing, scraping, token abuse, and other attacks. We may correlate IP,
              user-agent, and event telemetry to protect users and infrastructure. Security controls include session hardening,
              access controls, transport encryption, and service-level safeguards described on the Security page.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">9. Data sharing and recipients</h2>
            <p class="site-p">We may share data with:</p>
            <ul class="mt-4 list-disc space-y-2 pl-5 text-sm text-app-text-muted md:text-base">
              <li>Infrastructure, hosting, and storage providers.</li>
              <li>Payment processors, invoicing, and communications providers.</li>
              <li>Support and monitoring vendors acting under contract.</li>
              <li>Law enforcement or regulators where legally required.</li>
              <li>Corporate transaction counterparties (with confidentiality protections) during merger/sale processes.</li>
            </ul>
          </section>

          <section class="site-section">
            <h2 class="site-h2">10. International transfers</h2>
            <p class="site-p">
              If personal data is transferred outside your region (including EEA/UK/Switzerland), the Operator uses appropriate
              safeguards such as adequacy decisions, Standard Contractual Clauses, or equivalent lawful mechanisms.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">11. Retention and deletion</h2>
            <p class="site-p">
              Data is retained only as needed for service provision, security, legal compliance, and disputes. Account/support data
              can be deleted or anonymized after closure according to policy. Some encrypted artifacts and logs may persist for
              limited backup/disaster-recovery windows before expiration.
            </p>
            <p class="site-p">
              Account-only recovery reset in the vault app can clear encrypted vault profile/item/recovery records and revoke sessions, while legal/financial records may be retained where required.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">12. Data subject rights (GDPR / UK GDPR)</h2>
            <p class="site-p">Depending on jurisdiction, you may request access, correction, deletion, restriction, objection, and portability.</p>
            <p class="site-p">
              We may need identity verification and may decline or limit requests that are unlawful, manifestly unfounded,
              excessive, or that would materially impact others' rights or security. We respond within legally required timelines.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">13. US state privacy disclosures</h2>
            <p class="site-p">
              Where US state privacy laws apply (including CCPA/CPRA), users may have rights to know, access, correct, delete,
              and appeal certain decisions. We do not sell personal information in the traditional broker sense.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">14. Incident and breach handling</h2>
            <p class="site-p">
              We maintain incident response procedures and will provide required notices of personal-data breaches as applicable law
              requires. Timing and detail of notifications may depend on law enforcement and technical containment constraints.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">15. Automated decision-making</h2>
            <p class="site-p">
              We do not generally use solely automated decisions that produce legal or similarly significant effects, except limited
              automated abuse/risk controls permitted by law.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">16. Children and sensitive categories</h2>
            <p class="site-p">
              Services are not intended for children below applicable digital-consent ages. Do not submit special-category or highly
              sensitive personal data unless explicitly required and lawfully supported by your Operator agreement.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">17. Do Not Track and browser signals</h2>
            <p class="site-p">
              Because there is no uniform standard for browser DNT signals, Services may not respond to all DNT headers.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">18. Policy updates</h2>
            <p class="site-p">
              We may update this notice to reflect legal, operational, or product changes. Material changes will be communicated by
              reasonable channels (for example in-app notice or email when appropriate).
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">19. Complaints and supervisory authorities</h2>
            <p class="site-p">
              You may contact us first at
              <a href="mailto:team@argoned.com" class="font-medium text-app-accent underline-offset-2 hover:underline"
                >team&#64;argoned.com</a
              >. Where applicable, you may also lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">20. Contact</h2>
            <p class="site-p">
              Privacy questions and requests:
              <a href="mailto:team@argoned.com" class="font-medium text-app-accent underline-offset-2 hover:underline"
                >team&#64;argoned.com</a
              >.
            </p>
          </section>
        </div>
      </div>

      <div class="site-home-band site-home-band--plain pb-0">
        <nav class="site-page-nav justify-center" aria-label="Legal">
          <a
            routerLink="/terms"
            class="site-badge border-app-border/60 bg-app-elevated/50 text-app-text no-underline hover:border-app-accent/40 hover:text-app-accent"
            >Terms of use</a
          >
          <a
            routerLink="/contact"
            class="site-badge border-app-border/60 bg-app-elevated/50 text-app-text no-underline hover:border-app-accent/40 hover:text-app-accent"
            >Contact</a
          >
        </nav>
      </div>
    </div>
  `,
})
export class PrivacyPageComponent {}
