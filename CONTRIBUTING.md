# Contributing to Argoned Vault

Thank you for your interest in contributing. This project is open source under the [MIT License](LICENSE).

## Where to contribute

- **Bug reports and feature requests:** GitHub Issues on [narwalsandeep/argoned-vault](https://github.com/narwalsandeep/argoned-vault)
- **Code changes:** Pull requests against the public repository, or follow maintainer guidance if development happens on a private mirror first

## Development setup

See the root [README.md](README.md):

```bash
cp api/.env.example api/.env
docker compose --env-file ./api/.env up -d --build
```

For UI-only or API-only workflows, see README sections **UI only** and **API only**.

## Pull request guidelines

1. **One concern per PR** when possible — easier to review and revert.
2. **Tests** — add or update unit tests for behavior you change (`ui/**/*.spec.ts`, `api/tests/`).
3. **No secrets** — never commit `api/.env`, keys, or live Stripe credentials. CI leak scans will reject them.
4. **Docs** — update relevant files under `docs/` when behavior, routes, or env vars change.
5. **Style** — match existing patterns in the file you edit (Angular standalone components, Slim PHP services, central CSS in `ui/src/styles/`).

## Security-sensitive changes

Changes to cryptography, authentication, recovery, or billing require extra care:

- Follow [docs/vault-crypto-and-data-lifecycle.md](docs/vault-crypto-and-data-lifecycle.md) and workspace security rules.
- Do not log plaintext vault content, unlock keys, or recovery material.
- Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## OSS releases

Maintainers publish public releases by tagging the private development repository with `oss-vX.Y.Z`. The export pipeline copies the full codebase (minus secret files), adds the MIT `LICENSE`, and pushes to `narwalsandeep/argoned-vault`. Self-hosters configure their own `api/.env`.

## Code of conduct

Be respectful and constructive. Maintainers may close issues or PRs that are abusive, off-topic, or duplicate known work without further discussion.

## Questions

For product and hosting questions, see [argoned.com](https://argoned.com). For self-hosting, see [docs/self-host.md](docs/self-host.md).
