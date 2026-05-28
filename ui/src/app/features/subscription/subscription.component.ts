import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, filter, finalize, forkJoin, map, of } from 'rxjs';

import { UiSpinnerComponent } from '../../core/ui/ui-spinner.component';
import {
  BillingApiService,
  type BillingInvoiceRow,
  type BillingPublicConfig,
  type BillingSubscriptionSnapshot,
  type BillingSummary,
} from '../../core/billing/billing-api.service';
import { isLocalhostAppHost } from '../../core/config/is-localhost-app-host';
import { APP_PLAN_CATALOG, type AppPlanKey } from '../pricing/pricing.constants';

type SubscriptionTabId = 'subscription' | 'invoices';

export interface LifetimePlanDetails {
  purchasedAt: string;
  refundRequestUntil: string;
  refundWindowOpen: boolean;
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, RouterLink, UiSpinnerComponent],
  templateUrl: './subscription.component.html',
})
export class SubscriptionComponent {
  private readonly billingApi = inject(BillingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly tabs: { id: SubscriptionTabId; label: string }[] = [
    { id: 'subscription', label: 'Subscription' },
    { id: 'invoices', label: 'Invoices' },
  ];

  public readonly activeTab = signal<SubscriptionTabId>('subscription');
  public readonly initialLoad = signal(true);
  public readonly pageError = signal<string | null>(null);
  public readonly config = signal<BillingPublicConfig | null>(null);
  public readonly summary = signal<BillingSummary | null>(null);

  public readonly invoices = signal<BillingInvoiceRow[]>([]);
  public readonly invoicesLoad = signal(false);

  public readonly cancelBusy = signal(false);

  /** When true, show the “billing not configured” card (hide when local dev Pro simulation is available). */
  public readonly showBillingUnavailableBlock = computed((): boolean => {
    const c = this.config();
    if (c === null) {
      return true;
    }
    if (c.enabled) {
      return false;
    }
    if (c.dev_simulate_pro && isLocalhostAppHost()) {
      return false;
    }
    return true;
  });

  /** Populated for `plan === 'lifetime'` when the API returns purchase timestamps. */
  public readonly lifetimePlanDetails = computed((): LifetimePlanDetails | null => {
    const s = this.summary();
    if (s?.plan !== 'lifetime' || s.subscription === null) {
      return null;
    }
    const sub = s.subscription;
    const purchasedAt = sub['purchased_at'];
    const refundUntil = sub['refund_request_until'];
    if (typeof purchasedAt !== 'string' || typeof refundUntil !== 'string') {
      return null;
    }
    const refundWindowOpen = Date.now() <= new Date(refundUntil).getTime();

    return { purchasedAt, refundRequestUntil: refundUntil, refundWindowOpen };
  });

  public constructor() {
    this.bootstrapPage();

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('tab')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((tab) => {
        if (tab === 'subscription' || tab === 'invoices') {
          this.activeTab.set(tab);
        }
      });

    this.route.queryParamMap
      .pipe(
        map((p) => p.get('session_id')),
        distinctUntilChanged(),
        filter((s): s is string => typeof s === 'string' && s.trim() !== ''),
        takeUntilDestroyed(),
      )
      .subscribe((sessionId) => {
        this.completeReturnFromCheckout(sessionId.trim());
      });
  }

  public selectTab(id: SubscriptionTabId): void {
    this.activeTab.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: id === 'subscription' ? null : id, session_id: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (id === 'invoices' && this.config()?.enabled) {
      this.loadInvoices();
    }
  }

  public formatMoney(amountMinor: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amountMinor / 100);
    } catch {
      return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  }

