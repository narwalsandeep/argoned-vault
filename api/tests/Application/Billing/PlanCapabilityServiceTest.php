<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Billing;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Domain\Billing\BillingServiceInterface;
use PHPUnit\Framework\TestCase;

final class PlanCapabilityServiceTest extends TestCase
{
    public function testGateOffAllowsImportForFreePlan(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'free';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, false);
        $this->assertTrue($svc->userMayBulkImportVaultItems('u1'));
        $this->assertSame(['vault_import' => true, 'vault_files' => true], $svc->capabilitiesForUser('u1'));
    }

    public function testGateOnBlocksFreePlan(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'free';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, true);
        $this->assertFalse($svc->userMayBulkImportVaultItems('u1'));
        $this->assertSame(['vault_import' => false, 'vault_files' => false], $svc->capabilitiesForUser('u1'));
    }

    public function testGateOnAllowsPro(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'pro';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, true);
        $this->assertTrue($svc->userMayBulkImportVaultItems('u1'));
    }

    public function testItemLimitForFreePlanIsEight(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'free';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, true);
        $this->assertSame(8, $svc->itemLimitForUser('u1'));
        $this->assertTrue($svc->userMayCreateVaultItems('u1', 7, 1));
        $this->assertFalse($svc->userMayCreateVaultItems('u1', 8, 1));
    }

    public function testItemLimitForPaidPlansIsFiveHundredTwelve(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'lifetime';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, true);
        $this->assertSame(512, $svc->itemLimitForUser('u1'));
        $this->assertTrue($svc->userMayCreateVaultItems('u1', 511, 1));
        $this->assertFalse($svc->userMayCreateVaultItems('u1', 512, 1));
    }

    public function testVaultFileMimeAllowlistAndSizeLimits(): void
    {
        $billing = new class implements BillingServiceInterface {
            public function isEnabled(): bool
            {
                return true;
            }

            public function getPublicConfig(): array
            {
                return ['enabled' => true, 'payment_links' => ['pro' => '', 'lifetime' => '']];
            }

            public function getEffectivePlanKey(string $userId): string
            {
                return 'pro';
            }

            public function getSummaryForUser(string $userId, ?string $userEmail): array
            {
                return [];
            }

            public function listInvoicesForUser(string $userId): array
            {
                return [];
            }

            public function cancelSubscriptionAtPeriodEnd(string $userId): void {}

            public function downgradeProToFreeDatabaseOnly(string $userId): void {}

            public function syncCheckoutSession(string $userId, string $checkoutSessionId): void {}

            public function handleWebhook(string $payload, string $signatureHeader): void {}

            public function purgeRemoteCustomerForUser(string $userId): void {}
        };

        $svc = new PlanCapabilityService($billing, true);
        $this->assertTrue($svc->isAllowedVaultFileMime('application/pdf'));
        $this->assertTrue($svc->isAllowedVaultFileMime('image/png'));
        $this->assertFalse($svc->isAllowedVaultFileMime('video/mp4'));

        $maxPerFile = $svc->vaultFileMaxBytes();
        $this->assertSame(20 * 1024 * 1024, $maxPerFile);
        $this->assertSame(1024 * 1024 * 1024, $svc->vaultFileTotalBytes());
        $this->assertTrue($svc->userMayStoreVaultFileBytes(100, $maxPerFile - 100));
        $this->assertFalse($svc->userMayStoreVaultFileBytes(1024 * 1024 * 1024, 1));
    }
}
