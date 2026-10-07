<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\AuthenticatedLoginResponseFactory;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthAuditRecorder;
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
        private readonly ?AuthAuditRecorder $audit = null,
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

        $this->audit?->record($user['id'], 'login_email_otp', $request);

        return AuthenticatedLoginResponseFactory::write(
            $this->sessionService,
            $user,
            $request,
            $this->sessionConfig,
            $this->platformAdminEmail,
        );
    }
}
