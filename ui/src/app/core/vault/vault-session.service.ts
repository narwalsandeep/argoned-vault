import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { WebCryptoService } from './web-crypto.service';

/**
 * Single place for “is the vault unlocked in this browser tab?” and explicit lock.
 * Crypto primitives stay on {@link WebCryptoService}; this is session/orchestration only.
 */
@Injectable({ providedIn: 'root' })
export class VaultSessionService {
  private readonly vaultKeyCleared = new Subject<void>();

  /**
   * Fires when the in-memory vault key is cleared ({@link lockInMemory}, logout, etc.).
   * UI that shows decrypted material should subscribe and wipe local views.
   */
  public readonly vaultKeyCleared$ = this.vaultKeyCleared.asObservable();

  public constructor(private readonly crypto: WebCryptoService) {}

  public isUnlocked(): boolean {
    return this.crypto.isVaultUnlocked();
  }

  /**
   * Clears the vault master key from memory (same as **Lock vault** on the Vault page).
   * Does not change server-side profile.
   */
  public lockInMemory(): void {
    this.crypto.clearVaultKey();
    this.vaultKeyCleared.next();
  }
}
