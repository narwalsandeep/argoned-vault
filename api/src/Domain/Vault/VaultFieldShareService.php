<?php

declare(strict_types=1);

namespace Blackbox\Domain\Vault;

use Blackbox\Infrastructure\Security\ShareRateLimiter;
use Blackbox\Infrastructure\Vault\VaultFieldShareRepository;
use InvalidArgumentException;

final class VaultFieldShareService
{
    private const SHARE_ID_BYTES = 16;

    /**
     * @param array{max_active_per_user:int} $shareConfig
     */
    public function __construct(
        private readonly VaultFieldShareRepository $shares,
        private readonly ShareRateLimiter $rateLimiter,
        private readonly array $shareConfig,
        private readonly string $uiAppBaseUrl,
    ) {
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function prepare(string $userId, array $payload): array
    {
        $createLimit = $this->rateLimiter->consumeCreate($userId);
        if (!$createLimit['allowed']) {
            throw new ShareRateLimitException('share_create_rate_limited', $createLimit['retry_after']);
        }

        $vaultItemId = trim((string) ($payload['vault_item_id'] ?? ''));
        if ($vaultItemId === '') {
            throw new InvalidArgumentException('vault_item_id_required');
        }
        if (!$this->shares->itemOwnedByUser($userId, $vaultItemId)) {
            throw new InvalidArgumentException('vault_item_not_found');
        }

        $activeCount = $this->shares->countActiveForOwner($userId);
        $maxActive = (int) ($this->shareConfig['max_active_per_user'] ?? 20);
        if ($activeCount >= $maxActive) {
            throw new InvalidArgumentException('share_quota_exceeded');
        }

        $fieldKey = $this->optionalTrimmedString($payload['field_key'] ?? null, ShareKdfConfig::MAX_FIELD_KEY_LENGTH);
        $label = $this->optionalTrimmedString($payload['label'] ?? null, ShareKdfConfig::MAX_LABEL_LENGTH);
        $maxViews = $this->parseMaxViews($payload['max_views'] ?? 1);
        $expiresAt = $this->parseExpiresAt($payload['expires_at'] ?? null);

        $shareId = $this->generateShareId();
        $pendingExpires = (new \DateTimeImmutable('now'))
            ->modify('+' . ShareKdfConfig::PENDING_TTL_SECONDS . ' seconds')
            ->format(\DateTimeInterface::ATOM);
        $placeholderSalt = base64_encode(str_repeat("\0", 16));

        $row = $this->shares->insertPending([
            'share_id' => $shareId,
            'owner_user_id' => $userId,
            'vault_item_id' => $vaultItemId,
            'field_key' => $fieldKey,
            'label' => $label,
            'expires_at' => $expiresAt->format(\DateTimeInterface::ATOM),
            'max_views' => $maxViews,
            'pending_expires_at' => $pendingExpires,
            'kdf_algo' => ShareKdfConfig::ALGO,
            'kdf_params_json' => json_encode(ShareKdfConfig::kdfParamsJsonForStorage(), JSON_THROW_ON_ERROR),
            'kdf_salt' => $placeholderSalt,
        ]);

        return [
            'share_id' => (string) $row['share_id'],
            'expires_at' => (string) $row['expires_at'],
            'max_views' => (int) $row['max_views'],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function finalize(string $userId, string $shareId, array $payload): array
    {
        $cryptoVersion = (int) ($payload['crypto_version'] ?? 0);
        if ($cryptoVersion !== ShareKdfConfig::CRYPTO_VERSION) {
            throw new InvalidArgumentException('invalid_crypto_version');
        }

        $kdfSalt = $this->requiredBase64($payload['kdf_salt'] ?? null, 'kdf_salt', 16);
        $ciphertext = $this->requiredBase64($payload['ciphertext'] ?? null, 'ciphertext', 1);
        $payloadNonce = $this->requiredBase64($payload['payload_nonce'] ?? null, 'payload_nonce', 12);
        $payloadTag = $this->requiredBase64($payload['payload_tag'] ?? null, 'payload_tag', 16);

        $cipherLen = strlen(base64_decode($ciphertext, true) ?: '');
        if ($cipherLen > ShareKdfConfig::MAX_CIPHERTEXT_BYTES) {
            throw new InvalidArgumentException('payload_too_large');
        }

        $row = $this->shares->finalizePending($shareId, $userId, [
            'kdf_salt' => $kdfSalt,
            'ciphertext' => $ciphertext,
            'payload_nonce' => $payloadNonce,
            'payload_tag' => $payloadTag,
        ]);
        if ($row === null) {
            throw new InvalidArgumentException('share_not_pending');
        }

        return [
            'id' => (string) $row['id'],
            'share_id' => (string) $row['share_id'],
            'expires_at' => (string) $row['expires_at'],
            'max_views' => (int) $row['max_views'],
            'redeem_url' => $this->buildRedeemUrl((string) $row['share_id']),
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listForOwner(string $userId): array
    {
        return $this->shares->listForOwner($userId);
    }

    public function revoke(string $userId, string $id): bool
    {
        return $this->shares->revokeById($userId, $id);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function fetchPublic(string $shareId, string $clientIp): ?array
    {
        $limit = $this->rateLimiter->consumeFetch($clientIp, $shareId);
        if (!$limit['allowed']) {
            throw new ShareRateLimitException('share_fetch_rate_limited', $limit['retry_after'], $limit['storage_failed']);
        }

        $ipHash = hash('sha256', $clientIp);
        $row = $this->shares->fetchAndConsume($shareId, $ipHash);
        if ($row === null) {
            return null;
        }

        /** @var array<string,mixed> $kdfParams */
        $kdfParams = is_array($row['kdf_params_json']) ? $row['kdf_params_json'] : ShareKdfConfig::kdfParams();

        return [
            'crypto_version' => (int) $row['crypto_version'],
            'kdf_algo' => (string) $row['kdf_algo'],
            'kdf_params' => $kdfParams,
            'kdf_salt' => (string) $row['kdf_salt'],
            'ciphertext' => (string) $row['ciphertext'],
            'payload_nonce' => (string) $row['payload_nonce'],
            'payload_tag' => (string) $row['payload_tag'],
            'expires_at' => (string) $row['expires_at'],
        ];
    }

    public function revokeByVaultItemId(string $userId, string $vaultItemId): int
    {
        return $this->shares->deleteByVaultItemId($userId, $vaultItemId);
    }

    public function purgeExpired(): int
    {
        return $this->shares->purgeExpiredAndStalePending();
    }

    private function generateShareId(): string
    {
        return bin2hex(random_bytes(self::SHARE_ID_BYTES));
    }

    private function buildRedeemUrl(string $shareId): string
    {
        $base = rtrim($this->uiAppBaseUrl, '/');

        return $base . '/share/' . rawurlencode($shareId);
    }

    private function parseMaxViews(mixed $raw): int
    {
        $views = (int) $raw;
        if ($views < 1 || $views > ShareKdfConfig::MAX_VIEWS) {
            throw new InvalidArgumentException('invalid_max_views');
        }

        return $views;
    }

    private function parseExpiresAt(mixed $raw): \DateTimeImmutable
    {
        if (!is_string($raw) || trim($raw) === '') {
            throw new InvalidArgumentException('expires_at_required');
        }
        try {
            $expires = new \DateTimeImmutable($raw);
        } catch (\Exception) {
            throw new InvalidArgumentException('invalid_expires_at');
        }
        $now = new \DateTimeImmutable('now');
        if ($expires <= $now) {
            throw new InvalidArgumentException('expires_at_must_be_future');
        }
        $maxExpiry = $now->modify('+' . ShareKdfConfig::MAX_EXPIRY_DAYS . ' days');
        if ($expires > $maxExpiry) {
            throw new InvalidArgumentException('expires_at_exceeds_max');
        }

        return $expires;
    }

    private function optionalTrimmedString(mixed $raw, int $maxLen): ?string
    {
        if ($raw === null) {
            return null;
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return null;
        }
        if (strlen($s) > $maxLen) {
            throw new InvalidArgumentException('string_too_long');
        }

        return $s;
    }

    private function requiredBase64(mixed $raw, string $field, int $minDecodedBytes): string
    {
        if (!is_string($raw) || trim($raw) === '') {
            throw new InvalidArgumentException($field . '_required');
        }
        $decoded = base64_decode($raw, true);
        if ($decoded === false || strlen($decoded) < $minDecodedBytes) {
            throw new InvalidArgumentException('invalid_' . $field);
        }

        return $raw;
    }
}
