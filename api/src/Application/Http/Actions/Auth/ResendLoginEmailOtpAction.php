<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ResendLoginEmailOtpAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $challenge = trim((string) ($body['mfa_challenge_token'] ?? ''));
        if ($challenge === '') {
            return JsonResponder::write(new Response(), ['error' => 'invalid_request'], 400);
        }

        try {
            $ttl = $this->authService->resendLoginEmailOtp($challenge);
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'email_delivery_not_configured' || $msg === 'login_otp_misconfigured') {
                return JsonResponder::write(new Response(), ['error' => $msg], 503);
            }
            if ($msg === 'login_otp_email_send_failed') {
                return JsonResponder::write(new Response(), ['error' => $msg], 502);
            }
            if ($msg === 'invalid_or_expired_login_challenge') {
                return JsonResponder::write(new Response(), ['error' => $msg], 401);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_request'], 400);
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'expires_in_seconds' => $ttl,
        ]);
    }
}
