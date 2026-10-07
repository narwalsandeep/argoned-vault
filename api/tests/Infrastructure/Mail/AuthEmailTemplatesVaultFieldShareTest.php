<?php

declare(strict_types=1);

namespace Blackbox\Tests\Infrastructure\Mail;

use Blackbox\Infrastructure\Mail\AuthEmailTemplates;
use PHPUnit\Framework\TestCase;

final class AuthEmailTemplatesVaultFieldShareTest extends TestCase
{
    public function testInvitationUsesGeneralEncryptedInfoCopyWithoutFieldName(): void
    {
        $pack = AuthEmailTemplates::vaultFieldShareInvitation(
            'Argoned',
            'Sandeep',
            'Password',
            'Guest WiFi',
            'https://vault.test/share/abc',
            'ABCD-EFGH-IJKL-MNOP',
            '2026-06-18 21:35 UTC',
            1,
        );

        $this->assertSame('Sandeep shared encrypted info with you', $pack['subject']);
        $this->assertStringContainsString('Sandeep shared encrypted information with you via Argoned.', $pack['text']);
        $this->assertStringNotContainsString('Password', $pack['text']);
        $this->assertStringContainsString('shared encrypted information with you via', $pack['html']);
        $this->assertStringNotContainsString('protected field', $pack['html']);
        $this->assertStringContainsString('Label:', $pack['text']);
        $this->assertStringContainsString('Guest WiFi', $pack['text']);
    }
}
