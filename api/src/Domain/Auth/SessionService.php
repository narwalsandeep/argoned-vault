<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

use Blackbox\Infrastructure\Auth\SessionRepository;

final class SessionService
{
    public function __construct(private readonly SessionRepository $sessions)
    {
    }

    /**
     * @return array{session_id:string,token:string,csrf_token:string}
     */
    public function create(string $userId, ?string $ipAddress, ?string $userAgent, int $ttlSeconds): array
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $csrfToken = bin2hex(random_bytes(16));
        $sessionId = $this->sessions->create(
            $userId,
            $tokenHash,
            $csrfToken,
            $ipAddress !== null ? hash('sha256', $ipAddress) : null,
            $userAgent !== null ? hash('sha256', $userAgent) : null,
            $ttlSeconds
        );

        return [
            'session_id' => $sessionId,
            'token' => $token,
            'csrf_token' => $csrfToken,
        ];
    }

    /**
     * @return array{id:string,user_id:string,csrf_token:string}|null
     */
    public function validate(string $token): ?array
    {
        $row = $this->sessions->findActiveByTokenHash(hash('sha256', $token));
        if ($row === null) {
            return null;
        }
        $this->sessions->touch($row['id']);

        return [
            'id' => $row['id'],
            'user_id' => $row['user_id'],
            'csrf_token' => $row['csrf_token'],
        ];
    }

    public function revokeByToken(string $token): void
    {
        $this->sessions->revokeByTokenHash(hash('sha256', $token));
    }

    public function revokeByIdForUser(string $sessionId, string $userId): bool
    {
        return $this->sessions->revokeByIdForUser($sessionId, $userId);
    }

    /**
     * @return list<array{id:string,created_at:string,last_seen_at:string,expires_at:string}>
     */
    public function listByUserId(string $userId): array
    {
        return $this->sessions->listActiveByUserId($userId);
    }
}
