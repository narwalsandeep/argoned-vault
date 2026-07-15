<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Vault;

use Blackbox\Domain\Vault\ShareRateLimitException;
use Blackbox\Domain\Vault\ShareRateLimiterInterface;
use Blackbox\Domain\Vault\VaultFieldShareRepositoryInterface;
use Blackbox\Domain\Vault\VaultFieldShareService;
use PHPUnit\Framework\TestCase;

final class VaultFieldShareServiceTest extends TestCase
{
    public function testFetchPublicReadsWithoutConsuming(): void
    {
        $repo = new FakeVaultFieldShareRepository(
            activeRow: [
                'crypto_version' => 1,
                'kdf_algo' => 'argon2id',
                'kdf_params_json' => ['timeCost' => 3, 'memoryKiB' => 65536, 'parallelism' => 1],
                'kdf_salt' => 'c2FsdA==',
                'ciphertext' => 'Y2lwaGVy',
                'payload_nonce' => 'bm9uY2U=',
                'payload_tag' => 'dGFn',
                'expires_at' => '2026-06-18T21:35:00+00:00',
            ],
        );
        $limiter = new FakeShareRateLimiter();

        $service = new VaultFieldShareService($repo, $limiter, ['max_active_per_user' => 20], 'https://vault.test');

        $share = $service->fetchPublic('share123', '127.0.0.1');
        $this->assertNotNull($share);
        $this->assertSame('c2FsdA==', $share['kdf_salt']);
        $this->assertSame(1, $repo->fetchActiveCalls);
        $this->assertSame(0, $repo->consumeShareCalls);
    }

    public function testConsumePublicConsumesAfterDecrypt(): void
    {
        $repo = new FakeVaultFieldShareRepository();
        $limiter = new FakeShareRateLimiter();

        $service = new VaultFieldShareService($repo, $limiter, ['max_active_per_user' => 20], 'https://vault.test');

        $this->assertTrue($service->consumePublic('share123', '127.0.0.1'));
        $this->assertSame(1, $repo->consumeShareCalls);
        $this->assertSame(hash('sha256', '127.0.0.1'), $repo->lastConsumeIpHash);
    }

    public function testFetchPublicThrowsWhenRateLimited(): void
    {
        $repo = new FakeVaultFieldShareRepository();
        $limiter = new FakeShareRateLimiter(allowed: false, retryAfter: 30);

        $service = new VaultFieldShareService($repo, $limiter, ['max_active_per_user' => 20], 'https://vault.test');

        $this->expectException(ShareRateLimitException::class);
        $service->fetchPublic('share123', '127.0.0.1');
    }
}

final class FakeVaultFieldShareRepository implements VaultFieldShareRepositoryInterface
{
    public int $fetchActiveCalls = 0;
    public int $consumeShareCalls = 0;
    public ?string $lastConsumeIpHash = null;

    public function __construct(
        private readonly ?array $activeRow = null,
        private readonly bool $consumeResult = true,
    ) {
    }

    public function insertPending(array $data): array
    {
        return [];
    }

    public function finalizePending(string $shareId, string $ownerUserId, array $blob): ?array
    {
        return null;
    }

    public function countActiveForOwner(string $ownerUserId): int
    {
        return 0;
    }

    public function listForOwner(string $ownerUserId): array
    {
        return [];
    }

    public function revokeById(string $ownerUserId, string $id): bool
    {
        return false;
    }

    public function deleteByVaultItemId(string $ownerUserId, string $vaultItemId): int
    {
        return 0;
    }

    public function fetchActive(string $shareId): ?array
    {
        $this->fetchActiveCalls++;

        return $this->activeRow;
    }

    public function consumeShare(string $shareId, ?string $ipHash): bool
    {
        $this->consumeShareCalls++;
        $this->lastConsumeIpHash = $ipHash;

        return $this->consumeResult;
    }

    public function purgeExpiredAndStalePending(): int
    {
        return 0;
    }

    public function itemOwnedByUser(string $userId, string $itemId): bool
    {
        return false;
    }
}

final class FakeShareRateLimiter implements ShareRateLimiterInterface
{
    public function __construct(
        private readonly bool $allowed = true,
        private readonly int $retryAfter = 0,
        private readonly bool $storageFailed = false,
    ) {
    }

    public function consumeFetch(string $ip, string $shareId): array
    {
        return [
            'allowed' => $this->allowed,
            'retry_after' => $this->retryAfter,
            'storage_failed' => $this->storageFailed,
        ];
    }

    public function consumeCreate(string $userId): array
    {
        return [
            'allowed' => $this->allowed,
            'retry_after' => $this->retryAfter,
            'storage_failed' => $this->storageFailed,
        ];
    }
}
