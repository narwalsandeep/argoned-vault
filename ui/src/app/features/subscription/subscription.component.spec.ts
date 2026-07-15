import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingApiService } from '../../core/billing/billing-api.service';
import { SubscriptionComponent } from './subscription.component';

describe('SubscriptionComponent', () => {
  const billingMock = {
    getConfig: vi.fn(),
    getSummary: vi.fn(),
    listInvoices: vi.fn(() => of({ status: 'ok', invoices: [] })),
    cancelAtPeriodEnd: vi.fn(() => of({ status: 'ok' })),
    downgradeToFree: vi.fn(() => of({ status: 'ok' })),
    syncCheckoutSession: vi.fn(() => of({ status: 'ok' })),
  };

  const freeSummaryResponse = {
    status: 'ok' as const,
    summary: {
      plan: 'free',
      status: null,
      features: [] as string[],
      subscription: null,
      payment_method: null,
      cancel_at_period_end: false,
      billing_available: true,
    },
  };

  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  beforeEach(() => {
    billingMock.getConfig.mockImplementation(() =>
      of({
        status: 'ok',
        config: {
          enabled: true,
          payment_links: {
            pro: 'https://buy.stripe.com/test-pro',
            lifetime: 'https://buy.stripe.com/test-life',
          },
        },
      }),
    );
    billingMock.getSummary.mockImplementation(() => of(freeSummaryResponse));

    TestBed.configureTestingModule({
      imports: [SubscriptionComponent, RouterTestingModule],
      providers: [
        { provide: BillingApiService, useValue: billingMock },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap$.asObservable() },
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lifetimePlanDetails is null for non-lifetime plans', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.lifetimePlanDetails()).toBeNull();
  });

  it('lifetimePlanDetails is null when purchase timestamps are missing', () => {
    billingMock.getSummary.mockImplementation(() =>
      of({
        status: 'ok',
        summary: {
          plan: 'lifetime',
          status: 'paid',
          features: [] as string[],
          subscription: { plan_key: 'lifetime' },
          payment_method: null,
          cancel_at_period_end: false,
          billing_available: true,
        },
      }),
    );

    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.lifetimePlanDetails()).toBeNull();
  });

  it('lifetimePlanDetails marks refund window open before refund_request_until', () => {
    billingMock.getSummary.mockImplementation(() =>
      of({
        status: 'ok',
        summary: {
          plan: 'lifetime',
          status: 'paid',
          features: [] as string[],
          subscription: {
            purchased_at: '2026-01-01T12:00:00.000Z',
            refund_request_until: '2026-01-31T12:00:00.000Z',
          },
          payment_method: null,
          cancel_at_period_end: false,
          billing_available: true,
        },
      }),
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();

    const ld = fixture.componentInstance.lifetimePlanDetails();
    expect(ld).not.toBeNull();
    expect(ld!.refundWindowOpen).toBe(true);
  });

  it('planDisplayTitle maps known plan keys', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.planDisplayTitle('free')).toBe('Free');
    expect(c.planDisplayTitle('pro')).toBe('Pro');
    expect(c.planDisplayTitle('lifetime')).toBe('Lifetime');
  });

  it('planFeatures uses shared plan catalog values', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.planFeatures('pro')).toContain('Up to 512 vault items');
    expect(c.planFeatures('free')).toContain('Up to 8 vault items');
  });

  it('planBadgeLabel matches Pricing tier badges', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.planBadgeLabel('free')).toBe('Starter');
    expect(c.planBadgeLabel('pro')).toBe('Best value');
    expect(c.planBadgeLabel('lifetime')).toBe('Pay once');
  });

  it('formatDisplayDate returns null for invalid input', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.formatDisplayDate(null)).toBeNull();
    expect(fixture.componentInstance.formatDisplayDate('not-a-date')).toBeNull();
  });

  it('formatInvoicePeriodRange joins period_start and period_end', () => {
    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();
    const line = fixture.componentInstance.formatInvoicePeriodRange({
      stripe_invoice_id: 'in_1',
      amount_paid: 100,
      currency: 'gbp',
      status: 'paid',
      hosted_invoice_url: null,
      invoice_pdf: null,
      period_start: '2026-01-01T00:00:00.000Z',
      period_end: '2026-02-01T00:00:00.000Z',
      created_stripe: null,
    });
    expect(line).toMatch(/Jan/);
    expect(line).toContain('–');
  });

  it('lifetimePlanDetails marks refund window closed after refund_request_until', () => {
    billingMock.getSummary.mockImplementation(() =>
      of({
        status: 'ok',
        summary: {
          plan: 'lifetime',
          status: 'paid',
          features: [] as string[],
          subscription: {
            purchased_at: '2026-01-01T12:00:00.000Z',
            refund_request_until: '2026-01-31T12:00:00.000Z',
          },
          payment_method: null,
          cancel_at_period_end: false,
          billing_available: true,
        },
      }),
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:00:00.001Z'));

    const fixture = TestBed.createComponent(SubscriptionComponent);
    fixture.detectChanges();

    const ld = fixture.componentInstance.lifetimePlanDetails();
    expect(ld).not.toBeNull();
    expect(ld!.refundWindowOpen).toBe(false);
  });
});
