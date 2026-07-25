<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ResetPasswordAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $token = (string) ($body['token'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');

        try {
            $this->authService->resetPasswordWithToken($token, $newPassword);
        } catch (\InvalidArgumentException $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'Password must')) {
                return JsonResponder::write(new Response(), ['error' => 'weak_password'], 422);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_request'], 422);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'invalid_or_expired_token') {
                return JsonResponder::write(new Response(), ['error' => 'invalid_or_expired_token'], 400);
            }
            throw $e;
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'message' => 'Your password was updated. Sign in with your new password.',
        ]);
    }
}
