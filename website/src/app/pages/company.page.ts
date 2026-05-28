import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-company-page',
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
        <p class="site-kicker mb-6 md:mb-7">Company</p>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Argoned</h1>
        <p class="site-lead mx-auto mt-10 max-w-3xl">
          Argoned is developed with a focus on trustworthy, client-side vault cryptography and straightforward product design.
        </p>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band site-home-band--alt mx-auto min-w-0 max-w-2xl text-center">
        <p class="site-p text-lg leading-relaxed md:text-xl">
          Argoned is part of the broader work at
          <a
            href="https://switchcodes.com"
            rel="noopener noreferrer"
            class="font-semibold text-app-accent underline-offset-2 hover:underline"
            >switchcodes.com</a>, building software that respects users and keeps complexity where it belongs (in the docs, not in your face).
        </p>
        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="https://switchcodes.com" rel="noopener noreferrer" class="site-btn-primary inline-flex">Visit Switchcodes</a>
          <a routerLink="/founders" class="site-btn-secondary inline-flex">Founders</a>
        </div>
      </div>
    </div>
  `,
})
export class CompanyPageComponent {}
