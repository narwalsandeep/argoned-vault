import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="app-page-layout">
        <div class="app-page-main">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Status</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">API availability, maintenance windows, and dependency posture</span>
            </h1>
          </header>
          <div class="dashboard-stat-grid mb-8">
            <div class="dashboard-stat-card dashboard-stat-card--live">
              <div class="dashboard-stat-icon" aria-hidden="true">
                <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="dashboard-stat-body">
                <div class="dashboard-stat-label">UI shell</div>
                <div class="dashboard-stat-value">Operational</div>
              </div>
              <p class="dashboard-stat-detail">
                Angular shell is running and routing is active. Session-only areas stay behind the sign-in gate until you authenticate.
              </p>
            </div>
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-icon" aria-hidden="true">
                <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-16.5 0h16.5m-16.5 0l3.75 3.75M19.5 18l-3.75-3.75"
                  />
                </svg>
              </div>
              <div class="dashboard-stat-body">
                <div class="dashboard-stat-label">Backend probe</div>
                <div class="dashboard-stat-value">Configure</div>
              </div>
              <p class="dashboard-stat-detail">
                Placeholder for a live backend probe once a public health or status feed is wired in. Until then this tile stays manual
                configuration only.
              </p>
            </div>
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-icon" aria-hidden="true">
                <svg class="size-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="dashboard-stat-body">
                <div class="dashboard-stat-label">Maintenance</div>
                <div class="dashboard-stat-value">None scheduled</div>
              </div>
              <p class="dashboard-stat-detail">
                No maintenance window is configured in this build. Swap this copy for calendar-driven notices when operations hooks are
                added.
              </p>
            </div>
          </div>
          <p class="border-t border-app-border/60 pt-8 text-sm text-app-text-muted">
            For cryptographic guarantees and data-handling notes, see
            <a routerLink="/docs" class="font-medium text-app-main-accent hover:underline">Documentation</a>.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class StatusComponent {}
