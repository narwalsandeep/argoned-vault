import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-page',
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
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Terms of use</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Last updated: 7 April 2026. These terms govern use of the Argoned Vault app at <strong class="text-app-text">vault.argoned.com</strong>. They are informational and should be reviewed by your legal counsel before production launch.
        </p>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band">
        <div class="site-legal-doc">
          <section class="site-section">
            <h2 class="site-h2">1. Scope and acceptance</h2>
            <p class="site-p">
              By accessing or using Argoned services, websites, APIs, support channels, or documentation (the
              <strong class="text-app-text">Services</strong>), you agree to these Terms. If you are agreeing for a company,
              you confirm authority to bind that company. If you do not agree, do not use the Services.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">2. Operator model and contracting party</h2>
            <p class="site-p">
              Argoned may be operated by us, an affiliate, a reseller, or your employer. The entity operating your deployment is
              the <strong class="text-app-text">Operator</strong> and is your contracting party unless your order form says
              otherwise. Enterprise or self-hosted contracts may supersede these Terms for conflicting points.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">3. Service description and security posture</h2>
            <p class="site-p">
              Argoned Vault is designed as a <strong class="text-app-text">client-side vault</strong>: item plaintext and raw vault
              key material are encrypted in-browser before routine storage/sync. The server stores encrypted-domain data in tables
              such as <code>vault_profiles</code>, <code>vault_items</code>, and <code>vault_recovery_artifacts</code>. Account access
              uses <code>users</code> and <code>auth_sessions</code> with CSRF validation for mutating calls.
            </p>
            <p class="site-p">
              Security details are described on
              <a routerLink="/security" class="font-medium text-app-accent underline-offset-2 hover:underline">Security</a>.
              Marketing descriptions are explanatory, not a warranty. Security is shared responsibility between Operator and user.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">4. Eligibility and account responsibilities</h2>
            <ol class="site-legal-list">
              <li>You must provide accurate account information and keep it current.</li>
              <li>You are responsible for account credential confidentiality and all activities under your account.</li>
              <li>Credential sharing and pooled user accounts are prohibited unless your plan explicitly allows it.</li>
              <li>You must promptly report suspected unauthorized access.</li>
              <li>You must be legally able to enter a binding agreement in your jurisdiction.</li>
            </ol>
          </section>

          <section class="site-section">
            <h2 class="site-h2">5. Organization accounts and administrators</h2>
            <p class="site-p">
              If your account is provisioned by an organization, that organization may control account lifecycle, access policies,
              billing, and administrative actions (including suspension or data export where contractually allowed). You are
              responsible for complying with your employer or customer policies.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">6. Acceptable use and prohibited conduct</h2>
            <p class="site-p">You must not:</p>
            <ol class="site-legal-list">
              <li>Use Services for unlawful, fraudulent, abusive, defamatory, or rights-infringing purposes.</li>
              <li>Probe, scan, pentest, or exploit the Services without written authorization.</li>
              <li>Bypass authentication, rate limits, tenant boundaries, billing controls, or security controls.</li>
              <li>Use bots or automation to scrape, harvest, mirror, or bulk export data beyond allowed APIs/features.</li>
              <li>Reverse engineer, decompile, disassemble, or attempt to extract source code except where law requires.</li>
              <li>Upload malware, run unauthorized crypto-mining, or perform denial-of-service activity.</li>
              <li>Use Services to build a competing product by extracting structured data at scale.</li>
              <li>Share, sell, sublicense, or resell Services unless explicitly permitted by contract.</li>
            </ol>
          </section>

          <section class="site-section">
            <h2 class="site-h2">7. Security testing and vulnerability disclosure</h2>
            <p class="site-p">
              Good-faith security reports are welcome, but active testing against production systems requires prior written
              authorization. Unauthorized testing may result in suspension, legal action, and referral to law enforcement.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">8. Cryptographic keys and recovery responsibility</h2>
            <p class="site-p">
              You are solely responsible for vault unlock material, recovery secrets, endpoint security, and backup practices.
              Argoned Vault includes two recovery lanes: (a) cryptographic recovery artifacts and (b) account-only recovery reset.
              If you lose valid unlock/recovery secrets, encrypted data may be permanently unreadable by design.
            </p>
            <p class="site-p">
              The account-only recovery reset flow is explicitly destructive: it can reset login access while clearing vault profile,
              vault items, recovery artifacts, and active sessions.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">9. Content and customer data</h2>
            <p class="site-p">
              You retain rights in your content. You grant the Operator a limited license to host/process encrypted and related data
              only to provide, secure, and support the Services. You are responsible for ensuring your content is lawful and that
              you have rights to store/process it.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">10. Privacy and data processing terms</h2>
            <p class="site-p">
              Personal-data processing is described in the
              <a routerLink="/privacy" class="font-medium text-app-accent underline-offset-2 hover:underline">Privacy policy</a>.
              For B2B customers, a DPA may apply and governs controller/processor obligations where required.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">11. Plans, fees, taxes, and billing</h2>
            <ol class="site-legal-list">
              <li>The Operator may offer free and paid tiers with usage limits.</li>
              <li>Fees, currency, renewal terms, and taxes follow checkout/order form terms.</li>
              <li>You authorize recurring charges for subscriptions until canceled.</li>
              <li>You must maintain valid payment information.</li>
              <li>Unpaid invoices may lead to downgrade, suspension, or termination.</li>
            </ol>
          </section>

          <section class="site-section">
            <h2 class="site-h2">12. Chargebacks, payment disputes, and abuse</h2>
            <p class="site-p">
              If you initiate unjustified chargebacks or payment reversals while continuing to use Services, the Operator may suspend
              access, recover fees/costs, and require prepaid service for reinstatement. Legitimate billing disputes should be raised
              through support first.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">13. Suspension and emergency actions</h2>
            <p class="site-p">
              The Operator may suspend or restrict access immediately if needed to protect users, infrastructure, legal compliance,
              or ongoing incident response. Where practical, notice and remediation steps will be provided.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">14. Changes, deprecation, and beta features</h2>
            <p class="site-p">
              We may modify, replace, or discontinue features. Beta/preview features are provided as-is and may be removed without
              notice. Material terms changes will be communicated through reasonable channels.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">15. Third-party services and dependencies</h2>
            <p class="site-p">
              Services may rely on third-party infrastructure, payment processors, or communications providers. Their terms and
              outages may affect availability. The Operator is not responsible for third-party failures outside reasonable control.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">16. Intellectual property and feedback</h2>
            <p class="site-p">
              Except for your content, all Service IP belongs to the Operator/licensors. If you submit feedback, suggestions, or
              bug reports, you grant a perpetual, worldwide, royalty-free license to use them without obligation.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">17. Export controls and sanctions</h2>
            <p class="site-p">
              You may not use Services in violation of applicable export controls, trade restrictions, or sanctions laws. You
              represent that you are not prohibited from receiving Services under applicable law.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">18. Service availability and support boundaries</h2>
            <p class="site-p">
              Unless explicitly promised in a paid SLA, no specific uptime, response, or recovery target is guaranteed. Free-tier
              usage may be subject to lower priority support and stricter limits.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">19. Data export, retention, and deletion after termination</h2>
            <p class="site-p">
              You should export needed data before cancellation where export tools are available. After termination, data may be
              deleted per retention policy, legal obligations, and backup cycles. Encrypted artifacts may persist temporarily in
              disaster-recovery systems.
            </p>
            <p class="site-p">
              In the vault app, destructive recovery or account closure may remove encrypted vault content, recovery artifacts, and active sessions. The Operator does not guarantee plaintext recoverability without valid secrets.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">20. Disclaimers</h2>
            <p class="site-p">
              SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" TO THE MAXIMUM EXTENT PERMITTED BY LAW. THE OPERATOR DISCLAIMS ALL
              WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. SECURITY OUTCOMES ALSO
              DEPEND ON USER CONFIGURATION, ENDPOINT HYGIENE, AND OPERATOR DEPLOYMENT PRACTICES.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">21. Limitation of liability</h2>
            <p class="site-p">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR AND AFFILIATES ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL. AGGREGATE LIABILITY
              FOR ALL CLAIMS WILL NOT EXCEED THE GREATER OF (A) FEES PAID IN THE 12 MONTHS BEFORE THE CLAIM OR (B) EUR 100, EXCEPT
              WHERE LIABILITY CANNOT BE LIMITED BY LAW.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">22. Indemnity</h2>
            <p class="site-p">
              You agree to defend and indemnify the Operator and affiliates from third-party claims, damages, losses, and reasonable
              legal costs arising from your content, misuse of Services, or violation of these Terms, except to the extent caused by
              the Operator's gross negligence or willful misconduct.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">23. Governing law and venue</h2>
            <p class="site-p">
              Unless your contract specifies otherwise, these Terms are governed by laws of the Operator's principal place of
              business, excluding conflict-of-law rules. Courts in that jurisdiction have exclusive venue, subject to mandatory
              consumer-rights law.
            </p>
          </section>

          <section class="site-section">
            <h2 class="site-h2">24. General terms</h2>
            <ol class="site-legal-list">
              <li>Electronic notices are valid and may be sent in-app or by email.</li>
              <li>If one clause is unenforceable, remaining clauses continue in effect.</li>
              <li>No waiver is implied by delayed enforcement.</li>
              <li>You may not assign these Terms without consent; Operator may assign in reorganization or sale.</li>
              <li>These Terms plus order form/DPA (if any) are the full agreement for the Services.</li>
            </ol>
          </section>

          <section class="site-section">
            <h2 class="site-h2">25. Contact</h2>
            <p class="site-p">
              Questions about Terms:
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
            routerLink="/privacy"
            class="site-badge border-app-border/60 bg-app-elevated/50 text-app-text no-underline hover:border-app-accent/40 hover:text-app-accent"
            >Privacy policy</a
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
export class TermsPageComponent {}
