import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpErrorResponse } from '@angular/common/http';

import { BillingApiService } from '../../core/billing/billing-api.service';
import { SubscriptionDowngradeCheckComponent } from './subscription-downgrade-check.component';

describe('SubscriptionDowngradeCheckComponent', () => {
  const readinessAllowed = {
    from_plan: 'pro',
    allowed: true,
    reason: null,
    free_item_limit: 8,
    active_item_count: 2,
    file_vault_item_count: 0,
  };

  let getDowngradeReadiness: ReturnType<typeof vi.fn>;
  let downgradeToFree: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getDowngradeReadiness = vi.fn(() => of({ status: 'ok' as const, downgrade: { ...readinessAllowed } }));
    downgradeToFree = vi.fn(() => of({ status: 'ok' as const }));

    TestBed.configureTestingModule({
      imports: [SubscriptionDowngradeCheckComponent, RouterTestingModule],
      providers: [
        { provide: BillingApiService, useValue: { getDowngradeReadiness, downgradeToFree } },
      ],
    });
  });

  it('should create and load readiness', () => {
    const fixture = TestBed.createComponent(SubscriptionDowngradeCheckComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.readiness()?.allowed).toBe(true);
    expect(getDowngradeReadiness).toHaveBeenCalled();
  });

  it('should call downgradeToFree and navigate on confirm when allowed', async () => {
    const fixture = TestBed.createComponent(SubscriptionDowngradeCheckComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
    await fixture.componentInstance.confirmDowngrade();
    expect(downgradeToFree).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/subscription']);
    navigateSpy.mockRestore();
  });

  it('should not call downgradeToFree when not allowed', () => {
    getDowngradeReadiness.mockReturnValue(
      of({
        status: 'ok' as const,
        downgrade: { ...readinessAllowed, allowed: false, reason: 'free_item_limit_exceeded' },
      }),
    );
    const fixture = TestBed.createComponent(SubscriptionDowngradeCheckComponent);
    fixture.detectChanges();
    void fixture.componentInstance.confirmDowngrade();
    expect(downgradeToFree).not.toHaveBeenCalled();
  });

  it('should set error when downgradeToFree fails', () => {
    downgradeToFree.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'no' } })));
    const fixture = TestBed.createComponent(SubscriptionDowngradeCheckComponent);
    fixture.detectChanges();
    fixture.componentInstance.confirmDowngrade();
    expect(downgradeToFree).toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toBeTruthy();
  });
});
