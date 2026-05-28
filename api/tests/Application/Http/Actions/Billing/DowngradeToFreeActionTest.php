<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Billing;

use Blackbox\Application\Billing\PlanCapabilityService;
use Blackbox\Application\Http\Actions\Billing\DowngradeToFreeAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Billing\BillingServiceInterface;
use Blackbox\Domain\Vault\VaultActiveItemCountReader;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class DowngradeToFreeActionTest extends TestCase
{
    private const USER = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

    public function testCallsDowngradeWhenEligible(): void
    {
        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->method('getEffectivePlanKey')->with(self::USER)->willReturn('pro');
        $billing->expects($this->once())->method('downgradeProToFreeDatabaseOnly')->with(self::USER);

        $vault = new class implements VaultActiveItemCountReader {
            public function countActiveItems(string $userId): int
            {
                return 3;
            }

            public function countActiveFileVaultItems(string $userId): int
            {
                return 0;
            }
        };

        $planCaps = new PlanCapabilityService($billing, false);

        $action = new DowngradeToFreeAction($billing, $vault, $planCaps);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/billing/downgrade-to-free')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER);

        $response = $action->handle($request);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testSkipsDowngradeWhenNotOnPro(): void
    {
        $billing = $this->createMock(BillingServiceInterface::class);
        $billing->method('getEffectivePlanKey')->willReturn('free');
        $billing->expects($this->never())->method('downgradeProToFreeDatabaseOnly');

        $vault = new class implements VaultActiveItemCountReader {
            public function countActiveItems(string $userId): int
            {
                return 0;
            }

            public function countActiveFileVaultItems(string $userId): int
            {
                return 0;
            }
        };

        $planCaps = new PlanCapabilityService($billing, false);

        $action = new DowngradeToFreeAction($billing, $vault, $planCaps);
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER);

        $response = $action->handle($request);
        $this->assertSame(400, $response->getStatusCode());
    }
}
