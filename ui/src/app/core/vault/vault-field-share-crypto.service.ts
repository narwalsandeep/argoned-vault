import { Injectable } from '@angular/core';
import { argon2id } from 'hash-wasm';

import {
  SHARE_ACCESS_CODE_GROUP_LENGTH,
  SHARE_ACCESS_CODE_GROUPS,
  SHARE_ARGON2_PARAMS,
  SHARE_CRYPTO_VERSION,
  SHARE_MAX_PAYLOAD_BYTES,
  type VaultFieldShareEncryptedBlob,
  type VaultFieldShareFetchResponse,
  type VaultFieldSharePayload,
} from './vault-field-share.constants';

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz';

@Injectable({ providedIn: 'root' })
export class VaultFieldShareCryptoService {
  /** Generates a 128-bit access code as four groups of four case-sensitive alphanumeric characters. */
  public generateAccessCode(): string {
    const groups: string[] = [];
    for (let g = 0; g < SHARE_ACCESS_CODE_GROUPS; g += 1) {
      let chunk = '';
      const bytes = crypto.getRandomValues(new Uint8Array(SHARE_ACCESS_CODE_GROUP_LENGTH));
      for (const byte of bytes) {
        chunk += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
      }
      groups.push(chunk);
    }
    return groups.join('-');
  }

  public normalizeAccessCodeInput(raw: string): string {
    return raw.trim().replace(/\s+/g, '');
  }

  public isValidAccessCodeFormat(code: string): boolean {
    const normalized = this.normalizeAccessCodeInput(code);
    const pattern = new RegExp(
      `^[A-Za-z0-9]{${SHARE_ACCESS_CODE_GROUP_LENGTH}}(-[A-Za-z0-9]{${SHARE_ACCESS_CODE_GROUP_LENGTH}}){${SHARE_ACCESS_CODE_GROUPS - 1}}$`,
    );
    return pattern.test(normalized);
  }

  public async encryptFieldShare(
    accessCode: string,
    shareId: string,
    expiresAtIso: string,
    payload: VaultFieldSharePayload,
  ): Promise<VaultFieldShareEncryptedBlob> {
    const json = JSON.stringify(payload);
    const plainBytes = new TextEncoder().encode(json);
    if (plainBytes.length > SHARE_MAX_PAYLOAD_BYTES) {
      throw new Error('Share payload too large');
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const shareKey = await this.deriveShareKey(accessCode, salt);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const aad = this.buildAad(shareId, expiresAtIso);
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(nonce), additionalData: this.asArrayBuffer(aad) },
        shareKey,
        this.asArrayBuffer(plainBytes),
      ),
    );
    const { ciphertext, tag } = this.splitCipherAndTag(encrypted);

    return {
      crypto_version: SHARE_CRYPTO_VERSION,
      kdf_salt: this.toBase64(salt),
      ciphertext: this.toBase64(ciphertext),
      payload_nonce: this.toBase64(nonce),
      payload_tag: this.toBase64(tag),
    };
  }

  public async decryptFieldShare(
    accessCode: string,
    shareId: string,
    blob: VaultFieldShareFetchResponse,
  ): Promise<VaultFieldSharePayload> {
    const salt = this.fromBase64(blob.kdf_salt);
    const shareKey = await this.deriveShareKey(accessCode, salt);
    const nonce = this.fromBase64(blob.payload_nonce);
    const ciphertext = this.fromBase64(blob.ciphertext);
    const tag = this.fromBase64(blob.payload_tag);
    const combined = this.combineCipherAndTag(ciphertext, tag);
    const aad = this.buildAad(shareId, blob.expires_at);

    let plainBuffer: ArrayBuffer;
    try {
      plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.asArrayBuffer(nonce), additionalData: this.asArrayBuffer(aad) },
        shareKey,
        this.asArrayBuffer(combined),
      );
    } catch {
      throw new Error('Incorrect access code or corrupted share');
    }

    const parsed = JSON.parse(new TextDecoder().decode(plainBuffer)) as VaultFieldSharePayload;
    if (typeof parsed.value !== 'string') {
      throw new Error('Invalid share payload');
    }

    return parsed;
  }

  private buildAad(shareId: string, expiresAtIso: string): Uint8Array {
    const material = `${shareId}||${expiresAtIso}||${SHARE_CRYPTO_VERSION}`;
    return new TextEncoder().encode(material);
  }

  private async deriveShareKey(accessCode: string, salt: Uint8Array): Promise<CryptoKey> {
    const normalized = this.normalizeAccessCodeInput(accessCode);
    const result = await argon2id({
      password: normalized,
      salt,
      iterations: SHARE_ARGON2_PARAMS.timeCost,
      memorySize: SHARE_ARGON2_PARAMS.memoryKiB,
      parallelism: SHARE_ARGON2_PARAMS.parallelism,
      hashLength: 32,
      outputType: 'binary',
    });
    const bytesRaw = result instanceof Uint8Array ? result : this.hexToBytes(result);
    return crypto.subtle.importKey('raw', this.asArrayBuffer(bytesRaw), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private combineCipherAndTag(ciphertext: Uint8Array, tag: Uint8Array): Uint8Array {
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext, 0);
    combined.set(tag, ciphertext.length);
    return combined;
  }

  private splitCipherAndTag(encrypted: Uint8Array): { ciphertext: Uint8Array; tag: Uint8Array } {
    const tagLength = 16;
    return {
      ciphertext: encrypted.slice(0, encrypted.length - tagLength),
      tag: encrypted.slice(encrypted.length - tagLength),
    };
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
}
