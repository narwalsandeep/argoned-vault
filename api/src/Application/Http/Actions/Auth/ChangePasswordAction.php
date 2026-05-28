<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Auth;

use Blackbox\Application\Http\Middleware\AuthMiddleware;
use Blackbox\Application\Http\Support\JsonResponder;
use Blackbox\Application\Mail\UserTransactionalMailer;
use Blackbox\Domain\Auth\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class ChangePasswordAction implements RequestHandlerInterface
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly UserTransactionalMailer $transactionalMail,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = (string) $request->getAttribute(AuthMiddleware::USER_ID_ATTRIBUTE);
        if ($userId === '') {
            return JsonResponder::write(new Response(), ['error' => 'unauthorized'], 401);
        }

        /** @var array<string,mixed> $body */
        $body = (array) $request->getParsedBody();
        $current = (string) ($body['current_password'] ?? '');
        $new = (string) ($body['new_password'] ?? '');

        try {
            $this->authService->changePassword($userId, $current, $new);
        } catch (\InvalidArgumentException $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return JsonResponder::write(new Response(), ['error' => $e->getMessage()], 400);
        }

        $this->transactionalMail->notifyAccountPasswordChanged($userId);

        return JsonResponder::write(new Response(), ['status' => 'ok'], 200);
    }
}