  public formatPolicyDateUtc(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  public formatInvoiceDate(inv: BillingInvoiceRow): string {
    const raw = inv.created_stripe ?? inv.period_start;
    if (!raw) {
      return 'N/A';
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return 'N/A';
    }
    return d.toLocaleDateString();
  }

  /** Formats ISO-like date values from the API for display in the local timezone. */
  public formatDisplayDate(raw: unknown): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const s = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : null;
    if (s === null) {
      return null;
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  public formatInvoicePeriodRange(inv: BillingInvoiceRow): string {
    const a = this.formatDisplayDate(inv.period_start);
    const b = this.formatDisplayDate(inv.period_end);
    if (a && b) {
      return `${a} – ${b}`;
    }
    return a ?? b ?? '—';
  }

  public planDisplayTitle(plan: string): string {
    const key = this.normalizedPlanKey(plan);
    return key ? APP_PLAN_CATALOG[key].title : plan;
  }

  /** Matches Pricing tier badges (Starter / accent Pro / Pay once). */
  public planBadgeLabel(plan: string): string {
    const p = plan.toLowerCase();
    if (p === 'free') {
      return 'Starter';
    }
    if (p === 'pro') {
      return 'Best value';
    }
    if (p === 'lifetime') {
      return 'Pay once';
    }
    return 'Plan';
  }

  public planFeatures(plan: string): readonly string[] {
    const key = this.normalizedPlanKey(plan);
    return key ? APP_PLAN_CATALOG[key].features : [];
  }

  public subscriptionStatusLabel(status: string | null): string {
    if (!status) {
      return '—';
    }
    const s = status.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  public proBillingPeriodLine(sub: BillingSubscriptionSnapshot | null): string | null {
    if (!sub) {
      return null;
    }
    const a = this.formatDisplayDate(sub['current_period_start']);
    const b = this.formatDisplayDate(sub['current_period_end']);
    if (!a || !b) {
      return null;
    }
    return `${a} – ${b}`;
  }

  public lifetimePurchaseAmountLine(sub: BillingSubscriptionSnapshot | null): string | null {
    if (!sub) {
      return null;
    }
    const amt = sub['amount_paid'];
    const cur = sub['currency'];
    if (typeof amt !== 'number' || typeof cur !== 'string') {
      return null;
    }
    return this.formatMoney(amt, cur);
  }

  public cancelSubscription(): void {
    void this.router.navigate(['/subscription/downgrade']);
  }

  private bootstrapPage(): void {
    forkJoin({
      cfg: this.billingApi.getConfig().pipe(catchError(() => of(null))),
      sum: this.billingApi.getSummary().pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.initialLoad.set(false);
        }),
      )
      .subscribe({
        next: ({ cfg, sum }) => {
          if (cfg?.status === 'ok') {
            this.config.set(cfg.config);
          } else {
            this.pageError.set('Could not load billing configuration.');
          }
          if (sum?.status === 'ok') {
            this.summary.set(sum.summary);
          } else if (!this.pageError()) {
            this.pageError.set('Could not load subscription summary.');
          }
        },
        error: () => {
          this.pageError.set('Could not load billing.');
        },
      });
  }

  private refreshSummary(): void {
    this.billingApi.getSummary().subscribe({
      next: (res) => {
        if (res.status === 'ok') {
          this.summary.set(res.summary);
        }
      },
      error: () => {
        /* ignore */
      },
    });
  }

  private loadInvoices(): void {
    this.invoicesLoad.set(true);
    this.billingApi.listInvoices().subscribe({
      next: (res) => {
        if (res.status === 'ok') {
          this.invoices.set(res.invoices);
        }
        this.invoicesLoad.set(false);
      },
      error: () => {
        this.invoicesLoad.set(false);
      },
    });
  }

  private completeReturnFromCheckout(sessionId: string): void {
    this.initialLoad.set(true);
    this.billingApi.syncCheckoutSession(sessionId).subscribe({
      next: () => {
        void this.router.navigate(['/subscription'], { replaceUrl: true });
        this.reloadAfterCheckoutReturn();
      },
      error: (err) => {
        this.pageError.set(this.errorMessage(err, 'Could not confirm checkout.'));
        this.initialLoad.set(false);
      },
    });
  }

  private reloadAfterCheckoutReturn(): void {
    forkJoin({
      cfg: this.billingApi.getConfig().pipe(catchError(() => of(null))),
      sum: this.billingApi.getSummary().pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.initialLoad.set(false)))
      .subscribe({
        next: ({ cfg, sum }) => {
          if (cfg?.status === 'ok') {
            this.config.set(cfg.config);
          }
          if (sum?.status === 'ok') {
            this.summary.set(sum.summary);
          }
        },
      });
  }

  private errorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
        return (body as { error: string }).error;
      }
    }
    return fallback;
  }

  private normalizedPlanKey(plan: string): AppPlanKey | null {
    const p = plan.toLowerCase();
    if (p === 'free' || p === 'pro' || p === 'lifetime') {
      return p;
    }
    return null;
  }
}
