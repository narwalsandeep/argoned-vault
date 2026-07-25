<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Vault\VaultFieldShareService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class RevokeVaultFieldShareAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultFieldShareService $shareService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $id = RouteArguments::getString($request, 'id');
        if ($id === null) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_share_id'], 400);
        }

        if (!$this->shareService->revoke($userId, $id)) {
            return JsonResponder::write(new Response(), ['error' => 'share_not_found'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }
}
