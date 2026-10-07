<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Vault;

use Blackbox\Application\Http\Actions\Vault\GetActiveItemCountAction;
use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Domain\Vault\VaultActiveItemCountReader;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class GetActiveItemCountActionTest extends TestCase
{
    private const USER = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

    public function testReturnsActiveItemCountForSignedInUser(): void
    {
        $vault = new class implements VaultActiveItemCountReader {
            public string $seenUserId = '';

            public function countActiveItems(string $userId): int
            {
                $this->seenUserId = $userId;

                return 32;
            }

            public function countActiveFileVaultItems(string $userId): int
            {
                return 0;
            }
        };

        $action = new GetActiveItemCountAction($vault);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/vault/items/count')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, self::USER);

        $response = $action->handle($request);
        $data = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('ok', $data['status']);
        $this->assertSame(32, $data['active_item_count']);
        $this->assertSame(self::USER, $vault->seenUserId);
    }
}
