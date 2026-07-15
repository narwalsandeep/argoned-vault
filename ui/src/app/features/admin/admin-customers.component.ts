import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ApiClientService } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';

export interface PlatformCustomerRow {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  plan_key: string;
  mfa_state: string | null;
}

interface CustomersResponse {
  status: string;
  customers: PlatformCustomerRow[];
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-customers.component.html',
})
export class AdminCustomersComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly auth = inject(AuthService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly customers = signal<PlatformCustomerRow[]>([]);
  public readonly deletingId = signal<string | null>(null);

  public ngOnInit(): void {
    this.api.get<CustomersResponse>('/api/v1/admin/customers').subscribe({
      next: (res) => {
        if (res.status !== 'ok' || !Array.isArray(res.customers)) {
          this.error.set('Unexpected response from server.');
          this.customers.set([]);
        } else {
          this.customers.set(res.customers);
          this.error.set(null);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load customers. You may not have access, or the server is unavailable.');
        this.loading.set(false);
        this.customers.set([]);
      },
    });
  }

  public displayName(row: PlatformCustomerRow): string {
    const d = row.display_name?.trim();
    if (d) {
      return d;
    }
    const parts = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return row.email;
  }

  public planLabel(plan: string): string {
    switch (plan) {
      case 'pro':
        return 'Pro';
      case 'lifetime':
        return 'Lifetime';
      default:
        return 'Free';
    }
  }

  public confirmDelete(row: PlatformCustomerRow): void {
    const ok = window.confirm(
      `Permanently delete account ${row.email}?\n\nThis removes their vault, sessions, billing records on this server, and related logs. This cannot be undone.`,
    );
    if (!ok) {
      return;
    }
    const csrf = this.auth.csrfToken();
    if (!csrf) {
      this.error.set('Your session has no CSRF token. Refresh the page and try again.');
      return;
    }
    this.error.set(null);
    this.deletingId.set(row.id);
    this.api.delete<{ status: string; error?: string }>(`/api/v1/admin/customers/${encodeURIComponent(row.id)}`, csrf).subscribe({
      next: (res) => {
        this.deletingId.set(null);
        if (res.status === 'ok') {
          this.customers.update((list) => list.filter((c) => c.id !== row.id));
        } else {
          this.error.set('Delete did not complete. Try again.');
        }
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        let code: string | undefined;
        if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'error' in err.error) {
          code = (err.error as { error?: string }).error;
        }
        const msg =
          code === 'cannot_delete_self'
            ? 'You cannot delete your own account from this screen.'
            : code === 'cannot_delete_platform_admin_account'
              ? 'The platform admin account cannot be deleted here.'
              : code === 'user_not_found'
                ? 'That account no longer exists.'
                : 'Delete failed. Check your connection or permissions.';
        this.error.set(msg);
      },
    });
  }
}
