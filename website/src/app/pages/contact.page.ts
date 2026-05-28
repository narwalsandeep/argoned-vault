import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact-page',
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
        <p class="site-kicker mb-6 md:mb-7">Contact</p>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">We actually read email</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Revolutionary, we know, a mailbox that is not a black hole. If you have a question, a typo to report, or a strongly worded
          opinion about key derivation, you are in the right place.
        </p>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band site-home-band--alt mx-auto min-w-0 max-w-2xl text-center">
        <p class="site-p text-lg md:text-xl">
          Anyone may write to
          <a
            href="mailto:team@argoned.com"
            class="font-semibold text-app-accent underline-offset-2 hover:underline"
            >team&#64;argoned.com</a
          >. We will do our best to reply when humans are awake.
        </p>
        <p class="site-p mt-8 text-sm text-app-text-muted">
          For product and security detail first, see
          <a routerLink="/faq" class="font-medium text-app-accent underline-offset-2 hover:underline">FAQ</a>
          and
          <a routerLink="/security" class="font-medium text-app-accent underline-offset-2 hover:underline">Security</a>.
        </p>
        <p class="mt-10">
          <a routerLink="/" class="site-btn-secondary inline-flex">Back to home</a>
        </p>
      </div>
    </div>
  `,
})
export class ContactPageComponent {}
