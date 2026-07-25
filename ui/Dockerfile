# Dev server image: libc6-compat helps esbuild / native tooling on Alpine.
FROM node:22-alpine

RUN apk add --no-cache libc6-compat

ENV NG_CLI_ANALYTICS=false

WORKDIR /app
