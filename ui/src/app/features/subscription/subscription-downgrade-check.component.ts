import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BillingApiService, type BillingDowngradeReadiness } from '../../core/billing/billing-api.service';
import { UiSpinnerComponent } from '../../core/ui/ui-spinner.component';

@Component({
  selector: 'app-subscription-downgrade-check',
  standalone: true,
  imports: [CommonModule, RouterLink, UiSpinnerComponent],
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="app-page-layout">
        <div class="app-page-main app-page-main--full">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Downgrade check</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">Let’s safely move your account to Free</span>
            </h1>
          </header>

          @if (loading()) {
            <div class="settings-section-card flex items-center gap-3 p-8 text-app-text-muted">
              <app-ui-spinner variant="muted" [decorative]="true" />
              <span>Checking your vault items…</span>
            </div>
          } @else if (errorMessage()) {
            <div class="settings-section-card border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-200" role="alert">
              {{ errorMessage() }}
            </div>
          } @else if (readiness(); as d) {
            <article class="settings-section-card p-6 sm:p-8">
              @if (d.allowed) {
                <h2 class="tab-panel-heading">
                  <span class="tab-panel-heading-title">You’re all set</span>
                  <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                  <span class="tab-panel-heading-kicker">Downgrade can continue</span>
                </h2>
                <p class="mt-2 text-sm text-app-text-muted">
                  Great news. Your vault already matches Free requirements:
                  <strong class="text-app-text">{{ d.active_item_count }} / {{ d.free_item_limit }}</strong> items and
                  <strong class="text-app-text">{{ d.file_vault_item_count }}</strong> file vault items.
                </p>
                <div class="mt-6 flex flex-wrap gap-2">
                  <button type="button" class="control-btn-primary w-max" [disabled]="downgradeBusy()" (click)="confirmDowngrade()">
                    @if (downgradeBusy()) {
                      Processing…
                    } @else {
                      Confirm downgrade to Free
                    }
                  </button>
                  <a routerLink="/subscription" class="control-btn-secondary w-max">Back</a>
                </div>
              } @else {
                <h2 class="tab-panel-heading">
                  <span class="tab-panel-heading-title">Almost there</span>
                  <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                  <span class="tab-panel-heading-kicker">A small cleanup is needed first</span>
                </h2>
                <p class="mt-2 text-sm leading-relaxed text-app-text-muted">
                  Free currently allows at most <strong class="text-app-text">{{ d.free_item_limit }}</strong> non-file vault
                  items and <strong class="text-app-text">no file vault items</strong> before your account can move to Free, so
                  a Free plan cannot still behave like full Pro on day one. Nothing is deleted here; a later “active items on
                  Free” flow may downgrade with more items retained—see product policy—but it is not live yet.
                </p>
                <div class="mt-5 rounded-xl border border-app-border/70 bg-app-elevated/40 p-4 text-sm text-app-text-muted">
                  <p class="m-0">
                    Current vault count: <strong class="text-app-text">{{ d.active_item_count }}</strong>
                  </p>
                  <p class="mt-1 mb-0">
                    File vault items: <strong class="text-app-text">{{ d.file_vault_item_count }}</strong>
                  </p>
                </div>
                <ul class="mt-5 list-disc space-y-1 pl-5 text-sm text-app-text-muted">
                  <li>Delete vault items until you are at or below {{ d.free_item_limit }} items.</li>
                  <li>Delete all file vault items.</li>
                  <li>Then return here and try downgrade again.</li>
                </ul>
                <div class="mt-6 flex flex-wrap gap-2">
                  <a routerLink="/vault/items" class="control-btn-primary w-max">Open vault items</a>
                  <a routerLink="/subscription" class="control-btn-secondary w-max">Back to Billing</a>
                </div>
              }
            </article>
          }
        </div>
      </div>
    </div>
  `,
})
export class SubscriptionDowngradeCheckComponent {
  private readonly billingApi = inject(BillingApiService);
  private readonly router = inject(Router);

  public readonly loading = signal(true);
  public readonly downgradeBusy = signal(false);
  public readonly readiness = signal<BillingDowngradeReadiness | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  public constructor() {
    this.billingApi.getDowngradeReadiness().subscribe({
      next: (res) => {
        this.readiness.set(res.downgrade);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not check downgrade requirements right now. Please try again.');
      },
    });
  }

  public confirmDowngrade(): void {
    if (this.downgradeBusy() || this.readiness()?.allowed !== true) {
      return;
    }
    this.downgradeBusy.set(true);
    this.errorMessage.set(null);
    this.billingApi.downgradeToFree().subscribe({
      next: () => {
        void this.router.navigate(['/subscription']);
        this.downgradeBusy.set(false);
      },
      error: (err) => {
        this.downgradeBusy.set(false);
        this.errorMessage.set(this.errorMessageFromHttp(err));
      },
    });
  }

  private errorMessageFromHttp(err: unknown): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'object' && err.error !== null) {
      const raw = (err.error as { error?: unknown }).error;
      if (typeof raw === 'string' && raw.trim() !== '') {
        if (raw === 'downgrade_requirements_not_met') {
          return 'Your vault no longer matches Free requirements. Please refresh and review your item counts.';
        }
        if (raw === 'lifetime_cannot_downgrade') {
          return 'Lifetime plan cannot be downgraded.';
        }
        return raw;
      }
    }
    return 'Could not start downgrade right now.';
  }
}

