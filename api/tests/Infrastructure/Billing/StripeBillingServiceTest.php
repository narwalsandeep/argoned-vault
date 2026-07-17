<?php

declare(strict_types=1);

namespace Blackbox\Tests\Infrastructure\Billing;

use Blackbox\Domain\Billing\BillingUserMailerPort;
use Blackbox\Infrastructure\Billing\BillingCustomerRepository;
use Blackbox\Infrastructure\Billing\BillingEventLogRepository;
use Blackbox\Infrastructure\Billing\BillingInvoiceRepository;
use Blackbox\Infrastructure\Billing\BillingOneTimePurchaseRepository;
use Blackbox\Infrastructure\Billing\BillingSubscriptionRepository;
use Blackbox\Infrastructure\Billing\StripeBillingService;
use Blackbox\Infrastructure\Database\PdoFactory;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class StripeBillingServiceTest extends TestCase
{
    public function testGetPublicConfigHidesLifetimePaymentLinkWhenNotOffered(): void
    {
        $service = $this->makeService(lifetimePlanOffered: false);

        $config = $service->getPublicConfig();

        $this->assertSame('', $config['payment_links']['lifetime']);
        $this->assertSame('https://buy.stripe.com/test-pro', $config['payment_links']['pro']);
    }

    public function testGetPublicConfigExposesLifetimePaymentLinkWhenOffered(): void
    {
        $service = $this->makeService(lifetimePlanOffered: true);

        $config = $service->getPublicConfig();

        $this->assertSame('https://buy.stripe.com/test-life', $config['payment_links']['lifetime']);
    }

    private function makeService(bool $lifetimePlanOffered): StripeBillingService
    {
        $pdoFactory = new PdoFactory([
            'host' => '127.0.0.1',
            'port' => '5454',
            'name' => 'blackbox',
            'user' => 'blackbox',
            'password' => '',
        ]);

        return new StripeBillingService(
            [
                'enabled' => true,
                'secret_key' => 'sk_test_example',
                'webhook_secret' => '',
                'payment_link_pro' => 'https://buy.stripe.com/test-pro',
                'payment_link_lifetime' => 'https://buy.stripe.com/test-life',
            ],
            new BillingCustomerRepository($pdoFactory),
            new BillingSubscriptionRepository($pdoFactory),
            new BillingInvoiceRepository($pdoFactory),
            new BillingEventLogRepository($pdoFactory),
            new BillingOneTimePurchaseRepository($pdoFactory),
            $this->createStub(LoggerInterface::class),
            $this->createStub(BillingUserMailerPort::class),
            false,
            $lifetimePlanOffered,
        );
    }
}
