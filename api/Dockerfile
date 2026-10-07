# Debian Bookworm CLI (official images use -bookworm, not -bookworm-slim).
FROM php:8.3-cli-bookworm

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends curl git unzip libpq5 libpq-dev; \
  docker-php-ext-install -j"$(nproc)" pdo pdo_pgsql; \
  apt-mark manual libpq5; \
  apt-get purge -y --auto-remove libpq-dev; \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app
