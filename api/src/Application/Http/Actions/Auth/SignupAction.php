<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\PlatformAdminPolicy;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class SignupAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly ?string $platformAdminEmail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $email = (string) ($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');
        $firstName = (string) ($body['first_name'] ?? '');
        $lastName = (string) ($body['last_name'] ?? '');
        $acceptTermsPrivacy = $body['accept_terms_privacy'] ?? false;
        $accepted = $acceptTermsPrivacy === true || $acceptTermsPrivacy === 'true' || $acceptTermsPrivacy === 1
            || $acceptTermsPrivacy === '1';
        $legalDocsVersion = trim((string) ($body['legal_docs_version'] ?? ''));

        try {
            $payload = $this->authService->signup(
                $email,
                $password,
                $firstName,
                $lastName,
                $accepted,
                $legalDocsVersion,
            );
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            if ($code === 'terms_privacy_not_accepted') {
                return JsonResponder::write(new Response(), ['error' => 'terms_privacy_not_accepted'], 422);
            }
            if ($code === 'legal_docs_version_mismatch') {
                return JsonResponder::write(new Response(), ['error' => 'legal_docs_version_mismatch'], 422);
            }

            return JsonResponder::write(new Response(), ['error' => 'invalid_signup'], 422);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'Email already registered') {
                return JsonResponder::write(new Response(), ['error' => 'email_taken'], 409);
            }
            if ($e->getMessage() === 'email_delivery_not_configured') {
                return JsonResponder::write(new Response(), ['error' => 'email_delivery_not_configured'], 503);
            }
            if ($e->getMessage() === 'verification_email_send_failed') {
                return JsonResponder::write(new Response(), ['error' => 'verification_email_send_failed'], 502);
            }

            return JsonResponder::write(new Response(), ['error' => 'signup_failed'], 400);
        }

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'verification_sent' => true,
            'email' => $payload['email'],
            'user' => [
                'id' => $payload['id'],
                'email' => $payload['email'],
                'first_name' => $payload['first_name'],
                'last_name' => $payload['last_name'],
                'display_name' => $payload['display_name'] ?? null,
                'mfa_enabled' => $payload['mfa_enabled'],
                'email_verified' => false,
                'platform_admin' => PlatformAdminPolicy::matches($this->platformAdminEmail, (string) $payload['email']),
            ],
        ], 201);
    }
}
