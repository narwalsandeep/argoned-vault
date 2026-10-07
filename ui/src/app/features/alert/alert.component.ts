import { Component } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="app-page-layout">
        <div class="app-page-main">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Alerts</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">Security, policy, and critical system notices (shown when posted)</span>
            </h1>
          </header>
          <div class="flex flex-col gap-4 border-t border-app-border/60 pt-8 sm:flex-row sm:items-start">
            <div class="text-app-main-accent" aria-hidden="true">
              <svg class="size-8" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-app-text">No active alerts</h2>
              <p class="mt-1 text-sm text-app-text-muted">
                When present, high-severity items will appear here with timestamps and recommended actions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AlertComponent {}
