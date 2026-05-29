<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\AuthService;
use Blackbox\Domain\Auth\EmailNotVerifiedException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class LoginAction implements RequestHandlerInterface
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $email = (string) ($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');

        try {
            $mfa = $this->authService->beginLoginWithEmailOtp($email, $password);
        } catch (EmailNotVerifiedException) {
            return JsonResponder::write(new Response(), ['error' => 'email_not_verified'], 403);
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'email_delivery_not_configured' || $msg === 'login_otp_misconfigured') {
                return JsonResponder::write(new Response(), ['error' => $msg], 503);
            }
            if ($msg === 'login_otp_email_send_failed') {
                return JsonResponder::write(new Response(), ['error' => $msg], 502);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_credentials'], 401);
        } catch (\Throwable) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_credentials'], 401);
        }

        return JsonResponder::write(new Response(), [
            'status' => 'mfa_required',
            'mfa_challenge_token' => $mfa['mfa_challenge_token'],
            'expires_in_seconds' => $mfa['expires_in_seconds'],
        ]);
    }
}
