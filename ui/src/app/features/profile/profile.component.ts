import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { AuthUser } from '../../core/auth/auth.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { VaultEraseDataComponent } from '../vault/vault-erase-data.component';

export type AccountTabId = 'profile' | 'password' | 'erase';

/** Account page: same chrome as Settings (`.settings-layout`, tabs, right Docs rail). */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, VaultEraseDataComponent],
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="settings-layout">
        <div class="settings-main">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Account</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">{{ accountPageKicker() }}</span>
            </h1>
          </header>

          <nav class="settings-tabs" role="tablist" aria-label="Account sections">
            @for (tab of accountTabs; track tab.id) {
              <button
                type="button"
                role="tab"
                class="control-tab"
                [class.control-tab--active]="activeTab() === tab.id"
                [id]="'account-tab-' + tab.id"
                [attr.aria-selected]="activeTab() === tab.id"
                [attr.aria-controls]="'account-panel-' + tab.id"
                (click)="selectTab(tab.id)"
              >
                @switch (tab.id) {
                  @case ('profile') {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  }
                  @case ('password') {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  }
                  @case ('erase') {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  }
                }
                <span>{{ tab.label }}</span>
              </button>
            }
          </nav>

          @if (activeTab() === 'profile') {
            <div
              id="account-panel-profile"
              role="tabpanel"
              aria-labelledby="account-tab-profile"
              class="settings-tab-panel"
            >
              <section class="settings-section-card">
                <h2 class="tab-panel-heading">
                  <span class="tab-panel-heading-title">Your profile</span>
                  <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                  <span class="tab-panel-heading-kicker">Signed-in identity</span>
                </h2>
                <form [formGroup]="profileForm" (ngSubmit)="saveDisplayName()" class="control-form-grid">
                  <div class="control-split">
                    <label class="control-split-label" for="account-display-name">Display name</label>
                    <input
                      id="account-display-name"
                      class="control-split-input"
                      type="text"
                      formControlName="display_name"
                      maxlength="200"
                      autocomplete="name"
                      placeholder="How you want to be addressed in the app"
                    />
                  </div>
                  <p class="text-xs leading-relaxed text-app-text-muted">
                    Clear the field and save to fall back to your sign-up name. Email and user ID stay read-only below.
                  </p>
                  <div class="control-actions-row">
                    <div class="control-actions-group">
                      <button class="control-btn-primary w-max" type="submit">
                        <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Save display name</span>
                      </button>
                    </div>
                  </div>
                </form>
                <dl class="mt-8 space-y-4 border-t border-app-border/55 pt-8 text-sm">
                  <div>
                    <dt class="text-app-text-muted">Email</dt>
                    <dd class="mt-0.5 font-medium text-app-text">{{ auth.user()?.email ?? 'N/A' }}</dd>
                  </div>
                  <div>
                    <dt class="text-app-text-muted">User ID</dt>
                    <dd class="mt-0.5 break-all font-mono text-xs text-app-text">{{ auth.user()?.id ?? 'N/A' }}</dd>
                  </div>
                </dl>
              </section>
            </div>
          }

          @if (activeTab() === 'password') {
            <div
              id="account-panel-password"
              role="tabpanel"
              aria-labelledby="account-tab-password"
              class="settings-tab-panel"
            >
              <section class="settings-section-card">
                <h2 class="tab-panel-heading">
                  <span class="tab-panel-heading-title">Change password</span>
                  <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                  <span class="tab-panel-heading-kicker">Account login</span>
                </h2>
                <form [formGroup]="passwordForm" (ngSubmit)="submitPasswordChange()" class="control-form-grid">
                  <div class="control-split">
                    <label class="control-split-label" for="account-current-password">Current password</label>
                    <input
                      id="account-current-password"
                      class="control-split-input"
                      type="password"
                      placeholder="Your current account password"
                      formControlName="current_password"
                      autocomplete="current-password"
                    />
                  </div>
                  <div class="control-split">
                    <label class="control-split-label" for="account-new-password">New password</label>
                    <input
                      id="account-new-password"
                      class="control-split-input"
                      type="password"
                      placeholder="8+ characters"
                      formControlName="new_password"
                      autocomplete="new-password"
                    />
                  </div>
                  <div class="control-split">
                    <label class="control-split-label" for="account-confirm-password">Confirm new</label>
                    <input
                      id="account-confirm-password"
                      class="control-split-input"
                      type="password"
                      placeholder="Re-enter new password"
                      formControlName="confirm_password"
                      autocomplete="new-password"
                    />
                  </div>
                  <div class="control-actions-row">
                    <div class="control-actions-group">
                      <button class="control-btn-primary w-max" type="submit">
                        <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                          />
                        </svg>
                        <span>Update password</span>
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </div>
          }

          @if (activeTab() === 'erase') {
            <div
              id="account-panel-erase"
              role="tabpanel"
              aria-labelledby="account-tab-erase"
              class="settings-tab-panel"
            >
              <app-vault-erase-data (vaultItemsCleared)="onVaultItemsCleared()" />
            </div>
          }
        </div>

        <aside class="settings-aside" aria-label="Documentation for this account section">
          <div class="settings-help-panel">
            <h2 class="settings-help-heading">Docs</h2>
            <div class="settings-help-hero">
              <div class="settings-help-hero-icon" aria-hidden="true">
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div class="settings-help-hero-text">
                <p class="settings-help-hero-title">In-context docs</p>
                <p class="settings-help-hero-sub">
                  Notes for the tab you have open. Product-wide reference lives under <strong>Docs</strong> in the header.
                </p>
              </div>
            </div>

            @switch (activeTab()) {
              @case ('profile') {
                <div class="settings-help-callout">
                  <span class="settings-help-callout-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </span>
                  <div>
                    <p class="settings-help-callout-title">Account vs vault</p>
                    <p class="settings-help-callout-body">
                      Email and user ID are your <strong>login account</strong>. Vault unlock secrets and recovery material are
                      separate, managed under Settings, not here.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">Practical tips</p>
                <div class="settings-help-tips">
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Display name.</strong> Edit it on this tab; when unset, the app falls back to your sign-up name or
                      email local part.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>User ID.</strong> Stable identifier for support and auditing; it is not your password or vault key.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">At a glance</p>
                <div class="settings-help-highlights">
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Display name is editable; email and ID are fixed identifiers.</span>
                  </div>
                </div>
              }
              @case ('password') {
                <div class="settings-help-callout">
                  <span class="settings-help-callout-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </span>
                  <div>
                    <p class="settings-help-callout-title">Login password only</p>
                    <p class="settings-help-callout-body">
                      This changes how you sign in. It does <strong>not</strong> rotate your vault unlock secret or recovery
                      secret, use Settings for those.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">Practical tips</p>
                <div class="settings-help-tips">
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Length.</strong> Use at least 8 characters; longer passphrases are better when combined with a
                      password manager.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>After a change.</strong> Other sessions may need to sign in again; unlock the vault again in this
                      tab if you use encrypted items.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">At a glance</p>
                <div class="settings-help-highlights">
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Confirm the new password twice to avoid typos.</span>
                  </div>
                </div>
              }
              @case ('erase') {
                <div class="settings-help-callout">
                  <span class="settings-help-callout-icon" aria-hidden="true">
                    <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </span>
                  <div>
                    <p class="settings-help-callout-title">Account password, not vault secret</p>
                    <p class="settings-help-callout-body">
                      The last step verifies your <strong class="font-medium text-app-text">login password</strong> with the
                      server. Your vault unlock phrase is never sent for this action.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">Before you erase</p>
                <div class="settings-help-tips">
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>JSON export</strong> needs an unlocked vault so the browser can decrypt each item before building the
                      file.
                    </p>
                  </div>
                </div>
              }
            }

            <p class="settings-help-section-label">More</p>
            <a routerLink="/docs" class="text-sm font-medium text-app-main-accent transition hover:underline">Open full documentation →</a>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  public readonly accountTabs: ReadonlyArray<{ id: AccountTabId; label: string }> = [
    { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    { id: 'erase', label: 'Erase data' },
  ];

  public readonly activeTab = signal<AccountTabId>('profile');

  public readonly accountPageKicker = computed(() => {
    const tab = this.accountTabs.find((t) => t.id === this.activeTab());
    return tab?.label ?? 'Account';
  });

  public readonly profileForm;
  public readonly passwordForm;

  constructor(
    public readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
  ) {
    this.profileForm = this.fb.group({
      display_name: ['', [Validators.maxLength(200)]],
    });
    this.passwordForm = this.fb.group({
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    });

    effect(() => {
      const u = this.auth.user();
      if (u) {
        this.profileForm.patchValue({ display_name: ProfileComponent.resolvedDisplayName(u) }, { emitEvent: false });
      }
    });
  }

  /** Fallback chain when `display_name` is not set (matches server semantics). */
  private static resolvedDisplayName(u: AuthUser): string {
    const custom = (u.display_name ?? '').trim();
    if (custom !== '') {
      return custom;
    }
    const fn = (u.first_name ?? '').trim();
    const ln = (u.last_name ?? '').trim();
    if (fn !== '' || ln !== '') {
      return `${fn} ${ln}`.trim();
    }
    const email = u.email;
    const local = email.split('@')[0];
    return local && local.length > 0 ? local : email;
  }

  public selectTab(id: AccountTabId): void {
    this.activeTab.set(id);
  }

  public saveDisplayName(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const raw = this.profileForm.getRawValue().display_name ?? '';
    this.auth.updateDisplayName(raw).subscribe({
      next: () => {
        this.toast.success('Display name saved');
      },
      error: (err: unknown) => {
        const body = err as { error?: { error?: string } };
        const code = body?.error?.error;
        if (code === 'display_name_too_long') {
          this.toast.error('Display name is too long (max 200 characters).');
          return;
        }
        this.toast.error(typeof code === 'string' ? code : 'Could not save display name');
      },
    });
  }

  public onVaultItemsCleared(): void {
    this.toast.success('All vault items were removed from the server. Open Vault → Items to refresh the list.');
  }

  public submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const raw = this.passwordForm.getRawValue();
    const next = raw.new_password ?? '';
    const confirm = raw.confirm_password ?? '';
    if (next !== confirm) {
      this.toast.error('New passwords do not match');
      return;
    }

    this.auth.changePassword(raw.current_password ?? '', next).subscribe({
      next: () => {
        this.toast.success('Password updated');
        this.passwordForm.reset();
      },
      error: (err) => {
        const code = err?.error?.error;
        if (code === 'password_not_set_for_oauth_account') {
          this.toast.error(
            'This account uses social sign-in only. Use Forgot password on the login page with this email to create a password, or keep using Google, LinkedIn, or Facebook.',
          );
          return;
        }
        const message = code ?? err?.message ?? 'Password change failed';
        this.toast.error(typeof message === 'string' ? message : 'Password change failed');
      },
    });
  }
}
