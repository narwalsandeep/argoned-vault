import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import { ChooseTypeComponent } from './choose-type.component';

const defaultDowngrade = {
  from_plan: 'free',
  allowed: false,
  reason: 'no_active_pro_subscription',
  free_item_limit: 8,
  active_item_count: 0,
  file_vault_item_count: 0,
};

function billingProvider(activeItemCount = 0, plan = 'free') {
  return {
    provide: BillingApiService,
    useValue: {
      getSummary: () =>
        of({
          status: 'ok',
          summary: {
            plan,
            status: null,
            features: [],
            subscription: null,
            payment_method: null,
            cancel_at_period_end: false,
            billing_available: true,
            capabilities: { vault_import: true, vault_files: true },
          },
        }),
      getDowngradeReadiness: () =>
        of({
          status: 'ok',
          downgrade: { ...defaultDowngrade, from_plan: plan, active_item_count: activeItemCount },
        }),
    },
  };
}

describe('ChooseTypeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseTypeComponent, RouterTestingModule],
      providers: [
        { provide: VaultService, useValue: { listItems: () => of([]) } },
        billingProvider(),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ChooseTypeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show create page title and lede', () => {
    const fixture = TestBed.createComponent(ChooseTypeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Create');
    expect(el.textContent).toContain('Choose a type');
  });

  it('should render all creatable options', () => {
    const fixture = TestBed.createComponent(ChooseTypeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button.create-choice-card');
    const links = el.querySelectorAll('a.create-choice-card');
    expect(buttons.length + links.length).toBe(7);
    expect(links.length).toBe(7);
    expect(buttons.length).toBe(0);
  });

  it('should describe import as supporting JSON and CSV', () => {
    const fixture = TestBed.createComponent(ChooseTypeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('JSON');
    expect(el.textContent).toContain('CSV');
    expect(el.textContent).toContain('Import vault items');
  });

  it('should link import to subscription when capabilities deny vault_import', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ChooseTypeComponent, RouterTestingModule],
      providers: [
        { provide: VaultService, useValue: { listItems: () => of([]) } },
        {
          provide: BillingApiService,
          useValue: {
            getSummary: () =>
              of({
                status: 'ok',
                summary: {
                  plan: 'free',
                  status: null,
                  features: [],
                  subscription: null,
                  payment_method: null,
                  cancel_at_period_end: false,
                  billing_available: true,
                  capabilities: { vault_import: false, vault_files: false },
                },
              }),
            getDowngradeReadiness: () => of({ status: 'ok', downgrade: { ...defaultDowngrade } }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChooseTypeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Paid plans');
    expect(el.textContent).toContain('Free plan: no bulk import.');
    expect(el.textContent).toContain('View plans');
    const importRow = el.querySelector('li.create-choice-grid__import');
    const upgradeLink = importRow?.querySelector('a.create-choice-card--upgrade');
    expect(upgradeLink).toBeTruthy();
  });

  it('should show plan-limit upgrade cards instead of form links when free user is at item cap', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ChooseTypeComponent, RouterTestingModule],
      providers: [
        { provide: VaultService, useValue: { listItems: () => of([]) } },
        billingProvider(100, 'free'),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChooseTypeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.vaultItemCreateBlocked()).toBe(true);
    expect(el.textContent).toContain('Plan limit');
    expect(el.textContent).toContain('100 of 8 vault items');
    expect(el.textContent).toContain('View plans');

    const formLinks = Array.from(el.querySelectorAll('a.create-choice-card')).filter((a) => {
      const href = a.getAttribute('href') ?? '';
      return href.includes('/new/item/') || href.includes('/new/credentials');
    });
    expect(formLinks.length).toBe(0);

    const limitUpgrades = el.querySelectorAll('a.create-choice-card--upgrade');
    expect(limitUpgrades.length).toBeGreaterThan(0);
  });
});
