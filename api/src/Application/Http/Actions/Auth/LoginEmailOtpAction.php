<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\CookieFactory;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class LoginEmailOtpAction implements RequestHandlerInterface
{
    /**
     * @param array{cookie_name:string,ttl_seconds:int,secure_cookie:bool} $sessionConfig
     */
    public function __construct(
        private readonly AuthService $authService,
        private readonly SessionService $sessionService,
        private readonly array $sessionConfig,
        private readonly ?string $platformAdminEmail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $challenge = trim((string) ($body['mfa_challenge_token'] ?? ''));
        $otpRaw = (string) ($body['otp'] ?? '');
        $otp = preg_replace('/\D/', '', $otpRaw) ?? '';

        if ($challenge === '' || strlen($otp) !== 6) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_request'], 400);
        }

        try {
            $user = $this->authService->completeLoginWithEmailOtp($challenge, $otp);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'invalid_or_expired_login_otp') {
                return JsonResponder::write(new Response(), ['error' => 'invalid_or_expired_login_otp'], 401);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_request'], 400);
        }

        $session = $this->sessionService->create(
            $user['id'],
            $request->getServerParams()['REMOTE_ADDR'] ?? null,
            $request->getHeaderLine('User-Agent') ?: null,
            $this->sessionConfig['ttl_seconds']
        );

        $response = JsonResponder::write(new Response(), [
            'status' => 'ok',
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'mfa_enabled' => $user['mfa_enabled'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'display_name' => $user['display_name'] ?? null,
                'email_verified' => $user['email_verified'],
                'platform_admin' => PlatformAdminPolicy::matches($this->platformAdminEmail, (string) $user['email']),
            ],
            'csrf_token' => $session['csrf_token'],
        ]);

        return $response->withAddedHeader(
            'Set-Cookie',
            CookieFactory::sessionCookie(
                $this->sessionConfig['cookie_name'],
                $session['token'],
                $this->sessionConfig['ttl_seconds'],
                $this->sessionConfig['secure_cookie']
            )
        );
    }
}
