<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\CookieFactory;
use Blackbox\Application\Http\Support\SessionRememberMePolicy;
use Blackbox\Domain\Auth\AuthAuditRecorder;
use Blackbox\Domain\Auth\OAuthLoginService;
use Blackbox\Domain\Auth\SessionService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class OAuthCallbackAction implements RequestHandlerInterface
{
    private const KNOWN_ERRORS = [
        'oauth_invalid_callback',
        'oauth_invalid_or_expired_state',
        'oauth_token_exchange_failed',
        'oauth_profile_failed',
        'oauth_email_required',
        'oauth_email_not_verified',
        'oauth_email_password_account',
        'oauth_account_create_failed',
        'oauth_user_denied',
        'user_not_found',
        'oauth_unknown_provider',
        'oauth_failed',
    ];

    /**
     * @param array{cookie_name:string,ttl_seconds:int,secure_cookie:bool} $sessionConfig
     */
    public function __construct(
        private readonly OAuthLoginService $oauth,
        private readonly SessionService $sessionService,
        private readonly array $sessionConfig,
        private readonly ?AuthAuditRecorder $audit = null,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var array<string,string> $q */
        $q = $request->getQueryParams();
        if (isset($q['error']) && trim((string) $q['error']) !== '') {
            return $this->redirect($this->oauth->uiLoginErrorUrl('oauth_user_denied'));
        }

        $state = trim((string) ($q['state'] ?? ''));
        $code = trim((string) ($q['code'] ?? ''));

        try {
            $user = $this->oauth->finishAuthorization($state, $code);
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();

            return $this->redirect($this->oauth->uiLoginErrorUrl(
                in_array($msg, self::KNOWN_ERRORS, true) ? $msg : 'oauth_failed',
            ));
        } catch (\Throwable) {
            return $this->redirect($this->oauth->uiLoginErrorUrl('oauth_failed'));
        }

        $this->audit?->record($user['id'], 'login_oauth', $request);

        $oauthTtl = SessionRememberMePolicy::sessionTtlSeconds($this->sessionConfig, true);
        $session = $this->sessionService->create(
            $user['id'],
            $request->getServerParams()['REMOTE_ADDR'] ?? null,
            $request->getHeaderLine('User-Agent') ?: null,
            $oauthTtl,
            true,
        );

        $response = new Response(302);
        $response = $response
            ->withHeader('Location', $this->oauth->uiLoginSuccessUrl())
            ->withAddedHeader(
                'Set-Cookie',
                CookieFactory::sessionCookie(
                    $this->sessionConfig['cookie_name'],
                    $session['token'],
                    $oauthTtl,
                    $this->sessionConfig['secure_cookie']
                )
            );

        return $response;
    }

    private function redirect(string $url): ResponseInterface
    {
        $response = new Response(302);

        return $response->withHeader('Location', $url);
    }
}
