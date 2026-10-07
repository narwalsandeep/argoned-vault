<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Auth\OAuthLoginService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class OAuthStartAction implements RequestHandlerInterface
{
    public function __construct(private readonly OAuthLoginService $oauth)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $provider = RouteArguments::getString($request, 'provider');
        if ($provider === null) {
            return $this->redirect($this->oauth->uiLoginErrorUrl('oauth_invalid_request'));
        }

        try {
            $url = $this->oauth->beginAuthorization($provider);
        } catch (\Throwable) {
            return $this->redirect($this->oauth->uiLoginErrorUrl('oauth_start_failed'));
        }

        $response = new Response(302);

        return $response->withHeader('Location', $url);
    }

    private function redirect(string $url): ResponseInterface
    {
        $response = new Response(302);

        return $response->withHeader('Location', $url);
    }
}
