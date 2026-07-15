import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL_CONTACT } from '../legal.constants';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-shell auth-shell--legal">
      <div class="auth-legal-wrap">
        <header class="auth-legal-brand">
          <h1 class="settings-page-heading justify-center">
            <span class="settings-page-title">Terms of Service</span>
            <span class="settings-page-heading-dot" aria-hidden="true">.</span>
            <span class="settings-page-kicker">Argoned vault</span>
          </h1>
          <p class="mx-auto max-w-2xl text-center text-sm text-app-text-muted">
            Effective {{ legal.policyEffectiveLabel }}. Please read these terms carefully before using the service.
          </p>
        </header>

        <article class="auth-legal-card">
          <div class="docs-prose text-app-text">
            <section class="auth-legal-section">
              <h3>Who we are</h3>
              <p>
                <strong>{{ legal.brandName }}</strong> is a brand. The Argoned vault service is operated by
                <strong>{{ legal.companyLegalName }}</strong>, a company incorporated in {{ legal.companyJurisdiction }}. These
                Terms are a contract between you and {{ legal.companyLegalName }}.
              </p>
              <p>
                General information: <a [href]="legal.marketingSiteUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.marketingSiteUrl }}</a>.
                The vault web application is at
                <a [href]="legal.vaultAppUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.vaultAppUrl }}</a>
                and the API is at
                <a [href]="legal.apiUrl" class="font-medium text-app-main-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ legal.apiUrl }}</a>.
                Infrastructure is hosted on {{ legal.hostingSummary }}.
              </p>
              <p>
                Questions about these Terms:
                <a [href]="legal.contactMailto" class="font-medium text-app-main-accent hover:underline">{{ legal.contactEmail }}</a>.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>The service</h3>
              <p>
                Argoned provides an online encrypted vault: you create and unlock a vault in your browser using cryptography on
                your device; our servers store ciphertext and related account and operational data needed to run the service. The
                service, its availability, and its features may change over time.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Eligibility</h3>
              <p>
                You must be at least 18 years old (or the age of majority where you live) and able to enter a binding contract to
                use the service. If you use the service on behalf of an organisation, you confirm that you are authorised to bind
                that organisation to these Terms.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Acceptable use</h3>
              <p>
                You must not use Argoned for unlawful activity, to harm others, to attempt to gain unauthorised access to our or
                others’ systems, to distribute malware, to overload or disrupt the service, or to violate third-party rights. You are
                responsible for your use of the service and for complying with laws that apply to you.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Account &amp; recovery</h3>
              <p>
                You are responsible for safeguarding your account credentials and any recovery material. Loss of credentials or
                recovery secrets may result in <strong>permanent loss of access</strong> to encrypted vault data. We cannot decrypt
                your vault contents without your keys.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Paid plans &amp; billing</h3>
              <p>
                Paid tiers are offered through Stripe (for example Payment Links or subscriptions). By purchasing, you agree to
                Stripe’s terms and to providing accurate billing details. Plan limits and prices are described on
                <a routerLink="/pricing" class="font-medium text-app-main-accent hover:underline">Pricing</a> and in your checkout
                flow.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Lifetime tier</h3>
              <p>
                The Lifetime tier is <strong>not currently offered</strong> for new purchases. If you previously purchased
                Lifetime, <strong>Lifetime</strong> means the Lifetime plan limits and features you paid for are available for as
                long as we reasonably operate the Argoned vault service as this product. It is not a promise that the business or
                product will exist forever, but that you will not be charged again for that tier while the service continues under
                substantially the same offering.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Refunds</h3>
              <p>
                For customers who purchased the <strong>Lifetime</strong> tier before it was withdrawn from sale, you may request
                a refund only within the <strong>first 30 calendar days</strong> after your purchase completes, and only to the
                extent our payment processor and applicable law allow. After that window, Lifetime fees are not refundable except
                where the law requires otherwise. Subscription (Pro) billing follows the renewal and cancellation rules shown at
                checkout and in your Stripe customer materials.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Service changes &amp; discontinuation</h3>
              <p>
                We may change features, limits, or infrastructure as the product evolves. If we decide to <strong>shut down</strong>
                the Argoned vault service in a way that ends access for customers, we will give at least <strong>30 calendar days’
                advance notice</strong> before the service stops (for example by email to your registered account address and/or an
                in-app notice). During that final notice period we will use reasonable efforts to send you a <strong>vault data
                export</strong> (for example attached to email or via a time-limited secure link) to the email address on your
                account. You are responsible for downloading and storing that export before access ends. See also
                <a routerLink="/privacy" class="font-medium text-app-main-accent hover:underline">Privacy</a> for how we use your
                account email.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Ephemeral field shares</h3>
              <p>
                You may create one-time links to share a single decrypted field with someone who does not have an Argoned account.
                The server stores only encrypted blobs; you must deliver the access code separately from the link. We do not guarantee
                recovery if the link and code are exposed together or if the recipient fails to redeem before expiry or use. Do not
                put secrets in optional share labels.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Intellectual property</h3>
              <p>
                {{ legal.companyLegalName }} and its licensors own the Argoned name, logos, software, and documentation. We grant
                you a limited, non-exclusive, non-transferable right to use the service for your personal or internal business
                purposes in line with these Terms. You must not copy, modify, reverse engineer, or resell the service except where
                law allows.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Disclaimers</h3>
              <p>
                The service is provided on an “as is” and “as available” basis. We do not warrant that the service will be
                uninterrupted or error-free, or that it will meet every security or compliance requirement you may have. You are
                responsible for your own backups, export practices, and security assessments where your situation requires them.
                Cryptographic behaviour depends on your device, browser, and how you use the product; we do not provide legal,
                financial, or professional security advice.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Limitation of liability</h3>
              <p>
                Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law,
                including liability for death or personal injury caused by negligence (where applicable) or for fraud.
              </p>
              <p>
                Subject to the paragraph above, {{ legal.companyLegalName }} is not liable for any indirect, consequential, or
                special loss, or for loss of profits, revenue, goodwill, or data, arising from your use of or inability to use the
                service, except where such exclusion is not permitted by law.
              </p>
              <p>
                Subject to those exceptions, {{ legal.companyLegalName }}’s total aggregate liability arising out of or relating to
                the service in any 12-month period is limited to the total fees you paid us for the Argoned vault service in that
                period (or zero if you only used a free plan).
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Governing law &amp; jurisdiction</h3>
              <p>
                These Terms are governed by the law of England and Wales. The courts of England and Wales have exclusive
                jurisdiction, except that if you live in another part of the United Kingdom you may also bring proceedings in your
                home jurisdiction where mandatory consumer law allows.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Changes to these Terms</h3>
              <p>
                We may update these Terms from time to time. We will post the revised version on this page and update the effective
                date. Where changes are material, we will use reasonable efforts to notify you (for example by email or in-app
                notice). If you continue to use the service after the effective date of changes, you agree to the updated Terms. If
                you do not agree, you should stop using the service and may delete your account where the product allows.
              </p>
            </section>
            <section class="auth-legal-section">
              <h3>Contact</h3>
              <p>
                <a [href]="legal.contactMailto" class="font-medium text-app-main-accent hover:underline">{{ legal.contactEmail }}</a>
                ({{ legal.companyLegalName }}, {{ legal.companyJurisdiction }}).
              </p>
            </section>
          </div>

          <footer class="auth-legal-foot">
            <a routerLink="/login">Login</a>
            <a routerLink="/signup">Sign up</a>
            <a routerLink="/pricing">Pricing</a>
            <a routerLink="/privacy">Privacy</a>
            <!-- <a routerLink="/recovery">Recovery</a> -->
            <a [href]="legal.marketingSiteUrl" target="_blank" rel="noopener noreferrer">argoned.com</a>
            <a [href]="legal.contactMailto">{{ legal.contactEmail }}</a>
          </footer>
        </article>
      </div>
    </div>
  `,
})
export class TermsComponent {
  readonly legal = LEGAL_CONTACT;
}
