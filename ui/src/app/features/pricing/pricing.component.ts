import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import {
  BillingApiService,
  type BillingPublicConfig,
  type BillingSummary,
} from '../../core/billing/billing-api.service';
import { isLocalhostAppHost } from '../../core/config/is-localhost-app-host';
import { SHOW_LIFETIME_ON_PRICING } from '../../core/config/pricing-visibility.token';
import { AppShellModalComponent } from '../../core/ui/app-shell-modal.component';
import { APP_PLAN_CATALOG, PRICING_OPEN_SOURCE_REPO_URL } from './pricing.constants';

export type PricingPlanKey = 'free' | 'pro' | 'lifetime';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink, AppShellModalComponent],
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  private readonly billingApi = inject(BillingApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly showLifetimeOnPricing = inject(SHOW_LIFETIME_ON_PRICING);

  public readonly repoUrl = PRICING_OPEN_SOURCE_REPO_URL;
  public readonly currentPlan = signal<PricingPlanKey | null>(null);
  public readonly summaryFailed = signal(false);
  public readonly billingConfig = signal<BillingPublicConfig | null>(null);
  public readonly checkoutError = signal<string | null>(null);
  public readonly lifetimePolicyModalOpen = signal(false);
  public readonly simulateProBusy = signal(false);
  public readonly downgradeFromPricingBusy = signal(false);

  private billingAvailable = true;
  private billingDataReady = false;

  public constructor() {
    forkJoin({
      cfg: this.billingApi.getConfig().pipe(catchError(() => of(null))),
      sum: this.billingApi.getSummary().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ cfg, sum }) => {
          this.applyBillingBootstrap(cfg, sum);
          this.billingDataReady = true;
          this.processPlanQueryParam();
        },
        error: () => {
          this.summaryFailed.set(true);
          this.billingDataReady = true;
        },
      });

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('plan')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.billingDataReady) {
          this.processPlanQueryParam();
        }
      });
  }

  public isCurrentPlan(plan: PricingPlanKey): boolean {
    return this.currentPlan() === plan;
  }

  /** CTA on the Free tier when it is not current: Pro/Lifetime users are moving down, not up. */
  public freeTierCtaLabel(): string {
    if (this.isCurrentPlan('pro') || this.isCurrentPlan('lifetime')) {
      return 'Downgrade';
    }
    return 'Upgrade';
  }

  public planFeatures(plan: PricingPlanKey): readonly string[] {
    return APP_PLAN_CATALOG[plan].features;
  }

  public paymentLinkFor(plan: 'pro' | 'lifetime'): string {
    const cfg = this.billingConfig();
    const raw = plan === 'pro' ? cfg?.payment_links?.pro : cfg?.payment_links?.lifetime;
    return typeof raw === 'string' ? raw.trim() : '';
  }

  public openLifetimePolicyModal(): void {
    this.lifetimePolicyModalOpen.set(true);
  }

  public closeLifetimePolicyModal(): void {
    this.lifetimePolicyModalOpen.set(false);
  }

  /**
   * Pro on Free tier: one action — if readiness passes, complete DB-only downgrade; otherwise go to the guided page.
   */
  public async onDowngradeToFreeFromPricing(): Promise<void> {
    if (this.downgradeFromPricingBusy()) {
      return;
    }
    if (!this.auth.user()?.id) {
      void this.router.navigate(['/login']);
      return;
    }
    this.checkoutError.set(null);
    this.downgradeFromPricingBusy.set(true);
    try {
      const r = await firstValueFrom(this.billingApi.getDowngradeReadiness());
      if (r.status !== 'ok' || !r.downgrade?.allowed) {
        void this.router.navigate(['/subscription/downgrade']);
        return;
      }
      await firstValueFrom(this.billingApi.downgradeToFree());
      void this.router.navigate(['/subscription']);
    } catch (e) {
      this.checkoutError.set(this.pricingDowngradeErrorMessage(e));
      void this.router.navigate(['/subscription/downgrade']);
    } finally {
      this.downgradeFromPricingBusy.set(false);
    }
  }

  public goToPaymentLink(plan: 'pro' | 'lifetime'): void {
    const base = this.paymentLinkFor(plan);
    const userId = this.auth.user()?.id;
    if (base === '' || !userId) {
      this.checkoutError.set('Payment link for this plan is not configured, or you are not signed in.');
      return;
    }
    this.checkoutError.set(null);
    const sep = base.includes('?') ? '&' : '?';
    const url = `${base}${sep}client_reference_id=${encodeURIComponent(userId)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win === null) {
      this.checkoutError.set('Your browser blocked checkout from opening. Allow pop-ups for this site, then try again.');
    }
  }

  private processPlanQueryParam(): void {
    void this.runProPlanQueryFlow();
  }

  private applyBillingBootstrap(
    cfg: { status: string; config: BillingPublicConfig } | null,
    sum: { status: string; summary: BillingSummary } | null,
  ): void {
    if (cfg?.status === 'ok') {
      this.billingConfig.set(cfg.config);
    }
    if (sum?.status === 'ok' && sum.summary) {
      const raw = sum.summary.plan;
      const normalized = raw === 'pro' || raw === 'lifetime' || raw === 'free' ? raw : 'free';
      this.currentPlan.set(normalized);
      this.summaryFailed.set(false);
      this.billingAvailable = sum.summary.billing_available;
    } else {
      this.currentPlan.set(null);
      this.summaryFailed.set(true);
    }
  }

  private pricingDowngradeErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
        if ((body as { error: string }).error === 'downgrade_requirements_not_met') {
          return 'Your vault no longer matches Free requirements. Use the Downgrade check page to review.';
        }
        return (body as { error: string }).error;
      }
    }
    return 'Could not complete downgrade from Pricing. The Downgrade check page has the full steps.';
  }

  private devSimulateErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) {
        return 'Local Pro upgrade is not enabled on this server or the request did not come from loopback.';
      }
      const body = err.error;
      if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
        return (body as { error: string }).error;
      }
    }
    return 'Could not apply the local Pro upgrade.';
  }

  private async runProPlanQueryFlow(): Promise<void> {
    const plan = this.route.snapshot.queryParamMap.get('plan');
    if (plan === 'lifetime') {
      void this.router.navigate(['/pricing'], {
        queryParams: { plan: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    if (plan !== 'pro') {
      return;
    }
    if (this.simulateProBusy()) {
      return;
    }
    const cfg = this.billingConfig();
    const normalized = this.currentPlan();

    if (cfg?.dev_simulate_pro === true && isLocalhostAppHost()) {
      if (!this.auth.user()?.id) {
        this.checkoutError.set('Sign in to apply the local Pro upgrade.');
        void this.router.navigate(['/pricing'], {
          queryParams: { plan: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }
      if (normalized !== 'free') {
        void this.router.navigate(['/pricing'], {
          queryParams: { plan: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }
      this.checkoutError.set(null);
      this.simulateProBusy.set(true);
      try {
        await firstValueFrom(this.billingApi.devSimulateProUpgrade());
        const refreshed = await firstValueFrom(
          forkJoin({
            cfg: this.billingApi.getConfig().pipe(catchError(() => of(null))),
            sum: this.billingApi.getSummary().pipe(catchError(() => of(null))),
          }),
        );
        this.applyBillingBootstrap(refreshed.cfg, refreshed.sum);
      } catch (e) {
        this.checkoutError.set(this.devSimulateErrorMessage(e));
      } finally {
        this.simulateProBusy.set(false);
      }
      void this.router.navigate(['/pricing'], {
        queryParams: { plan: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }

    if (!cfg?.enabled || !this.billingAvailable || normalized !== 'free') {
      void this.router.navigate(['/pricing'], {
        queryParams: { plan: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    if (this.paymentLinkFor(plan) === '') {
      this.checkoutError.set('Payment link for this plan is not configured on the server.');
      void this.router.navigate(['/pricing'], {
        queryParams: { plan: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    this.checkoutError.set(null);
    this.goToPaymentLink(plan);
    void this.router.navigate(['/pricing'], {
      queryParams: { plan: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
