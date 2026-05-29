import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { BillingApiService, type BillingDowngradeReadiness } from '../../core/billing/billing-api.service';
import { SHOW_LIFETIME_ON_PRICING } from '../../core/config/pricing-visibility.token';
import { PricingComponent } from './pricing.component';

function summaryResponse(plan: string) {
  return {
    status: 'ok',
    summary: {
      plan,
      status: null,
      features: [] as string[],
      subscription: null,
      payment_method: null,
      cancel_at_period_end: false,
      billing_available: true,
    },
  };
}

const defaultDowngrade: BillingDowngradeReadiness = {
  from_plan: 'pro',
  allowed: true,
  reason: null,
  free_item_limit: 8,
  active_item_count: 0,
  file_vault_item_count: 0,
};

describe('PricingComponent', () => {
  let getSummary: ReturnType<typeof vi.fn>;
  let getConfig: ReturnType<typeof vi.fn>;
  let getDowngradeReadiness: ReturnType<typeof vi.fn>;
  let downgradeToFree: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSummary = vi.fn(() => of(summaryResponse('free')));
    getConfig = vi.fn(() =>
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
    getDowngradeReadiness = vi.fn(() => of({ status: 'ok' as const, downgrade: { ...defaultDowngrade } }));
    downgradeToFree = vi.fn(() => of({ status: 'ok' as const }));

    TestBed.configureTestingModule({
      imports: [PricingComponent, RouterTestingModule],
      providers: [
        {
          provide: BillingApiService,
          useValue: { getSummary, getConfig, getDowngradeReadiness, downgradeToFree },
        },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: 'user-1', email: 'a@b.com' }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: new BehaviorSubject(convertToParamMap({})).asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: SHOW_LIFETIME_ON_PRICING, useValue: true },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show bulk import spotlight and tier import copy', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.pricing-import-spotlight')).toBeTruthy();
    expect(root.textContent).toContain('CSV');
    expect(root.textContent).toContain('JSON');
    expect(root.textContent).toContain('Bring every password');
  });

  it('should open Lifetime policy modal from the info control and hide long copy until opened', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const articles = (fixture.nativeElement as HTMLElement).querySelectorAll('.pricing-tier-card');
    const lifetimeCard = articles[2] as HTMLElement;
    expect(lifetimeCard.textContent).not.toContain('30 calendar');
    const trigger = lifetimeCard.querySelector('.pricing-lifetime-policy-trigger') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    trigger?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('30 calendar');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    const gotIt = (fixture.nativeElement as HTMLElement).querySelector(
      '.vault-unlock-modal-inner .control-btn-primary',
    ) as HTMLButtonElement | null;
    expect(gotIt?.textContent?.trim()).toBe('Got it');
    gotIt?.click();
    fixture.detectChanges();
    expect(lifetimeCard.textContent).not.toContain('30 calendar');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('should show a plan flair block with icon and copy for each tier', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const flairs = root.querySelectorAll('.pricing-tier-flair');
    expect(flairs.length).toBe(3);
    expect(root.textContent).toContain('Free is free');
    expect(root.textContent).toContain('Less than one espresso');
    expect(root.textContent).toContain('Pay once, party forever');
    flairs.forEach((el) => {
      expect(el.querySelector('.pricing-tier-flair-icon svg')).toBeTruthy();
      expect(el.querySelector('.pricing-tier-flair-copy')).toBeTruthy();
    });
  });

  it('should show check + Current plan on Free when summary plan is free', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const articles = (fixture.nativeElement as HTMLElement).querySelectorAll('.pricing-tier-card');
    const freeActions = articles[0]?.querySelector('.pricing-tier-actions');
    expect(freeActions?.querySelector('.pricing-tier-plan-status')).toBeTruthy();
    expect(freeActions?.textContent).toContain('Current plan');
    expect(freeActions?.querySelector('.pricing-tier-plan-status-icon')).toBeTruthy();
    expect(articles[1]?.querySelector('.pricing-tier-actions a')?.textContent?.trim()).toBe('Upgrade to Pro');
    expect(articles[2]?.querySelector('.pricing-tier-actions')?.textContent).toContain('Coming soon');
    expect(articles[2]?.querySelector('.pricing-tier-actions a.btn-primary')).toBeNull();
  });

  it('should show check + Current plan on Pro when summary plan is pro', () => {
    getSummary.mockReturnValue(of(summaryResponse('pro')));
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const articles = (fixture.nativeElement as HTMLElement).querySelectorAll('.pricing-tier-card');
    const proActions = articles[1]?.querySelector('.pricing-tier-actions');
    expect(proActions?.querySelector('.pricing-tier-plan-status')).toBeTruthy();
    expect(proActions?.textContent).toContain('Current plan');
    expect(proActions?.querySelector('a')).toBeNull();
    const freeCta = articles[0]?.querySelector('.pricing-tier-actions button.btn-primary')?.textContent?.trim();
    expect(freeCta).toBe('Downgrade');
  });

  it('should show check + Current plan on Lifetime when summary plan is lifetime', () => {
    getSummary.mockReturnValue(of(summaryResponse('lifetime')));
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const articles = (fixture.nativeElement as HTMLElement).querySelectorAll('.pricing-tier-card');
    const lifeActions = articles[2]?.querySelector('.pricing-tier-actions');
    expect(lifeActions?.querySelector('.pricing-tier-plan-status')).toBeTruthy();
    expect(lifeActions?.textContent).toContain('Current plan');
    expect(lifeActions?.querySelector('a')).toBeNull();
    const freeCta = articles[0]
      ?.querySelector('a[routerLink="/subscription/downgrade"]')
      ?.textContent?.trim();
    expect(freeCta).toBe('Downgrade');
  });

  it('should run DB-only downgrade from Free tier for Pro when readiness allows', async () => {
    getSummary.mockReturnValue(of(summaryResponse('pro')));
    const fixture = TestBed.createComponent(PricingComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    await fixture.componentInstance.onDowngradeToFreeFromPricing();
    expect(getDowngradeReadiness).toHaveBeenCalled();
    expect(downgradeToFree).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/subscription']);
    navigateSpy.mockRestore();
  });

  it('should send Pro user to downgrade help when readiness is not allowed', async () => {
    getSummary.mockReturnValue(of(summaryResponse('pro')));
    getDowngradeReadiness.mockReturnValue(
      of({
        status: 'ok' as const,
        downgrade: { ...defaultDowngrade, allowed: false, reason: 'free_item_limit_exceeded' },
      }),
    );
    const fixture = TestBed.createComponent(PricingComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    await fixture.componentInstance.onDowngradeToFreeFromPricing();
    expect(downgradeToFree).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/subscription/downgrade']);
    navigateSpy.mockRestore();
  });

  it('should navigate to downgrade help and set checkoutError when downgradeToFree fails', async () => {
    getSummary.mockReturnValue(of(summaryResponse('pro')));
    downgradeToFree.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error: 'downgrade_requirements_not_met' },
          }),
      ),
    );
    const fixture = TestBed.createComponent(PricingComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    await fixture.componentInstance.onDowngradeToFreeFromPricing();
    expect(navigateSpy).toHaveBeenCalledWith(['/subscription/downgrade']);
    expect(fixture.componentInstance.checkoutError()).toContain('vault');
    navigateSpy.mockRestore();
  });

  it('should treat unknown plan as free for Free status row', () => {
    getSummary.mockReturnValue(of(summaryResponse('enterprise')));
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const articles = (fixture.nativeElement as HTMLElement).querySelectorAll('.pricing-tier-card');
    expect(articles[0]?.querySelector('.pricing-tier-actions .pricing-tier-plan-status')).toBeTruthy();
  });

  it('should show primary upgrade buttons when summary fails', () => {
    getSummary.mockReturnValue(throwError(() => new Error('network')));
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('could not load your current plan');
    const articles = root.querySelectorAll('.pricing-tier-card');
    expect(articles[0]?.querySelector('.pricing-tier-actions a.btn-primary')?.textContent?.trim()).toBe('Upgrade');
    expect(articles[1]?.querySelector('.pricing-tier-actions a.btn-primary')?.textContent?.trim()).toBe('Upgrade to Pro');
    expect(articles[2]?.querySelector('.pricing-tier-actions')?.textContent).toContain('Coming soon');
  });

  it('opens Stripe payment link with client_reference_id from goToPaymentLink', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();

    fixture.componentInstance.goToPaymentLink('pro');

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target, features] = openSpy.mock.calls[0] as [string, string, string];
    expect(target).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');
    expect(url).toContain('https://buy.stripe.com/test-pro');
    expect(url).toContain(`client_reference_id=${encodeURIComponent('user-1')}`);
    openSpy.mockRestore();
  });

  it('sets checkout error when popup is blocked', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();

    fixture.componentInstance.goToPaymentLink('lifetime');

    expect(fixture.componentInstance.checkoutError()).toContain('blocked checkout');
    openSpy.mockRestore();
  });

  it('hides Lifetime tier and policy modal when SHOW_LIFETIME_ON_PRICING is false', () => {
    TestBed.resetTestingModule();
    getSummary = vi.fn(() => of(summaryResponse('free')));
    getConfig = vi.fn(() =>
      of({
        status: 'ok',
        config: {
          enabled: true,
          payment_links: { pro: 'https://buy.stripe.com/test-pro', lifetime: 'https://buy.stripe.com/test-life' },
        },
      }),
    );
    getDowngradeReadiness = vi.fn(() => of({ status: 'ok' as const, downgrade: { ...defaultDowngrade } }));
    downgradeToFree = vi.fn(() => of({ status: 'ok' as const }));
    TestBed.configureTestingModule({
      imports: [PricingComponent, RouterTestingModule],
      providers: [
        { provide: BillingApiService, useValue: { getSummary, getConfig, getDowngradeReadiness, downgradeToFree } },
        { provide: AuthService, useValue: { user: () => ({ id: 'user-1', email: 'a@b.com' }) } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: new BehaviorSubject(convertToParamMap({})).asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: SHOW_LIFETIME_ON_PRICING, useValue: false },
      ],
    });
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.pricing-tier-card').length).toBe(2);
    expect(root.textContent).not.toContain('Get Lifetime');
    const grid = root.querySelector('.pricing-tier-grid');
    expect(grid?.classList.contains('pricing-tier-grid--two-tiers')).toBe(true);
  });
});
