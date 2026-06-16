import { Injectable } from '@angular/core';
import { argon2id } from 'hash-wasm';

import type { VaultProfilePayload } from './vault.service';
import type { RecoveryArtifactPayload } from './vault.service';
import type { VaultItemPayload } from './vault.service';
import type { VaultFilePayload } from './vault.service';
import { VAULT_ARGON2_DEFAULTS, assertValidVaultArgon2BootstrapOptions } from './vault-argon2-options';
import {
  VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES,
  VAULT_UNLOCK_SECRET_MIN_LENGTH,
  isVaultSessionAutoLockIdleMinuteValue,
} from './vault-unlock-policy';

@Injectable({ providedIn: 'root' })
export class WebCryptoService {
  private static readonly DEFAULT_AUTO_LOCK_TIMEOUT_MS = VAULT_SESSION_AUTO_LOCK_IDLE_DEFAULT_MINUTES * 60 * 1000;

  private vaultKey: CryptoKey | null = null;
  private autoLockTimeoutMs = WebCryptoService.DEFAULT_AUTO_LOCK_TIMEOUT_MS;
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null;
  /** Wall-clock time when idle auto-lock fires; `null` when vault is locked or no timer. */
  private autoLockDeadlineEpochMs: number | null = null;

  public isVaultUnlocked(): boolean {
    return this.vaultKey !== null;
  }

  public clearVaultKey(): void {
    this.vaultKey = null;
    this.autoLockDeadlineEpochMs = null;
    this.clearAutoLockTimer();
  }

