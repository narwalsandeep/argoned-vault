<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Auth\OAuthLoginService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class OAuthProvidersAction implements RequestHandlerInterface
{
    public function __construct(private readonly OAuthLoginService $oauth)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'providers' => $this->oauth->providersAvailability(),
        ]);
    }
}
