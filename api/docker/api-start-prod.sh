#!/bin/sh
set -eu
cd /app

export API_PORT="${API_PORT:-3003}"

if [ ! -f /etc/nginx/nginx.conf.template ]; then
  echo "Missing /etc/nginx/nginx.conf.template" >&2
  exit 1
fi

envsubst '${API_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t

# Runtime deps only — migrations run via `docker compose run --entrypoint '' … composer migrate`
composer install --no-interaction --no-dev --optimize-autoloader --prefer-dist

exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
