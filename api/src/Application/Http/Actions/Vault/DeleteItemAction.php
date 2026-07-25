<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Http\Support\RouteArguments;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class DeleteItemAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultService $vaultService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $id = RouteArguments::getString($request, 'id');
        if ($id === null) {
            return JsonResponder::write(new Response(), ['error' => 'invalid_item_id'], 400);
        }

        $ok = $this->vaultService->deleteItem($userId, $id);
        if (!$ok) {
            return JsonResponder::write(new Response(), ['error' => 'item_not_found'], 404);
        }

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }
}

