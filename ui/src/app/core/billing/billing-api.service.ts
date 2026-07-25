import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api/api.tokens';
import { AuthService } from '../auth/auth.service';

export interface BillingPublicConfig {
  enabled: boolean;
  /** Stripe Payment Link URLs; UI appends client_reference_id for the logged-in user. */
  payment_links: { pro: string; lifetime: string };
  /** When true, API may allow a localhost-only dev Pro upgrade (never in production). */
  dev_simulate_pro?: boolean;
}

/**
 * Stripe-backed snapshot for the current paid record. Shape depends on plan.
 * For `lifetime`, expect `purchased_at` and `refund_request_until` (ISO 8601 strings).
 */
export type BillingSubscriptionSnapshot = Record<string, unknown>;

export interface BillingSummary {
  plan: string;
  status: string | null;
  features: string[];
  subscription: BillingSubscriptionSnapshot | null;
  payment_method: { brand: string; last4: string } | null;
  cancel_at_period_end: boolean;
  billing_available: boolean;
  /** Present on current API; when missing, clients should treat both flags as true. */
  capabilities?: {
    vault_import: boolean;
    vault_files: boolean;
  };
}

export interface BillingSummaryResponse {
  status: string;
  summary: BillingSummary;
}

export interface BillingDowngradeReadiness {
  from_plan: string;
  allowed: boolean;
  reason: string | null;
  free_item_limit: number;
  active_item_count: number;
  file_vault_item_count: number;
}

export interface BillingInvoiceRow {
  stripe_invoice_id: string;
  amount_paid: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: string | null;
  period_end: string | null;
  created_stripe: string | null;
}

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  public getConfig(): Observable<{ status: string; config: BillingPublicConfig }> {
    return this.http.get<{ status: string; config: BillingPublicConfig }>(
      `${this.baseUrl}/api/v1/billing/config`,
      { withCredentials: true },
    );
  }

  public getSummary(): Observable<BillingSummaryResponse> {
    return this.http.get<BillingSummaryResponse>(`${this.baseUrl}/api/v1/billing/summary`, { withCredentials: true });
  }

  public listInvoices(): Observable<{ status: string; invoices: BillingInvoiceRow[] }> {
    return this.http.get<{ status: string; invoices: BillingInvoiceRow[] }>(
      `${this.baseUrl}/api/v1/billing/invoices`,
      { withCredentials: true },
    );
  }

  public getDowngradeReadiness(): Observable<{ status: string; downgrade: BillingDowngradeReadiness }> {
    return this.http.get<{ status: string; downgrade: BillingDowngradeReadiness }>(
      `${this.baseUrl}/api/v1/billing/downgrade-readiness`,
      { withCredentials: true },
    );
  }

  public cancelAtPeriodEnd(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.baseUrl}/api/v1/billing/cancel-subscription`,
      {},
      this.withCsrf(),
    );
  }

  /**
   * Completes Pro → Free in the local database only (no Stripe). Same vault pre-checks as cancel-at-period-end.
   */
  public downgradeToFree(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.baseUrl}/api/v1/billing/downgrade-to-free`,
      {},
      this.withCsrf(),
    );
  }

  public syncCheckoutSession(sessionId: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.baseUrl}/api/v1/billing/sync-checkout-session`,
      { session_id: sessionId },
      this.withCsrf(),
    );
  }

  /** Local dev only: server must also allow (APP_ENV=local + env flag + loopback Host). */
  public devSimulateProUpgrade(): Observable<{ status: string; already?: boolean }> {
    return this.http.post<{ status: string; already?: boolean }>(
      `${this.baseUrl}/api/v1/billing/dev-simulate-pro`,
      {},
      this.withCsrf(),
    );
  }

  private withCsrf(): { withCredentials: boolean; headers: HttpHeaders } {
    const token = this.auth.csrfToken() ?? '';
    return {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-CSRF-Token': token }),
    };
  }
}
