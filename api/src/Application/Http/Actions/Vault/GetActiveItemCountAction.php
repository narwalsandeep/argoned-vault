<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\VaultActiveItemCountReader;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Active vault item count for the signed-in account. Metadata only; no ciphertext.
 */
final class GetActiveItemCountAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultActiveItemCountReader $vault)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);

        return JsonResponder::write(new Response(), [
            'status' => 'ok',
            'active_item_count' => $this->vault->countActiveItems($userId),
        ], 200);
    }
}
