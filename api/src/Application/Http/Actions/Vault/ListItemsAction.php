<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Domain\Vault\VaultService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ListItemsAction implements RequestHandlerInterface
{
    public function __construct(private readonly VaultService $vaultService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        $qp = $request->getQueryParams();
        $search = trim((string) ($qp['search'] ?? ''));
        $exactWord = self::queryBool($qp['search_exact_word'] ?? $qp['search_full_word'] ?? null);
        $caseSensitive = self::queryBool($qp['search_case_sensitive'] ?? null);
        $items = $this->vaultService->listItemMetadata($userId, $search, $exactWord, $caseSensitive);
        return JsonResponder::write(new Response(), ['status' => 'ok', 'items' => $items], 200);
    }

    private static function queryBool(mixed $v): bool
    {
        if ($v === null || $v === '') {
            return false;
        }
        if (is_bool($v)) {
            return $v;
        }
        $s = strtolower(trim((string) $v));

        return $s === '1' || $s === 'true' || $s === 'yes' || $s === 'on';
    }
}

