import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BlockingOverlayComponent } from '../../core/ui/blocking-overlay.component';
import { VaultFieldShareApiService } from '../../core/vault/vault-field-share-api.service';
import { VaultFieldShareCryptoService } from '../../core/vault/vault-field-share-crypto.service';
import { SHARE_REDEEM_IDLE_CLEAR_MS } from '../../core/vault/vault-field-share.constants';
import { LEGAL_CONTACT } from '../legal/legal.constants';

type RedeemPhase = 'input' | 'revealed' | 'unavailable';

@Component({
  selector: 'app-share-redeem',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BlockingOverlayComponent],
  template: `
    <app-blocking-overlay [active]="busy()" label="Decrypting" message="Please wait." />

    <div class="auth-shell auth-shell--legal share-redeem-page">
      <div class="auth-legal-wrap share-redeem-wrap">
        <header class="share-redeem-brand">
          <a
            class="auth-brand share-redeem-home"
            [href]="marketingSiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Argoned (opens argoned.com)"
          >
            <span class="auth-brand-b">a</span><span class="auth-brand-rest">rgoned</span><span class="auth-brand-dot">.</span>
          </a>
          <h1 class="settings-page-heading justify-center">
            <span class="settings-page-title">Shared secret</span>
          </h1>
          @if (phase() !== 'revealed') {
            <p class="share-redeem-lead">Enter the access code from the sender.</p>
          }
        </header>

        <div class="share-redeem-body">
          @if (phase() === 'unavailable') {
            <p class="share-redeem-message">This link is invalid, expired, or already used.</p>
          } @else if (phase() === 'revealed' && revealedValue() !== null) {
            <div class="share-redeem-revealed">
              @if (revealedLabel()) {
                <p class="share-redeem-field-label">{{ revealedLabel() }}</p>
              }
              <p class="share-redeem-value" role="status">{{ revealedValue() }}</p>
              <button type="button" class="control-btn-secondary w-max" (click)="copyRevealed()">
                {{ copied() ? 'Copied' : 'Copy' }}
              </button>
            </div>
          } @else {
            <form class="control-form-grid" novalidate (submit)="onRevealSubmit($event)">
              <div class="share-create-result-field">
                <label class="share-create-result-label" for="share-access-code">Access code</label>
                <input
                  id="share-access-code"
                  class="control-field share-redeem-code-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  [formControl]="accessCodeControl"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>
              @if (errorMessage()) {
                <p class="text-sm text-app-main-accent" role="alert">{{ errorMessage() }}</p>
              }
              <div class="control-actions-row">
                <button
                  type="submit"
                  class="control-btn-primary w-max"
                  [disabled]="busy() || accessCodeControl.invalid"
                >
                  {{ busy() ? 'Decrypting…' : 'Reveal' }}
                </button>
              </div>
            </form>
          }
        </div>

        <footer class="auth-legal-foot share-redeem-foot">
          <a routerLink="/login">Vault login</a>
          <a routerLink="/signup">Sign up</a>
          <a [href]="marketingSiteUrl" target="_blank" rel="noopener noreferrer">argoned.com</a>
        </footer>
      </div>
    </div>
  `,
})
export class ShareRedeemComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly shareApi = inject(VaultFieldShareApiService);
  private readonly shareCrypto = inject(VaultFieldShareCryptoService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly marketingSiteUrl = LEGAL_CONTACT.marketingSiteUrl;

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

  public onRevealSubmit(event: Event): void {
    event.preventDefault();
    void this.onReveal();
  }

  public async onReveal(): Promise<void> {
    if (this.shareId === '' || this.busy()) {
      return;
    }
    const code = this.shareCrypto.normalizeAccessCodeInput(this.accessCodeControl.value);
    if (!this.shareCrypto.isValidAccessCodeFormat(code)) {
      this.errorMessage.set('Enter the full access code.');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set(null);

    try {
      const blob = await firstValueFrom(this.shareApi.fetchPublic(this.shareId));
      const payload = await this.shareCrypto.decryptFieldShare(code, this.shareId, blob);

      try {
        await firstValueFrom(this.shareApi.consumePublic(this.shareId));
      } catch {
        this.errorMessage.set('Revealed, but the link could not be closed. Do not share this URL again.');
      }

      this.revealedLabel.set(payload.field_label || payload.field_key);
      this.revealedValue.set(payload.value);
      this.phase.set('revealed');
      this.scheduleIdleClear();
    } catch (err: unknown) {
      if (this.isShareUnavailableError(err)) {
        this.phase.set('unavailable');
        this.errorMessage.set(null);
      } else {
        this.errorMessage.set('Incorrect access code.');
      }
    } finally {
      this.busy.set(false);
    }
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
      this.errorMessage.set('Unable to copy.');
    }
  }

  private isShareUnavailableError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null || !('status' in err)) {
      return false;
    }
    return (err as { status?: number }).status === 404;
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
    this.errorMessage.set(null);
    this.accessCodeControl.reset('');
  }
}
