<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Actions\Health;

use Blackbox\Application\Http\Actions\Health\LiveAction;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class LiveActionTest extends TestCase
{
    public function testReturnsOkJson(): void
    {
        $action = new LiveAction();
        $request = ServerRequestFactory::createFromGlobals();
        $response = $action->handle($request);

        $this->assertSame(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('ok', $data['status']);
        $this->assertSame('live', $data['check']);
    }
}
