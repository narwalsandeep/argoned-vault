<?php

declare(strict_types=1);

namespace Blackbox\Application\Http\Actions\Dev;

use Blackbox\Infrastructure\Mail\AuthEmailPreviewFactory;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * HTML console for auth email previews. Disabled when {@see settings} `app_env` is `production`.
 * Preview URLs are path-only (same origin as this page); a short script sets the iframe src because
 * <code>target="iframeName"</code> is inconsistent across browsers.
 */
final class DevEmailTemplatesIndexAction implements RequestHandlerInterface
{
    /**
     * @param array{app_env:string} $appConfig
     */
    public function __construct(
        private readonly array $appConfig,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if (($this->appConfig['app_env'] ?? '') === 'production') {
            return $this->emptyNotFound();
        }

        $path = $request->getUri()->getPath();
        $prefix = rtrim($path, '/');
        $prefixAttr = htmlspecialchars($prefix, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $menu = AuthEmailPreviewFactory::menu();
        $firstSlug = $menu[0]['slug'] ?? 'verification';
        $defaultPath = htmlspecialchars($prefix . '/view/' . $firstSlug, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $firstSlugJs = json_encode($firstSlug, JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        $buttons = '';
        foreach ($menu as $row) {
            $slugEsc = htmlspecialchars($row['slug'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $label = htmlspecialchars($row['label'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $buttons .= '<li class="bb-et-nav-item">'
                . '<button type="button" class="bb-et-nav-link" data-bb-preview-slug="' . $slugEsc . '">' . $label . '</button>'
                . '</li>';
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Email template previews</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f4f4f5; color: #171717; min-height: 100vh; }
  @media (prefers-color-scheme: dark) {
    body { background: #171717; color: #fafafa; }
  }
  .bb-et-header { padding: 20px 20px 12px; border-bottom: 1px solid #e5e5e5; background: #fff; }
  @media (prefers-color-scheme: dark) {
    .bb-et-header { background: #262626; border-color: #404040; }
  }
  .bb-et-header h1 { margin: 0 0 8px; font-size: 1.25rem; font-weight: 600; }
  .bb-et-header p { margin: 0; font-size: 0.875rem; line-height: 1.5; color: #525252; max-width: 52rem; }
  @media (prefers-color-scheme: dark) {
    .bb-et-header p { color: #a3a3a3; }
  }
  .bb-et-layout { display: flex; flex-wrap: wrap; align-items: stretch; min-height: calc(100vh - 120px); }
  .bb-et-sidebar { flex: 0 0 240px; padding: 16px; border-right: 1px solid #e5e5e5; background: #fafafa; }
  @media (prefers-color-scheme: dark) {
    .bb-et-sidebar { background: #1f1f1f; border-color: #404040; }
  }
  .bb-et-sidebar h2 { margin: 0 0 10px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #737373; }
  .bb-et-nav { list-style: none; margin: 0; padding: 0; }
  .bb-et-nav-item { margin: 0 0 4px; }
  .bb-et-nav-link { display: block; width: 100%; text-align: left; cursor: pointer; padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; color: #171717; text-decoration: none; border: 1px solid transparent; background: transparent; font: inherit; }
  .bb-et-nav-link:hover { background: #fff; border-color: #e5e5e5; }
  @media (prefers-color-scheme: dark) {
    .bb-et-nav-link { color: #fafafa; }
    .bb-et-nav-link:hover { background: #262626; border-color: #404040; }
  }
  .bb-et-nav-link.bb-et-nav-link--active { border-color: #fecaca; background: #fff7f7; }
  @media (prefers-color-scheme: dark) {
    .bb-et-nav-link.bb-et-nav-link--active { border-color: #7f1d1d; background: #292524; }
  }
  .bb-et-main { flex: 1; min-width: 280px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .bb-et-frame-wrap { flex: 1; min-height: 480px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  @media (prefers-color-scheme: dark) {
    .bb-et-frame-wrap { border-color: #404040; background: #262626; box-shadow: none; }
  }
  .bb-et-frame-wrap iframe { display: block; width: 100%; height: min(85vh, 900px); border: 0; background: #fff; }
  .bb-et-hint { font-size: 0.8rem; color: #737373; margin: 0; }
  @media (prefers-color-scheme: dark) {
    .bb-et-hint { color: #a3a3a3; }
  }
  code { font-size: 0.88em; }
  @media (max-width: 700px) {
    .bb-et-sidebar { flex: 1 1 100%; border-right: none; border-bottom: 1px solid #e5e5e5; }
  }
</style>
</head>
<body data-bb-preview-prefix="{$prefixAttr}">
  <header class="bb-et-header">
    <h1>Auth email previews</h1>
    <p>Same HTML as outbound mailers (<code>AuthEmailTemplates</code> + <code>AuthEmailLayout</code>). Choose a template below; the preview loads in the frame (same-origin path as this page). <strong>Not available when <code>APP_ENV=production</code>.</strong></p>
  </header>
  <div class="bb-et-layout">
    <aside class="bb-et-sidebar">
      <h2>Templates</h2>
      <ul class="bb-et-nav">
        {$buttons}
      </ul>
    </aside>
    <main class="bb-et-main">
      <p class="bb-et-hint">If the frame stays blank, open the same URL in a new tab (copy from the network panel); some proxies only route <code>GET</code> for the first document.</p>
      <div class="bb-et-frame-wrap">
        <iframe id="bb-email-preview-frame" title="Rendered email HTML" src="{$defaultPath}"></iframe>
      </div>
    </main>
  </div>
  <script>
(function () {
  var body = document.body;
  var prefix = body.getAttribute('data-bb-preview-prefix') || '';
  var frame = document.getElementById('bb-email-preview-frame');
  function load(slug) {
    if (!frame || !slug) return;
    frame.src = prefix + '/view/' + encodeURIComponent(slug);
    document.querySelectorAll('[data-bb-preview-slug]').forEach(function (btn) {
      btn.classList.toggle('bb-et-nav-link--active', btn.getAttribute('data-bb-preview-slug') === slug);
    });
  }
  document.querySelectorAll('[data-bb-preview-slug]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      load(String(btn.getAttribute('data-bb-preview-slug') || ''));
    });
  });
  var initial = {$firstSlugJs};
  document.querySelectorAll('[data-bb-preview-slug]').forEach(function (btn) {
    if (btn.getAttribute('data-bb-preview-slug') === initial) btn.classList.add('bb-et-nav-link--active');
  });
})();
  </script>
</body>
</html>
HTML;

        $response = new Response();
        $response->getBody()->write($html);

        return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
    }

    private function emptyNotFound(): ResponseInterface
    {
        return (new Response(404))->withHeader('Content-Type', 'text/plain; charset=utf-8');
    }
}
