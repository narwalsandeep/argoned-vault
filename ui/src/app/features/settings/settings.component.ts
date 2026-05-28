import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import type { RecoveryArtifactPayload } from '../../core/vault/vault.service';
import { VaultService } from '../../core/vault/vault.service';
import { VAULT_UNLOCK_SECRET_MIN_LENGTH } from '../../core/vault/vault-unlock-policy';
import { WebCryptoService } from '../../core/vault/web-crypto.service';
import { VaultProfileBootstrapComponent } from '../vault/vault-profile-bootstrap.component';

export type SettingsTabId = 'profile' | 'recovery';

/** Server artifact fetch for Recovery tab: unlock/rotate depend on explicit load. */
export type RecoveryServerLoadState = 'idle' | 'missing' | 'loaded';

/** Page chrome: layout.css (`.settings-*`, `.control-*` for forms/tabs). */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, VaultProfileBootstrapComponent],
  template: `
    <div class="page-content page-pad--settings settings-page-fill text-left">
      <div class="settings-layout">
        <div class="settings-main">
          <header class="settings-page-header">
            <h1 class="settings-page-heading">
              <span class="settings-page-title">Settings</span>
              <span class="settings-page-heading-dot" aria-hidden="true">.</span>
              <span class="settings-page-kicker">{{ settingsPageKicker() }}</span>
            </h1>
          </header>

          <nav class="settings-tabs" role="tablist" aria-label="Settings sections">
            @for (tab of settingsTabs; track tab.id) {
              <button
                type="button"
                role="tab"
                class="control-tab"
                [class.control-tab--active]="activeTab() === tab.id"
                [id]="'settings-tab-' + tab.id"
                [attr.aria-selected]="activeTab() === tab.id"
                [attr.aria-controls]="'settings-panel-' + tab.id"
                (click)="selectTab(tab.id)"
              >
                @switch (tab.id) {
                  @case ('profile') {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  @case ('recovery') {
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
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
              id="settings-panel-profile"
              role="tabpanel"
              [attr.aria-labelledby]="'settings-tab-profile'"
              class="settings-tab-panel"
            >
              <app-vault-profile-bootstrap />
            </div>
          }

          @if (activeTab() === 'recovery') {
            <div
              id="settings-panel-recovery"
              role="tabpanel"
              [attr.aria-labelledby]="'settings-tab-recovery'"
              class="settings-tab-panel"
            >
              <section class="settings-section-card">
                <h2 class="tab-panel-heading">
                  <span class="tab-panel-heading-title">Recovery</span>
                  <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                  <span class="tab-panel-heading-kicker">Backup unlock</span>
                </h2>
                <p class="settings-recovery-flow-intro mb-5 text-sm leading-relaxed text-app-text-muted">
                  With the vault unlocked: <strong class="text-app-text">Create</strong> or <strong class="text-app-add">Rotate Artifact</strong>.
                  Then <strong class="text-app-text">Load Artifact</strong> before <strong class="text-app-add">Unlock Vault</strong>. Passphrase stays with you; not in email.
                </p>

                @if (recoveryServerLoadState() === 'loaded') {
                  <p class="settings-recovery-unlock-hint mb-4 text-sm text-app-text-muted" role="status">
                    Enter passphrase, then <strong class="text-app-add">Unlock Vault</strong>.
                  </p>
                }

                <form [formGroup]="form" (ngSubmit)="saveArtifact()" class="control-form-grid">
                  <div class="control-split">
                    <div class="control-split-label">Artifact format</div>
                    <div class="control-split-input flex items-center text-app-text-muted">recovery_key_wrap</div>
                  </div>
                  <div class="control-split">
                    <label class="control-split-label" for="settings-recovery-secret">Recovery secret</label>
                    <input
                      id="settings-recovery-secret"
                      class="control-split-input"
                      type="password"
                      placeholder="12+ chars, not login password"
                      formControlName="recovery_secret"
                      autocomplete="off"
                    />
                  </div>
                  <div class="control-actions-row control-actions-row-split">
                    <div class="control-actions-group shrink-0" aria-label="Load Artifact (recovery backup from account)">
                      <button type="button" class="control-btn-secondary" (click)="loadArtifact({ announce: true })">
                        <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        <span>Load Artifact</span>
                      </button>
                    </div>
                    <div class="control-actions-row-split-trailing min-w-0 flex-1">
                      @if (recoveryServerLoadState() === 'loaded' || artifactJson().trim() !== '') {
                        <div class="control-actions-group">
                          @if (recoveryServerLoadState() === 'loaded') {
                            <button type="button" class="control-btn-recovery-emphasis" (click)="rotateArtifact()">
                              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              <span>Rotate Artifact</span>
                            </button>
                            <button type="button" class="control-btn-recovery-emphasis" (click)="unlockFromRecovery()">
                              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                              <span>Unlock Vault</span>
                            </button>
                          }
                          @if (artifactJson().trim() !== '') {
                            <button type="button" class="control-btn-secondary" (click)="downloadEmergencyKit()">
                              <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span>Download emergency kit</span>
                            </button>
                          }
                        </div>
                      }
                      <div class="control-actions-group">
                        <button type="submit" class="control-btn-primary">
                          <svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                          <span>Create</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </section>

              @if (artifactJson()) {
                <section class="settings-section-card settings-section-follow">
                  <h3 class="tab-panel-heading tab-panel-heading--compact">
                    <span class="tab-panel-heading-title">Latest recovery artifact</span>
                    <span class="tab-panel-heading-dot" aria-hidden="true">.</span>
                    <span class="tab-panel-heading-kicker">JSON preview</span>
                  </h3>
                  <pre class="settings-artifact-pre">{{ artifactJson() }}</pre>
                </section>
              }
            </div>
          }
        </div>

        <aside class="settings-aside" aria-label="Help for this settings section">
          <div class="settings-help-panel">
            <h2 class="settings-help-heading">Help</h2>
            <div class="settings-help-hero">
              <div class="settings-help-hero-icon" aria-hidden="true">
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="settings-help-hero-text">
                <p class="settings-help-hero-title">In-context guidance</p>
                <p class="settings-help-hero-sub">Highlights and tips follow the tab you have open, no extra hunting.</p>
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </span>
                  <div>
                    <p class="settings-help-callout-title">Server-side vault profile</p>
                    <p class="settings-help-callout-body">
                      Establishes Argon2id parameters and a wrapped vault key on the server. Run once at setup, then only if you
                      deliberately rotate the profile.
                    </p>
                  </div>
                </div>
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
                    <p class="settings-help-callout-title">This browser tab</p>
                    <p class="settings-help-callout-body">
                      Unlock happens when the app prompts (for example opening vault or Add). Each tab keeps its own lock state
                      until you unlock there too. Idle auto-lock uses minute presets on the Vault workspace
                      <strong class="font-medium text-app-text">Session</strong> tab.
                    </p>
                  </div>
                </div>
                <p class="settings-help-section-label">Time, memory, and parallelism</p>
                <div class="settings-help-tips">
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Time cost.</strong> How many passes Argon2id runs when turning your unlock secret into keys. Higher
                      slows each unlock but makes guessing harder. It only runs when deriving keys, not during normal use.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Memory.</strong> RAM used for each derivation. More raises the bar for large-scale attacks but needs
                      enough free memory on this device. The slider steps through allowed sizes only.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Parallelism.</strong> How many CPU lanes work on the hash at once. More can speed derivation on
                      multi-core machines; 1 is easiest on thin laptops. Same key-derivation step only, not ongoing app speed.
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
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Same unlock secret.</strong> One vault unlock secret for your account (the one you use for profile
                      bootstrap). Each tab keeps its own copy of the derived key in memory after you unlock there.
                    </p>
                  </div>
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
                      <strong>What gets stored.</strong> The server keeps wrapping metadata and parameters, not your raw unlock
                      secret.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Argon2id takes time.</strong> Derivation can run 30 to 90s; keep this tab in the foreground until it
                      completes.
                    </p>
                  </div>
                  <div class="settings-help-tip">
                    <span class="settings-help-tip-icon" aria-hidden="true">
                      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                        />
                      </svg>
                    </span>
                    <p class="settings-help-tip-body">
                      <strong>Existing items.</strong> Rotating the profile does not automatically re-encrypt older ciphertext;
                      plan migrations if keys change.
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
                    <span>Choose time and parallelism with the buttons; set memory with the slider (fixed steps).</span>
                  </div>
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Use a strong unlock secret ({{ vaultUnlockSecretMin }}+ characters minimum; spaces count).</span>
                  </div>
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Profile must exist before unlock can succeed.</span>
                  </div>
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Logout clears the session; unlock again after signing back in.</span>
                  </div>
                </div>
              }
              @case ('recovery') {
                <p class="settings-help-section-title text-sm">How to use recovery (step by step)</p>
                <ol class="settings-help-steps">
                  <li>
                    <strong>Pick a recovery phrase</strong> you will remember (at least 12 characters). It is
                    <strong>not</strong> the same as your sign-in password. We never email this phrase to you; only you should know
                    it.
                  </li>
                  <li>
                    <strong>Unlock your vault</strong> in the app the normal way. Then come to this tab and tap
                    <strong>Create</strong>. That saves an encrypted backup for your account.
                  </li>
                  <li>
                    Whenever you need to work with that backup on this screen, tap <strong>Load Artifact</strong> first. You must
                    do that before <strong>Rotate Artifact</strong> or <strong>Unlock Vault</strong> will work here.
                  </li>
                  <li>
                    To <strong>Unlock Vault</strong>, type the <strong>same</strong> recovery phrase in the box, then tap the
                    button. Use this only when you really need to open the vault using your backup.
                  </li>
                  <li>
                    Tap <strong>Download emergency kit</strong> and keep the file somewhere safe <strong>outside</strong> this
                    browser; for example a USB drive you keep at home, or a trusted backup. After Create or Rotate Artifact, you may also
                    get an email with an encrypted copy; that email still does not contain your phrase.
                  </li>
                </ol>
                <p class="settings-help-section-label mt-5">Please remember</p>
                <div class="settings-help-highlights">
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>If you lose both your recovery phrase and your offline backup, your vault data cannot be recovered.</span>
                  </div>
                  <div class="settings-help-highlight">
                    <span class="settings-help-highlight-icon" aria-hidden="true">
                      <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Leave “artifact type” on the default unless support told you to change it.</span>
                  </div>
                </div>
              }
            }
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  public readonly vaultUnlockSecretMin = VAULT_UNLOCK_SECRET_MIN_LENGTH;

  public readonly settingsTabs: ReadonlyArray<{ id: SettingsTabId; label: string }> = [
    { id: 'profile', label: 'Vault Profile' },
    { id: 'recovery', label: 'Recovery' },
  ];

  public readonly activeTab = signal<SettingsTabId>('profile');

  /** Main header subheading: tracks the selected settings tab (title. kicker). */
  public readonly settingsPageKicker = computed(() => {
    const id = this.activeTab();
    const tab = this.settingsTabs.find((t) => t.id === id);
    return tab?.label ?? 'Vault';
  });

  public readonly artifactJson = signal('');
  public readonly latestArtifact = signal<RecoveryArtifactPayload | null>(null);
  public readonly recoveryServerLoadState = signal<RecoveryServerLoadState>('idle');

  public readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly vault: VaultService,
    private readonly crypto: WebCryptoService,
    private readonly toast: ToastService,
    private readonly auth: AuthService,
  ) {
    this.form = this.fb.group({
      artifact_type: [{ value: 'recovery_key_wrap', disabled: true }, Validators.required],
      recovery_secret: ['', [Validators.required, Validators.minLength(12)]],
    });
  }

  public selectTab(id: SettingsTabId): void {
    this.activeTab.set(id);
  }

  public async saveArtifact(): Promise<void> {
    if (!this.crypto.isVaultUnlocked()) {
      this.toast.info('Unlock the vault first, then create a recovery backup.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.info('Enter a recovery passphrase (12+ characters), different from your login password.');
      return;
    }
    const raw = this.form.getRawValue();

    try {
      const payload = await this.crypto.buildRecoveryArtifact(raw.recovery_secret ?? '', raw.artifact_type ?? 'recovery_key_wrap');
      this.vault.createRecoveryArtifact(payload).subscribe({
        next: (response) => {
          this.artifactJson.set(JSON.stringify(response.artifact, null, 2));
          this.latestArtifact.set(null);
          this.recoveryServerLoadState.set('idle');
          this.toast.success('Recovery artifact created');
          this.queueRecoveryBackupEmail();
        },
        error: (err) => {
          this.toast.error(err?.error?.error ?? 'Create failed');
        },
      });
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  public async rotateArtifact(): Promise<void> {
    if (!this.crypto.isVaultUnlocked()) {
      this.toast.info('Unlock the vault first, then rotate the recovery backup.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.info('Enter a recovery passphrase (12+ characters).');
      return;
    }
    if (this.recoveryServerLoadState() !== 'loaded') {
      this.toast.info('Load artifact first.');
      return;
    }
    const raw = this.form.getRawValue();

    try {
      const payload = await this.crypto.buildRecoveryArtifact(raw.recovery_secret ?? '', raw.artifact_type ?? 'recovery_key_wrap');
      this.vault.rotateRecoveryArtifact(payload).subscribe({
        next: (response) => {
          this.artifactJson.set(JSON.stringify(response.artifact, null, 2));
          this.latestArtifact.set(null);
          this.recoveryServerLoadState.set('idle');
          this.toast.success('Recovery artifact rotated');
          this.queueRecoveryBackupEmail();
        },
        error: (err) => {
          this.toast.error(err?.error?.error ?? 'Rotate failed');
        },
      });
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Rotate failed');
    }
  }

  /**
   * Fetches the server’s recovery row into this tab. Required before rotate artifact / unlock vault (explicit user action).
   *
   * @param options.announce When true, show success/info toasts (button click).
   */
  public loadArtifact(options?: { announce?: boolean }): void {
    const announce = options?.announce === true;
    this.vault.getRecoveryArtifact().subscribe({
      next: (response) => {
        this.artifactJson.set(JSON.stringify(response.artifact, null, 2));
        if (
          typeof response.artifact.wrapped_vault_key_recovery === 'string' &&
          typeof response.artifact.nonce === 'string' &&
          typeof response.artifact.tag === 'string'
        ) {
          this.latestArtifact.set({
            artifact_type: response.artifact.artifact_type,
            wrapped_vault_key_recovery: response.artifact.wrapped_vault_key_recovery,
            nonce: response.artifact.nonce,
            tag: response.artifact.tag,
          });
          this.recoveryServerLoadState.set('loaded');
          if (announce) {
            this.toast.success('Artifact loaded.');
          }
        } else {
          this.latestArtifact.set(null);
          this.recoveryServerLoadState.set('missing');
          if (announce) {
            this.toast.info('Server returned a recovery row without ciphertext fields.');
          }
        }
      },
      error: () => {
        this.artifactJson.set('');
        this.latestArtifact.set(null);
        this.recoveryServerLoadState.set('missing');
        if (announce) {
          this.toast.info('No backup on server yet; create while vault is unlocked.');
        }
      },
    });
  }

  public async unlockFromRecovery(): Promise<void> {
    if (this.form.invalid) {
      this.toast.info('Provide recovery secret first');
      return;
    }
    if (this.recoveryServerLoadState() !== 'loaded') {
      this.toast.info('Load artifact first, then unlock vault.');
      return;
    }
    const artifact = this.latestArtifact();
    if (artifact === null) {
      this.toast.info('Load artifact first.');
      return;
    }

    const raw = this.form.getRawValue();
    try {
      await this.crypto.unlockFromRecoveryArtifact(raw.recovery_secret ?? '', artifact);
      this.toast.success('Vault unlocked from backup.');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Recovery unlock failed');
    }
  }

  public downloadEmergencyKit(): void {
    const artifact = this.artifactJson();
    if (!artifact) {
      this.toast.info('Load or create an artifact first');
      return;
    }
    const blob = new Blob(
      [
        'ARGONED EMERGENCY KIT\n',
        '--------------------------------\n',
        'Keep this file offline and secure.\n',
        'Without recovery material, vault data may be unrecoverable.\n\n',
        artifact,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'argoned-emergency-kit.txt';
    link.click();
    URL.revokeObjectURL(url);
    this.toast.success('Emergency kit downloaded');
  }

  private queueRecoveryBackupEmail(): void {
    this.auth.sendRecoveryBackupEmail().subscribe({
      next: () => {
        this.toast.info('Backup email sent (encrypted attachment only).');
      },
      error: () => {
        // Non-blocking: recovery already saved; email is supplementary.
      },
    });
  }
}
