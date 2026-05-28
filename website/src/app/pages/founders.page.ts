import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-founders-page',
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
        <p class="site-kicker mb-6 md:mb-7">Founder</p>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-3">
          <span class="site-badge"><span aria-hidden="true" class="mr-1.5">✓</span>18+ years</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Agile + engineering</span>
          <span class="site-tag"><span aria-hidden="true" class="mr-1.5 text-app-accent/80">✓</span>Production-first</span>
        </div>
        <div class="mb-6 flex justify-center">
          <img
            src="/sandeep.jpg"
            alt="Sandeep Narwal"
            class="h-28 w-28 rounded-full border border-app-border/70 object-cover shadow-[0_12px_34px_-14px_rgba(0,0,0,0.55)] md:h-32 md:w-32"
            loading="eager"
            decoding="async"
          />
        </div>
        <h1 class="site-title mx-auto mt-0 max-w-3xl">Sandeep Narwal</h1>
        <p class="site-lead mx-auto mt-8 max-w-3xl">
          Founder & CEO with deep expertise in Agile project management and software development.
        </p>
        <div class="site-hero-actions">
          <a routerLink="/contact" class="site-btn-primary">Contact</a>
          <a routerLink="/company" class="site-btn-secondary">Company</a>
        </div>
      </div>
    </section>

    <div class="site-page site-page--product">
      <div class="site-home-band site-home-band--alt">
        <div class="site-band-stack">
          <div class="site-home-showcase-intro">
            <h2 class="site-subdisplay max-w-4xl text-balance">Ship real software, skip the drama.</h2>
          </div>
          <div
            class="site-card site-card-interactive mx-auto min-w-0 max-w-3xl border-app-border/40 text-left shadow-[0_20px_56px_-28px_rgba(0,0,0,0.5)]"
          >
            <div class="border-l-4 border-l-app-accent py-5 pl-5 pr-6 md:py-6 md:pl-7 md:pr-8">
              <p class="site-panel-label mb-2">Sandeep in 4 lines</p>
              <div class="space-y-3">
                <p class="site-p text-base leading-relaxed text-app-text/90 md:text-lg">
                  He architects scalable, high-performance software, from AI-powered apps to enterprise platforms.
                </p>
                <p class="site-p text-base leading-relaxed text-app-text/90 md:text-lg">
                  18+ years of engineering plus Agile delivery, and yes, enough urgent Fridays to build a healthy sarcasm layer.
                </p>
                <p class="site-p text-base leading-relaxed text-app-text/90 md:text-lg">
                  Strong in both code and communication, rare enough to mention without sounding dramatic.
                </p>
                <p class="site-p text-base leading-relaxed text-app-text/90 md:text-lg">
                  Open to selected projects and partnerships where outcomes matter more than slide decks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="site-home-band site-home-band--plain">
        <div class="site-divider">
          <div class="site-divider-line"></div><span class="site-divider-label">Explore</span><div class="site-divider-line"></div>
        </div>
        <nav class="site-page-nav site-page-nav--explore justify-center" aria-label="Related pages">
          <a routerLink="/security" class="site-explore-link">Security</a>
          <a routerLink="/faq" class="site-explore-link">FAQ</a>
          <a routerLink="/company" class="site-explore-link">Company</a>
        </nav>
      </div>
    </div>
  `,
})
export class FoundersPageComponent {}
