<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Support;

use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Response;

/**
 * Builds the JSON body + session cookie returned after a successful login (OTP or emergency admin bypass).
 */
final class AuthenticatedLoginResponseFactory
{
    /**
     * @param array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified:bool
     * } $user
     * @param array{cookie_name:string,ttl_seconds:int,remember_ttl_seconds:int,secure_cookie:bool} $sessionConfig
     */
    public static function write(
        SessionService $sessionService,
        array $user,
        ServerRequestInterface $request,
        array $sessionConfig,
        ?string $platformAdminEmail,
    ): ResponseInterface {
        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $rememberMe = SessionRememberMePolicy::parseRememberMe($body['remember_me'] ?? false);
        $ttlSeconds = SessionRememberMePolicy::sessionTtlSeconds($sessionConfig, $rememberMe);

        $session = $sessionService->create(
            $user['id'],
            $request->getServerParams()['REMOTE_ADDR'] ?? null,
            $request->getHeaderLine('User-Agent') ?: null,
            $ttlSeconds,
            $rememberMe,
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
                'platform_admin' => PlatformAdminPolicy::matches($platformAdminEmail, (string) $user['email']),
            ],
            'csrf_token' => $session['csrf_token'],
        ]);

        return $response->withAddedHeader(
            'Set-Cookie',
            CookieFactory::sessionCookie(
                $sessionConfig['cookie_name'],
                $session['token'],
                $ttlSeconds,
                $sessionConfig['secure_cookie'],
            ),
        );
    }
}
