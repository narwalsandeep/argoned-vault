import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { VaultFieldShareCryptoService } from '../../core/vault/vault-field-share-crypto.service';
import { SHARE_REDEEM_IDLE_CLEAR_MS } from '../../core/vault/vault-field-share.constants';

type RedeemPhase = 'input' | 'revealed' | 'error';

@Component({
  selector: 'app-share-redeem',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell auth-shell--legal share-redeem-page">
      <div class="auth-legal-wrap share-redeem-wrap">
        <header class="auth-legal-brand">
          <h1 class="settings-page-heading justify-center">
            <span class="settings-page-title">Secure share</span>
            <span class="settings-page-heading-dot" aria-hidden="true">.</span>
            <span class="settings-page-kicker">One-time field</span>
          </h1>
          <p class="mx-auto max-w-xl text-center text-sm text-app-text-muted">
            Enter the access code from the sender, then click Reveal. The link alone does not fetch the secret.
          </p>
        </header>

        <article class="auth-legal-card share-redeem-card">
          @if (phase() === 'input' || busy()) {
            <form class="control-form-grid" (ngSubmit)="onReveal()">
              <div class="control-field">
                <label for="share-access-code">Access code</label>
                <input
                  id="share-access-code"
                  class="control-field"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  [formControl]="accessCodeControl"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>
              <p class="text-xs leading-relaxed text-app-text-muted">
                Wrong code after Reveal may consume a one-time link. Send the code on a different channel than the link.
              </p>
              @if (errorMessage()) {
                <p class="text-sm text-app-main-accent" role="alert">{{ errorMessage() }}</p>
              }
              <div class="control-actions-row">
                <button
                  type="submit"
                  class="control-btn-primary w-max"
                  [disabled]="busy() || accessCodeControl.invalid"
                >
                  {{ busy() ? 'Fetching…' : 'Reveal' }}
                </button>
              </div>
            </form>
          }

          @if (phase() === 'revealed' && revealedValue() !== null) {
            <div class="share-redeem-result">
              @if (revealedLabel()) {
                <p class="text-sm text-app-text-muted">{{ revealedLabel() }}</p>
              }
              <p class="share-redeem-secret" role="status">{{ revealedValue() }}</p>
              <div class="control-actions-row">
                <button type="button" class="control-btn-secondary w-max" (click)="copyRevealed()">
                  {{ copied() ? 'Copied' : 'Copy value' }}
                </button>
              </div>
              <p class="text-xs text-app-text-muted">This value clears when you leave or after idle timeout.</p>
            </div>
          }

          <p class="mt-6 text-center text-xs text-app-text-muted">
            <a routerLink="/login" class="font-medium text-app-main-accent hover:underline">Argoned vault</a>
          </p>
        </article>
      </div>
    </div>
  `,
})
export class ShareRedeemComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly shareApi = inject(VaultFieldShareApiService);
  private readonly shareCrypto = inject(VaultFieldShareCryptoService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly accessCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(16)],
  });

  public readonly phase = signal<RedeemPhase>('input');
  public readonly busy = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly revealedValue = signal<string | null>(null);
  public readonly revealedLabel = signal<string | null>(null);
  public readonly copied = signal(false);

  private shareId = '';
  private idleClearTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.shareId = params.get('shareId') ?? '';
      this.clearRevealedState();
    });
  }

  public ngOnDestroy(): void {
    this.clearRevealedState();
  }

  public onReveal(): void {
    if (this.shareId === '' || this.busy()) {
      return;
    }
    const code = this.shareCrypto.normalizeAccessCodeInput(this.accessCodeControl.value);
    if (!this.shareCrypto.isValidAccessCodeFormat(code)) {
      this.errorMessage.set('Enter the full access code (four groups of four characters).');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set(null);
    this.shareApi.fetchPublic(this.shareId).subscribe({
      next: async (blob) => {
        try {
          const payload = await this.shareCrypto.decryptFieldShare(code, this.shareId, blob);
          this.revealedLabel.set(payload.field_label || payload.field_key);
          this.revealedValue.set(payload.value);
          this.phase.set('revealed');
          this.scheduleIdleClear();
        } catch {
          this.phase.set('error');
          this.errorMessage.set('Incorrect code or link. This share may already be used.');
        }
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('This link is invalid, expired, or already used.');
      },
    });
  }

  public async copyRevealed(): Promise<void> {
    const value = this.revealedValue();
    if (value === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.errorMessage.set('Unable to copy to clipboard.');
    }
  }

  private scheduleIdleClear(): void {
    if (this.idleClearTimer !== null) {
      clearTimeout(this.idleClearTimer);
    }
    this.idleClearTimer = setTimeout(() => this.clearRevealedState(), SHARE_REDEEM_IDLE_CLEAR_MS);
  }

  private clearRevealedState(): void {
    if (this.idleClearTimer !== null) {
      clearTimeout(this.idleClearTimer);
      this.idleClearTimer = null;
    }
    this.revealedValue.set(null);
    this.revealedLabel.set(null);
    this.phase.set('input');
    this.copied.set(false);
    this.accessCodeControl.reset('');
  }
}
