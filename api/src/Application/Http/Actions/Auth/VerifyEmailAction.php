<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class VerifyEmailAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $token = (string) ($body['token'] ?? '');

        try {
            $this->authService->verifyEmailWithToken($token);
        } catch (\InvalidArgumentException) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_token'], 422);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'invalid_or_expired_token') {
                return JsonResponder::write(new Response(), ['error' => 'invalid_or_expired_token'], 400);
            }
            throw $e;
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'email_verified' => true,
        ]);
    }
}
