<?php

declare(strict_types=1);

namespace Blackbox\Tests\Application\Http\Middleware;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Middleware\PlatformAdminMiddleware;
use Blackbox\Infrastructure\Auth\UserRepository;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class PlatformAdminMiddlewareTest extends TestCase
{
    public function testForbiddenWhenAdminEmailNotConfigured(): void
    {
        $users = $this->createMock(UserRepository::class);
        $mw = new PlatformAdminMiddleware($users, ['admin_email' => null]);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/admin/customers')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, 'u1');

        $handler = $this->createMock(RequestHandlerInterface::class);
        $handler->expects($this->never())->method('handle');

        $response = $mw->process($request, $handler);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testForbiddenWhenUserEmailDoesNotMatch(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'user@example.com',
            'mfa_enabled' => true,
            'mfa_state' => 'verified',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-01-01',
        ]);
        $mw = new PlatformAdminMiddleware($users, ['admin_email' => 'admin@example.com']);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, 'u1');

        $handler = $this->createMock(RequestHandlerInterface::class);
        $handler->expects($this->never())->method('handle');

        $response = $mw->process($request, $handler);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testDelegatesWhenUserIsAdmin(): void
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findById')->willReturn([
            'id' => 'u1',
            'email' => 'admin@example.com',
            'mfa_enabled' => true,
            'mfa_state' => 'verified',
            'first_name' => 'A',
            'last_name' => 'B',
            'display_name' => null,
            'email_verified_at' => '2026-01-01',
        ]);
        $mw = new PlatformAdminMiddleware($users, ['admin_email' => 'admin@example.com']);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/')
            ->withAttribute(AuthMiddleware::USER_ID_ATTRIBUTE, 'u1');

        $handler = new class implements RequestHandlerInterface {
            public function handle(ServerRequestInterface $request): ResponseInterface
            {
                return (new Response())->withStatus(200);
            }
        };

        $response = $mw->process($request, $handler);
        $this->assertSame(200, $response->getStatusCode());
    }
}
