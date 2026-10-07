<?php

declare(strict_types=1);

namespace Blackbox\Tests\Domain\Auth;

use Blackbox\Domain\Auth\OnboardingCompletionMailData;
use PHPUnit\Framework\TestCase;

final class OnboardingCompletionMailDataTest extends TestCase
{
    public function testFromRequestBodyAcceptsValidPayload(): void
    {
        $data = OnboardingCompletionMailData::fromRequestBody([
            'unlock_secret' => 'ability-absence-active',
            'auto_lock_minutes' => 8,
            'argon2_time_cost' => 3,
            'argon2_memory_kib' => 131072,
            'argon2_parallelism' => 1,
        ]);

        $this->assertSame('ability-absence-active', $data->unlockSecret);
        $this->assertSame(8, $data->autoLockMinutes);
        $this->assertSame(3, $data->argon2TimeCost);
        $this->assertSame(131072, $data->argon2MemoryKiB);
        $this->assertSame(1, $data->argon2Parallelism);
        $this->assertSame('128 MiB', $data->memoryMiBLabel());
    }

    public function testFromRequestBodyRejectsShortSecret(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('unlock_secret_too_short');
        OnboardingCompletionMailData::fromRequestBody([
            'unlock_secret' => 'short',
            'auto_lock_minutes' => 8,
            'argon2_time_cost' => 3,
            'argon2_memory_kib' => 131072,
            'argon2_parallelism' => 1,
        ]);
    }

    public function testFromRequestBodyRejectsInvalidAutoLockPreset(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('auto_lock_minutes_invalid');
        OnboardingCompletionMailData::fromRequestBody([
            'unlock_secret' => 'ability-absence-active',
            'auto_lock_minutes' => 5,
            'argon2_time_cost' => 3,
            'argon2_memory_kib' => 131072,
            'argon2_parallelism' => 1,
        ]);
    }

    public function testFromRequestBodyRejectsInvalidArgon2MemoryStep(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('argon2_params_invalid');
        OnboardingCompletionMailData::fromRequestBody([
            'unlock_secret' => 'ability-absence-active',
            'auto_lock_minutes' => 8,
            'argon2_time_cost' => 3,
            'argon2_memory_kib' => 70000,
            'argon2_parallelism' => 1,
        ]);
    }
}
