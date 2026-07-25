import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL_CONTACT } from '../legal.constants';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-shell auth-shell--legal">
      <div class="auth-legal-wrap">
        <header class="auth-legal-brand">
          <h1 class="settings-page-heading justify-center">
            <span class="settings-page-title">Privacy Policy</span>
            <span class="settings-page-heading-dot" aria-hidden="true">.</span>
            <span class="settings-page-kicker">Argoned vault</span>
          </h1>
          <p class="mx-auto max-w-2xl text-center text-sm text-app-text-muted">
            Effective {{ legal.policyEffectiveLabel }}. This policy describes how {{ legal.companyLegalName }} processes personal
            data when you use the Argoned vault service.
          </p>
        </header>

        <article class="auth-legal-card">
          <div class="docs-prose text-app-text">
            <section class="auth-legal-section">
              <h3>Who we are</h3>
              <p>
                The <strong>data controller</strong> for the Argoned vault service is
                <strong>{{ legal.companyLegalName }}</strong>, a company incorporated in {{ legal.companyJurisdiction }}.
                <strong>{{ legal.brandName }}</strong> is a brand operated by {{ legal.companyLegalName }}.
              </p>
              <p>
                Contact:
                <a [href]="legal.contactMailto" class="font-medium text-app-main-accent hover:underline">{{ legal.contactEmail }}</a>.
                Product and marketing information:
                <a [href]="legal.marketingSiteUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.marketingSiteUrl }}</a>.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>What this policy covers</h3>
              <p>
                This policy applies to the vault web application at
                <a [href]="legal.vaultAppUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.vaultAppUrl }}</a>
                and the API at
                <a [href]="legal.apiUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.apiUrl }}</a>.
                The marketing website at {{ legal.marketingSiteUrl }} may use additional notices where relevant. The service is
                hosted on {{ legal.hostingSummary }}.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Data we process &amp; why</h3>
              <p>
                We aim to minimise what we need. In outline we process: <strong>account data</strong> (such as email address and
                authentication identifiers); <strong>vault-related data</strong> (encrypted vault payloads and metadata needed to
                store and sync them; we do not have your plaintext vault master key or unlock secret); <strong>billing data</strong>
                processed by Stripe when you purchase paid plans; <strong>legal / signup records</strong> (timestamp and
                machine-readable policy version when you accept our Terms and Privacy at account creation, for accountability);
                and <strong>technical and security data</strong> (such as server logs, IP addresses, timestamps, and diagnostic
                information) to operate and protect the service.
              </p>
              <p>
                We rely on appropriate lawful bases under UK data protection law, including: <strong>performance of a contract</strong>
                with you; <strong>legitimate interests</strong> (for example securing the service, preventing abuse, and improving
                reliability), balanced against your rights; and where applicable <strong>legal obligation</strong> or
                <strong>consent</strong> (for example where we ask explicitly for optional communications).
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Account email</h3>
              <p>
                We use the email address on your account for authentication, security notices, billing receipts where applicable,
                and other operational messages. If we discontinue the service, we may use that same address to deliver required
                notices and, during the final notice period described in our
                <a routerLink="/terms" class="font-medium text-app-main-accent hover:underline">Terms</a>, to send you a
                <strong>vault data export</strong> (for example as an attachment or a time-limited link). Keep your email accurate
                and secure; we are not responsible for delivery failures to an outdated or full mailbox.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Encryption &amp; what we cannot see</h3>
              <p>
                Vault items and related profile material use client-side cryptography (for example Argon2id for key derivation and
                authenticated encryption for items). That means we cannot read your vault contents without your active session and
                secrets on your device.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Processors &amp; service providers</h3>
              <p>
                We use trusted processors to run the service. They process personal data only on our instructions and under
                appropriate agreements. Key categories include: <strong>{{ legal.hostingSummary }}</strong> for hosting and
                infrastructure; and <strong>Stripe</strong> for payment processing when you buy paid plans. Stripe’s privacy notice
                applies to payment data they collect as a controller in connection with checkout and billing.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>International transfers</h3>
              <p>
                Some processors may be located outside the United Kingdom. Where personal data is transferred internationally, we
                use appropriate safeguards required by UK data protection law (for example the UK International Data Transfer
                Agreement or adequacy regulations, as applicable).
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Retention</h3>
              <p>
                We retain personal data for as long as your account exists and as needed to provide the service, comply with law,
                resolve disputes, and enforce our agreements. Technical logs are kept for a limited period consistent with
                security and operations, then deleted or aggregated where possible. When you delete your account (where the product
                supports this), we delete or anonymise personal data within a reasonable period, subject to limited retention where
                law requires (for example billing records).
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Security</h3>
              <p>
                We implement appropriate technical and organisational measures designed to protect personal data against
                unauthorised access, alteration, disclosure, or destruction. No method of transmission or storage is completely
                secure; you should use strong passwords, protect recovery material, and keep your devices updated.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Cookies &amp; similar technologies</h3>
              <p>
                We use cookies and similar technologies as needed for sign-in, session security, and preferences. You can control
                cookies through your browser settings; disabling essential cookies may prevent parts of the service from working.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Your rights</h3>
              <p>
                Under UK data protection law you may have rights to request access, rectification, erasure, restriction of
                processing, data portability, and to object to certain processing. You may also have the right to withdraw consent
                where processing is based on consent. To exercise these rights, contact us at
                <a [href]="legal.contactMailto" class="font-medium text-app-main-accent hover:underline">{{ legal.contactEmail }}</a>.
                You may complain to the UK Information Commissioner’s Office (ICO) at
                <a href="https://ico.org.uk/" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Children</h3>
              <p>
                The service is not directed at children under 18. We do not knowingly collect personal data from anyone under 18.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Changes to this policy</h3>
              <p>
                We may update this Privacy Policy from time to time. We will post the revised version on this page and update the
                effective date. Where changes are material, we will use reasonable efforts to notify you (for example by email or
                in-app notice).
              </p>
            </section>
          </div>

          <footer class="auth-legal-foot">
            <a routerLink="/login">Login</a>
            <a routerLink="/signup">Sign up</a>
            <a routerLink="/pricing">Pricing</a>
            <a routerLink="/terms">Terms</a>
            <a routerLink="/forgot-password">Forgot password</a>
            <a [href]="legal.marketingSiteUrl" target="_blank" rel="noopener noreferrer">argoned.com</a>
            <a [href]="legal.contactMailto">{{ legal.contactEmail }}</a>
          </footer>
        </article>
      </div>
    </div>
  `,
})
export class PrivacyComponent {
  readonly legal = LEGAL_CONTACT;
}
