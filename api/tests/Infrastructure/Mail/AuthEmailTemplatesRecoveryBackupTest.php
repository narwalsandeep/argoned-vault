<?php

declare(strict_types=1);

namespace Blackbox\Tests\Infrastructure\Mail;

use Blackbox\Infrastructure\Mail\AuthEmailTemplates;
use PHPUnit\Framework\TestCase;

final class AuthEmailTemplatesRecoveryBackupTest extends TestCase
{
    public function testRecoveryBackupEmailIncludesRecoveryPhraseAndRecoverySteps(): void
    {
        $pack = AuthEmailTemplates::recoveryBackupEmail(
            'Alex',
            'Argoned',
            'correct-horse-battery-staple',
        );

        $this->assertStringContainsString('save your recovery phrase', $pack['subject']);
        $this->assertStringContainsString('correct-horse-battery-staple', $pack['text']);
        $this->assertStringContainsString('correct-horse-battery-staple', $pack['html']);
        $this->assertStringContainsString('Settings → Recovery', $pack['text']);
        $this->assertStringContainsString('Load Artifact', $pack['html']);
        $this->assertStringContainsString('argoned-recovery-artifact.json', $pack['text']);
    }
}
