import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { ToastService } from '../../core/ui/toast.service';
import { VaultFieldShareApiService, type VaultFieldShareListEntry } from '../../core/vault/vault-field-share-api.service';

@Component({
  selector: 'app-settings-shares-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="settings-section-card">
      <h2 class="tab-panel-heading">
        <span class="tab-panel-heading-title">Shared links</span>
        <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
        <span class="tab-panel-heading-kicker">Active field shares</span>
      </h2>
      <p class="mb-4 text-sm leading-relaxed text-app-text-muted">
        One-time links you created. Revoke before use to block redemption. Metadata only — no secret values stored on the server.
      </p>

      @if (loading()) {
        <p class="text-sm text-app-text-muted">Loading…</p>
      } @else if (shares().length === 0) {
        <p class="text-sm text-app-text-muted">No active shares.</p>
      } @else {
        <div class="share-list-table-wrap overflow-x-auto">
          <table class="share-list-table w-full text-left text-sm">
            <thead>
              <tr>
                <th scope="col">Label / field</th>
                <th scope="col">Expires</th>
                <th scope="col">Views</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (share of shares(); track share.id) {
                <tr>
                  <td>
                    <div class="font-medium text-app-text">{{ share.label || '—' }}</div>
                    <div class="text-xs text-app-text-muted">{{ share.field_key || 'field' }}</div>
                  </td>
                  <td class="text-app-text-muted">{{ formatExpires(share.expires_at) }}</td>
                  <td class="text-app-text-muted">{{ share.view_count }} / {{ share.max_views }}</td>
                  <td>
                    <button
                      type="button"
                      class="control-btn-secondary text-xs"
                      [disabled]="revokingId() === share.id"
                      (click)="revoke(share)"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class SettingsSharesPanelComponent implements OnInit {
  private readonly shareApi = inject(VaultFieldShareApiService);
  private readonly toast = inject(ToastService);

  public readonly loading = signal(true);
  public readonly shares = signal<VaultFieldShareListEntry[]>([]);
  public readonly revokingId = signal<string | null>(null);

  public ngOnInit(): void {
    this.reload();
  }

  public reload(): void {
    this.loading.set(true);
    this.shareApi.list().subscribe({
      next: (rows) => {
        this.shares.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Unable to load shares');
      },
    });
  }

  public revoke(share: VaultFieldShareListEntry): void {
    this.revokingId.set(share.id);
    this.shareApi.revoke(share.id).subscribe({
      next: () => {
        this.shares.update((rows) => rows.filter((r) => r.id !== share.id));
        this.revokingId.set(null);
        this.toast.success('Share revoked');
      },
      error: () => {
        this.revokingId.set(null);
        this.toast.error('Unable to revoke share');
      },
    });
  }

  public formatExpires(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }
}
