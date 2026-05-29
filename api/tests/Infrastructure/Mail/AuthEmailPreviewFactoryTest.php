<?php

declare(strict_types=1);

namespace Blackbox\Tests\Infrastructure\Mail;

use Blackbox\Infrastructure\Mail\AuthEmailPreviewFactory;
use PHPUnit\Framework\TestCase;

final class AuthEmailPreviewFactoryTest extends TestCase
{
    public function testRenderVerificationContainsSubjectAndLink(): void
    {
        $pack = AuthEmailPreviewFactory::render('verification', 'http://localhost:4200', 'Argoned Test');

        $this->assertStringContainsString('Confirm your Argoned Test account', $pack['subject']);
        $this->assertStringContainsString('example.com/verify-email', $pack['html']);
        $this->assertStringContainsString('<!DOCTYPE html>', $pack['html']);
    }

    public function testRenderUsesSystemSansFontStack(): void
    {
        $pack = AuthEmailPreviewFactory::render('verification', 'http://localhost:4200', 'Argoned Test');

        $this->assertStringContainsString('BlinkMacSystemFont', $pack['html']);
        $this->assertStringContainsString('Segoe UI', $pack['html']);
    }

    public function testRenderOnboardingWelcomeHasNoSvg(): void
    {
        $pack = AuthEmailPreviewFactory::render('onboarding-welcome', 'http://localhost:4200', 'Argoned');

        $this->assertStringContainsString('save your vault secret', $pack['subject']);
        $this->assertStringContainsString('bb-onboard-secret', $pack['html']);
        $this->assertStringContainsString('ability-absence-active-example', $pack['html']);
        $this->assertStringNotContainsString('<svg', $pack['html']);
    }

    public function testUnknownSlugThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        AuthEmailPreviewFactory::render('nope', 'http://localhost:4200', 'Argoned');
    }
}
