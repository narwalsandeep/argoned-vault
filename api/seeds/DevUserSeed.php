<?php

declare(strict_types=1);

use Phinx\Seed\AbstractSeed;

final class DevUserSeed extends AbstractSeed
{
    public function run(): void
    {
        $hash = password_hash('devpassword123', PASSWORD_ARGON2ID);
        if ($hash === false) {
            throw new \RuntimeException('password_hash failed');
        }

        $this->execute(
            'INSERT INTO users (email, auth_password_hash, first_name, last_name, mfa_enabled, mfa_state, email_verified_at)
             VALUES (?, ?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (email) DO NOTHING',
            ['dev.user@example.local', $hash, 'Dev', 'User', 'email_otp'],
        );
    }
}
