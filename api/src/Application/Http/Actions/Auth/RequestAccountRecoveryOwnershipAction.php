<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/** Starts user-owned account recovery. Does not change vault data. */
final class RequestAccountRecoveryOwnershipAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $this->authService->requestAccountRecoveryOwnership((string) ($body['email'] ?? ''));

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'message' => 'If an account exists for this address, recovery instructions were sent.',
        ]);
    }
}
