<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ForgotPasswordAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $email = (string) ($body['email'] ?? '');

        $this->authService->requestPasswordReset($email);

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'message' => 'If an account exists for this address, password reset instructions were sent.',
        ]);
    }
}
