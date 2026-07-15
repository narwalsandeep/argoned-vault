# Argoned API (Slim 4)

## Run (Docker)

From repo root: `docker compose up api` (runs `composer install` then `php -S`).

## Run (local)

```bash
composer install
cd public && php -S localhost:8080
```

Set `DB_*` and `UI_ORIGIN` in `.env` (see `.env.example`).

## Test

```bash
./vendor/bin/phpunit
```

## Docs

From repo root, see `docs/README.md` and especially `docs/system-reference.md` (routes, schema), `docs/security-program-and-hardening-roadmap.md` (controls and backlog), and `docs/architecture-security-and-threats.md` (diagrams).
