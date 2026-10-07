<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Auth;

use Blackbox\Infrastructure\Database\PdoFactory;
use PDO;

class UserOAuthIdentityRepository
{
    public function __construct(private readonly PdoFactory $pdoFactory)
    {
    }

    public function findUserIdByProviderSubject(string $provider, string $subject): ?string
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'SELECT user_id::text FROM user_oauth_identities
             WHERE provider = :provider AND provider_subject = :subject LIMIT 1'
        );
        $stmt->execute(['provider' => $provider, 'subject' => $subject]);
        $v = $stmt->fetchColumn();

        return $v !== false ? (string) $v : null;
    }

    public function insert(string $userId, string $provider, string $subject): void
    {
        $pdo = $this->pdoFactory->create();
        $stmt = $pdo->prepare(
            'INSERT INTO user_oauth_identities (user_id, provider, provider_subject)
             VALUES (CAST(:user_id AS uuid), :provider, :subject)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'provider' => $provider,
            'subject' => $subject,
        ]);
    }
}
