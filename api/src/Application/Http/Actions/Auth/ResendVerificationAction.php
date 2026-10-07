<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ResendVerificationAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $email = (string) ($body['email'] ?? '');

        try {
            $this->authService->resendVerificationEmail($email);
        } catch (\InvalidArgumentException) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_email'], 422);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'email_delivery_not_configured') {
                return JsonResponder::write(new Response(), ['error' => 'email_delivery_not_configured'], 503);
            }
            throw $e;
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'message' => 'If an unverified account exists for this address, a new verification email was sent.',
        ]);
    }
}