  /**
   * Sets how long this tab may stay idle (no activity) before the in-memory vault key is cleared.
   * When the vault is already unlocked, any change clears the previous timer and starts a full new
   * idle window from this moment.
   */
  public setAutoLockTimeout(timeoutMs: number): void {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error('Auto-lock timeout must be a positive number');
    }
    this.autoLockTimeoutMs = Math.floor(timeoutMs);
    if (this.vaultKey !== null) {
      this.scheduleAutoLock();
    }
  }

  /** Applies a built-in idle preset (minutes). Same timing rules as setAutoLockTimeout. */
  public applyIdleAutoLockPresetMinutes(minutes: number): void {
    if (!isVaultSessionAutoLockIdleMinuteValue(minutes)) {
      throw new Error('Invalid idle auto-lock preset');
    }
    this.setAutoLockTimeout(minutes * 60 * 1000);
  }

  /** Current idle auto-lock duration in milliseconds (in-memory session). */
  public getAutoLockTimeoutMs(): number {
    return this.autoLockTimeoutMs;
  }

  /**
   * Epoch milliseconds when idle auto-lock will clear the vault key, or `null` if the vault is locked
   * or no idle timer is active.
   */
  public getAutoLockDeadlineEpochMs(): number | null {
    return this.autoLockDeadlineEpochMs;
  }

  /**
   * Pushes the idle auto-lock deadline to `now + idle timeout` while the vault key is in memory.
   * The app shell throttles discrete vs pointer-move events so idle does not reset on every mousemove.
   */
  public noteActivity(): void {
    if (this.vaultKey !== null) {
      this.scheduleAutoLock();
    }
  }

  public async bootstrapVaultProfile(
    unlockSecret: string,
    options?: {
      timeCost?: number;
      memoryKiB?: number;
      parallelism?: number;
    },
  ): Promise<VaultProfilePayload> {
    if (unlockSecret.length < VAULT_UNLOCK_SECRET_MIN_LENGTH) {
      throw new Error(`Unlock secret must be at least ${VAULT_UNLOCK_SECRET_MIN_LENGTH} characters`);
    }
    const timeCost = Math.floor(options?.timeCost ?? VAULT_ARGON2_DEFAULTS.timeCost);
    const memoryKiB = Math.floor(options?.memoryKiB ?? VAULT_ARGON2_DEFAULTS.memoryKiB);
    const parallelism = Math.floor(options?.parallelism ?? VAULT_ARGON2_DEFAULTS.parallelism);
    assertValidVaultArgon2BootstrapOptions({ timeCost, memoryKiB, parallelism });

    const kdfSalt = crypto.getRandomValues(new Uint8Array(16));
    const unlockKey = await this.deriveUnlockKey(unlockSecret, kdfSalt, {
      kdfAlgo: 'argon2id',
      timeCost,
      memoryKiB,
      parallelism,
    });

    const generatedVaultKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const vaultKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', generatedVaultKey));
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedVaultKeyCombined = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(wrapIv) },
        unlockKey,
        this.asArrayBuffer(vaultKeyRaw),
      ),
    );
    const { ciphertext: wrappedVaultKey, tag: wrappedVaultKeyTag } = this.splitCipherAndTag(wrappedVaultKeyCombined);

    this.vaultKey = generatedVaultKey;
    this.scheduleAutoLock();

    return {
      kdf_algo: 'argon2id',
      kdf_params_json: {
        time_cost: timeCost,
        memory_kib: memoryKiB,
        parallelism,
        hash_len: 32,
      },
      kdf_salt: this.toBase64(kdfSalt),
      wrapped_vault_key: this.toBase64(wrappedVaultKey),
      wrapped_vault_key_nonce: this.toBase64(wrapIv),
      wrapped_vault_key_tag: this.toBase64(wrappedVaultKeyTag),
      crypto_version: 1,
    };
  }

  public async unlockVaultFromProfile(unlockSecret: string, profile: VaultProfilePayload): Promise<void> {
    if (unlockSecret.length < VAULT_UNLOCK_SECRET_MIN_LENGTH) {
      throw new Error(`Unlock secret must be at least ${VAULT_UNLOCK_SECRET_MIN_LENGTH} characters`);
    }

    const salt = this.fromBase64(profile.kdf_salt);
    const unlockKey = await this.deriveUnlockKey(unlockSecret, salt, this.resolveKdfOptions(profile));

    const wrappedVaultKey = this.fromBase64(profile.wrapped_vault_key);
    const wrappedVaultKeyTag = this.fromBase64(profile.wrapped_vault_key_tag);
    const wrapIv = this.fromBase64(profile.wrapped_vault_key_nonce);
    const wrappedCombined = this.combineCipherAndTag(wrappedVaultKey, wrappedVaultKeyTag);
    let vaultKeyRaw: Uint8Array;
    try {
      vaultKeyRaw = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(wrapIv) },
          unlockKey,
          this.asArrayBuffer(wrappedCombined),
        ),
      );
    } catch {
      // Browsers often throw DOMException with an empty `message` for AES-GCM auth/decrypt failures.
      throw new Error('Could not unlock the vault with that secret. Check your unlock secret and try again.');
    }

    // extractable: true so recovery artifacts can wrap the raw vault key (exportKey); same in-memory risk as typical web vaults.
    this.vaultKey = await crypto.subtle.importKey('raw', this.asArrayBuffer(vaultKeyRaw), 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ]);
    this.scheduleAutoLock();
  }

  /**
   * Encrypt a vault item with an explicit `item_type` (e.g. `id`, `key`, `credential:website`).
   */
  public async encryptVaultItem(raw: Record<string, unknown>, itemType: string): Promise<VaultItemPayload> {
    if (this.vaultKey === null) {
      throw new Error('Vault is locked. Unlock vault before saving items.');
    }

    const trimmedType = String(itemType).trim();
    if (trimmedType === '') {
      throw new Error('item_type is required');
    }

    const rawForEncrypt = { ...raw } as Record<string, unknown>;
    delete rawForEncrypt['searchable_words'];

    const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const dataKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dataKey));

    const wrappedDekIv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedDekCombined = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(wrappedDekIv) },
        this.vaultKey,
        this.asArrayBuffer(dataKeyRaw),
      ),
    );
    const { ciphertext: wrappedDekCiphertext, tag: wrappedDekTag } = this.splitCipherAndTag(wrappedDekCombined);

    const payloadIv = crypto.getRandomValues(new Uint8Array(12));
    const payloadPlainBuffer = this.asArrayBuffer(this.encodeUtf8(JSON.stringify(rawForEncrypt)));
    const payloadEncrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: this.asArrayBuffer(payloadIv) }, dataKey, payloadPlainBuffer),
    );
    const { ciphertext: payloadCiphertext, tag: payloadTag } = this.splitCipherAndTag(payloadEncrypted);

    return {
      item_type: trimmedType,
      label_ciphertext: null,
      wrapped_dek: this.toBase64(wrappedDekCiphertext),
      wrapped_dek_nonce: this.toBase64(wrappedDekIv),
      wrapped_dek_tag: this.toBase64(wrappedDekTag),
      payload_ciphertext: this.toBase64(payloadCiphertext),
      payload_nonce: this.toBase64(payloadIv),
      payload_tag: this.toBase64(payloadTag),
      crypto_version: 1,
    };
  }

  /**
   * @param credentialSubtype When set (e.g. `website`), `item_type` is stored as `credential:website` for list UI icons.
   */
  public async encryptCredentialItem(
    raw: Record<string, unknown>,
    credentialSubtype?: string | null,
  ): Promise<VaultItemPayload> {
    const itemType =
      credentialSubtype != null && String(credentialSubtype).trim() !== ''
        ? `credential:${String(credentialSubtype).trim()}`
        : 'credential';
    return this.encryptVaultItem(raw, itemType);
  }

  public async decryptItemPayload(item: VaultItemPayload): Promise<Record<string, unknown>> {
    if (this.vaultKey === null) {
      throw new Error('Vault is locked. Unlock vault before decrypting items.');
    }

    this.assertEncryptedItemPayload(item);

    const wrappedDek = this.decodeBase64Field(item.wrapped_dek, 'wrapped_dek');
    const wrappedDekTag = this.decodeBase64Field(item.wrapped_dek_tag, 'wrapped_dek_tag');
    const wrappedDekIv = this.decodeBase64Field(item.wrapped_dek_nonce, 'wrapped_dek_nonce');
    const wrappedDekCombined = this.combineCipherAndTag(wrappedDek, wrappedDekTag);

    let dataKeyRaw: Uint8Array;
    try {
      dataKeyRaw = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(wrappedDekIv) },
          this.vaultKey,
          this.asArrayBuffer(wrappedDekCombined),
        ),
      );
    } catch (error: unknown) {
      this.rethrowDecryptError('unwrapping the item key (DEK)', error);
    }

    const dataKey = await crypto.subtle.importKey('raw', this.asArrayBuffer(dataKeyRaw), 'AES-GCM', false, [
      'decrypt',
    ]);

    const payloadCiphertext = this.decodeBase64Field(item.payload_ciphertext, 'payload_ciphertext');
    const payloadTag = this.decodeBase64Field(item.payload_tag, 'payload_tag');
    const payloadIv = this.decodeBase64Field(item.payload_nonce, 'payload_nonce');
    const payloadCombined = this.combineCipherAndTag(payloadCiphertext, payloadTag);

    let plaintextBytes: Uint8Array;
    try {
      plaintextBytes = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(payloadIv) },
          dataKey,
          this.asArrayBuffer(payloadCombined),
        ),
      );
    } catch (error: unknown) {
      this.rethrowDecryptError('decrypting the item payload', error);
    }

    const plaintext = new TextDecoder().decode(plaintextBytes);
    try {
      return JSON.parse(plaintext) as Record<string, unknown>;
    } catch {
      throw new Error('Decrypted content is not valid JSON.');
    }
  }

  public async encryptVaultFile(
    rawBytes: Uint8Array,
    meta: { originalFilename: string; mimeType: string; vaultItemId: string },
  ): Promise<VaultFilePayload> {
    if (this.vaultKey === null) {
      throw new Error('Vault is locked. Unlock vault before saving files.');
    }
    const vaultItemId = meta.vaultItemId.trim();
    if (vaultItemId === '') {
      throw new Error('file vault item id is required');
    }
    const filename = meta.originalFilename.trim();
    const mimeType = meta.mimeType.trim().toLowerCase();
    if (filename === '') {
      throw new Error('Filename is required.');
    }
    if (mimeType === '') {
      throw new Error('MIME type is required.');
    }
    if (rawBytes.byteLength <= 0) {
      throw new Error('File is empty.');
    }

    const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const dataKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dataKey));

    const wrappedDekIv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedDekCombined = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(wrappedDekIv) },
        this.vaultKey,
        this.asArrayBuffer(dataKeyRaw),
      ),
    );
    const { ciphertext: wrappedDekCiphertext, tag: wrappedDekTag } = this.splitCipherAndTag(wrappedDekCombined);

    const payloadIv = crypto.getRandomValues(new Uint8Array(12));
    const payloadEncrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: this.asArrayBuffer(payloadIv) }, dataKey, this.asArrayBuffer(rawBytes)),
    );
    const { ciphertext: payloadCiphertext, tag: payloadTag } = this.splitCipherAndTag(payloadEncrypted);

    return {
      vault_item_id: vaultItemId,
      original_filename: filename,
      mime_type: mimeType,
      plaintext_size_bytes: rawBytes.byteLength,
      wrapped_dek: this.toBase64(wrappedDekCiphertext),
      wrapped_dek_nonce: this.toBase64(wrappedDekIv),
      wrapped_dek_tag: this.toBase64(wrappedDekTag),
      payload_ciphertext: this.toBase64(payloadCiphertext),
      payload_nonce: this.toBase64(payloadIv),
      payload_tag: this.toBase64(payloadTag),
      crypto_version: 1,
    };
  }

  public async decryptVaultFilePayload(file: VaultFilePayload): Promise<Uint8Array> {
    if (this.vaultKey === null) {
      throw new Error('Vault is locked. Unlock vault before decrypting files.');
    }
    const wrappedDek = this.decodeBase64Field(file.wrapped_dek, 'wrapped_dek');
    const wrappedDekTag = this.decodeBase64Field(file.wrapped_dek_tag, 'wrapped_dek_tag');
    const wrappedDekIv = this.decodeBase64Field(file.wrapped_dek_nonce, 'wrapped_dek_nonce');
    const wrappedDekCombined = this.combineCipherAndTag(wrappedDek, wrappedDekTag);

    let dataKeyRaw: Uint8Array;
    try {
      dataKeyRaw = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(wrappedDekIv) },
          this.vaultKey,
          this.asArrayBuffer(wrappedDekCombined),
        ),
      );
    } catch (error: unknown) {
      this.rethrowDecryptError('unwrapping the file key (DEK)', error);
    }

    const dataKey = await crypto.subtle.importKey('raw', this.asArrayBuffer(dataKeyRaw), 'AES-GCM', false, ['decrypt']);
    const payloadCiphertext = this.decodeBase64Field(file.payload_ciphertext, 'payload_ciphertext');
    const payloadTag = this.decodeBase64Field(file.payload_tag, 'payload_tag');
    const payloadIv = this.decodeBase64Field(file.payload_nonce, 'payload_nonce');
    const payloadCombined = this.combineCipherAndTag(payloadCiphertext, payloadTag);

    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(payloadIv) },
          dataKey,
          this.asArrayBuffer(payloadCombined),
        ),
      );
    } catch (error: unknown) {
      this.rethrowDecryptError('decrypting the file payload', error);
    }
  }

  public async buildRecoveryArtifact(recoverySecret: string, artifactType = 'recovery_key_wrap'): Promise<RecoveryArtifactPayload> {
    if (this.vaultKey === null) {
      throw new Error('Vault is locked. Unlock vault before creating recovery artifact.');
    }
    if (recoverySecret.trim().length < 12) {
      throw new Error('Recovery secret must be at least 12 characters');
    }

    const recoveryKey = await this.deriveRecoveryKey(recoverySecret);
    const vaultKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', this.vaultKey));
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const combined = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(nonce) },
        recoveryKey,
        this.asArrayBuffer(vaultKeyRaw),
      ),
    );
    const { ciphertext, tag } = this.splitCipherAndTag(combined);

    return {
      artifact_type: artifactType,
      wrapped_vault_key_recovery: this.toBase64(ciphertext),
      nonce: this.toBase64(nonce),
      tag: this.toBase64(tag),
    };
  }

  public async unlockFromRecoveryArtifact(recoverySecret: string, artifact: RecoveryArtifactPayload): Promise<void> {
    if (recoverySecret.trim().length < 12) {
      throw new Error('Recovery secret must be at least 12 characters');
    }

    const recoveryKey = await this.deriveRecoveryKey(recoverySecret);
    const nonce = this.fromBase64(artifact.nonce);
    const ciphertext = this.fromBase64(artifact.wrapped_vault_key_recovery);
    const tag = this.fromBase64(artifact.tag);
    const combined = this.combineCipherAndTag(ciphertext, tag);
    let vaultKeyRaw: Uint8Array;
    try {
      vaultKeyRaw = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: this.asArrayBuffer(nonce) },
          recoveryKey,
          this.asArrayBuffer(combined),
        ),
      );
    } catch {
      throw new Error('Could not unlock from this recovery material. Check the recovery secret and try again.');
    }

    this.vaultKey = await crypto.subtle.importKey('raw', this.asArrayBuffer(vaultKeyRaw), 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ]);
    this.scheduleAutoLock();
  }

  private async deriveUnlockKey(
    unlockSecret: string,
    salt: Uint8Array,
    options:
      | { kdfAlgo: 'pbkdf2-sha256'; iterations: number }
      | {
          kdfAlgo: 'argon2id';
          timeCost: number;
          memoryKiB: number;
          parallelism: number;
        },
  ): Promise<CryptoKey> {
    if (options.kdfAlgo === 'argon2id') {
      try {
        const result = await argon2id({
          password: unlockSecret,
          salt,
          iterations: options.timeCost,
          memorySize: options.memoryKiB,
          parallelism: options.parallelism,
          hashLength: 32,
          outputType: 'binary',
        });
        const bytesRaw = result instanceof Uint8Array ? result : this.hexToBytes(result);
        return crypto.subtle.importKey('raw', this.asArrayBuffer(bytesRaw), 'AES-GCM', false, ['encrypt', 'decrypt']);
      } catch {
        throw new Error('Argon2id key derivation failed in this browser runtime');
      }
    }

    const secretMaterial = await crypto.subtle.importKey(
      'raw',
      this.asArrayBuffer(this.encodeUtf8(unlockSecret)),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: this.asArrayBuffer(salt),
        iterations: options.iterations,
      },
      secretMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async deriveRecoveryKey(recoverySecret: string): Promise<CryptoKey> {
    const digest = await crypto.subtle.digest('SHA-256', this.asArrayBuffer(this.encodeUtf8(recoverySecret)));
    return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private assertEncryptedItemPayload(item: VaultItemPayload): void {
    const requiredKeys: (keyof VaultItemPayload)[] = [
      'wrapped_dek',
      'wrapped_dek_nonce',
      'wrapped_dek_tag',
      'payload_ciphertext',
      'payload_nonce',
      'payload_tag',
    ];
    for (const key of requiredKeys) {
      const value = item[key];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Missing or invalid encrypted field from server: ${String(key)}`);
      }
    }
  }

  private decodeBase64Field(value: string, fieldName: string): Uint8Array {
    try {
      return this.fromBase64(value);
    } catch {
      throw new Error(`Invalid base64 for ${fieldName}`);
    }
  }

  private rethrowDecryptError(stage: string, error: unknown): never {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new Error(
        `Decryption failed while ${stage}: wrong vault key or corrupted ciphertext. If you saved a new vault profile, items encrypted with the previous key cannot be opened.`,
      );
    }
    if (error instanceof Error) {
      throw new Error(`Decryption failed while ${stage}: ${error.message}`);
    }
    throw new Error(`Decryption failed while ${stage}.`);
  }

  private combineCipherAndTag(ciphertext: Uint8Array, tag: Uint8Array): Uint8Array {
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext, 0);
    combined.set(tag, ciphertext.length);
    return combined;
  }

  private splitCipherAndTag(encrypted: Uint8Array): { ciphertext: Uint8Array; tag: Uint8Array } {
    const tagLength = 16;
    const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
    const tag = encrypted.slice(encrypted.length - tagLength);
    return { ciphertext, tag };
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const output = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      output[index] = binary.charCodeAt(index);
    }
    return output;
  }

  private toBase64(input: Uint8Array): string {
    let binary = '';
    for (const byte of input) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  private encodeUtf8(value: string): Uint8Array {
    return new TextEncoder().encode(value);
  }

  /** Copy bytes for Web Crypto; Vitest’s subtle rejects some ArrayBuffer copies from getRandomValues/exportKey. */
  private asArrayBuffer(input: Uint8Array): BufferSource {
    return new Uint8Array(input) as BufferSource;
  }

  private hexToBytes(value: string): Uint8Array {
    const output = new Uint8Array(value.length / 2);
    for (let index = 0; index < output.length; index += 1) {
      output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return output;
  }

  private resolveKdfOptions(profile: VaultProfilePayload):
    | { kdfAlgo: 'pbkdf2-sha256'; iterations: number }
    | { kdfAlgo: 'argon2id'; timeCost: number; memoryKiB: number; parallelism: number } {
    if (profile.kdf_algo === 'pbkdf2-sha256') {
      const iterationsRaw = profile.kdf_params_json?.['iterations'];
      const iterations = typeof iterationsRaw === 'number' ? iterationsRaw : Number(iterationsRaw);
      if (!Number.isFinite(iterations) || iterations < 100000) {
        throw new Error('Invalid profile PBKDF2 iterations');
      }
      return { kdfAlgo: 'pbkdf2-sha256', iterations: Math.floor(iterations) };
    }

    if (profile.kdf_algo !== 'argon2id') {
      throw new Error(`Unsupported profile KDF algorithm: ${profile.kdf_algo}`);
    }

    const timeCostRaw = profile.kdf_params_json?.['time_cost'];
    const memoryRaw = profile.kdf_params_json?.['memory_kib'];
    const parallelismRaw = profile.kdf_params_json?.['parallelism'];
    const timeCost = typeof timeCostRaw === 'number' ? timeCostRaw : Number(timeCostRaw);
    const memoryKiB = typeof memoryRaw === 'number' ? memoryRaw : Number(memoryRaw);
    const parallelism = typeof parallelismRaw === 'number' ? parallelismRaw : Number(parallelismRaw);
    if (!Number.isFinite(timeCost) || !Number.isFinite(memoryKiB) || !Number.isFinite(parallelism)) {
      throw new Error('Invalid profile Argon2id parameters');
    }

    return {
      kdfAlgo: 'argon2id',
      timeCost: Math.floor(timeCost),
      memoryKiB: Math.floor(memoryKiB),
      parallelism: Math.floor(parallelism),
    };
  }

  private scheduleAutoLock(): void {
    this.clearAutoLockTimer();
    if (this.vaultKey === null) {
      this.autoLockDeadlineEpochMs = null;
      return;
    }
    const ms = this.autoLockTimeoutMs;
    this.autoLockDeadlineEpochMs = Date.now() + ms;
    this.autoLockTimer = setTimeout(() => {
      this.vaultKey = null;
      this.autoLockTimer = null;
      this.autoLockDeadlineEpochMs = null;
    }, ms);
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer !== null) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }
}

