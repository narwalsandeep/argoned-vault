import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { BillingApiService } from '../../../core/billing/billing-api.service';
import { VaultService } from '../../../core/vault/vault.service';
import { ChooseTypeComponent } from './choose-type.component';

describe('ChooseTypeComponent', () => {
  beforeEach(async () => {
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
                  capabilities: { vault_import: true, vault_files: true },
                },
              }),
          },
        },
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
});
