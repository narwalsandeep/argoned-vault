# OSS export tooling (private repo)

Maintainers use this directory to publish mirrors to the public [narwalsandeep/argoned-vault](https://github.com/narwalsandeep/argoned-vault) repository.

**Private repo (`blackbox`):** full monorepo including `website/` and `deploy-vault.yml`.  
**Public OSS export:** excludes `website/`, `docs/`, `.github/` (workflows), internal `pricing` notes; Compose and `api/.env.example` are patched for vault-only stack (no marketing site, OAuth, Stripe/billing, or `ADMIN_EMAIL` template keys).

| File | Purpose |
|------|---------|
| [export-manifest.yml](./export-manifest.yml) | Include/exclude rules (secrets only — no feature stripping) |
| [LICENSE-MIT](./LICENSE-MIT) | Copied to root `LICENSE` on export |
| [README-PUBLIC.md](./README-PUBLIC.md) | Public repo landing page (replaces root `README.md` on export) |
| [SELF-HOST.md](./SELF-HOST.md) | Self-hosting guide (replaces nothing — added at repo root on export) |
| [README-OSS-BANNER.md](./README-OSS-BANNER.md) | Legacy one-line banner (superseded by README-PUBLIC) |
| [scripts/build-export.sh](./scripts/build-export.sh) | Build sanitized export tree |
| [scripts/leak-scan.sh](./scripts/leak-scan.sh) | Fail on secret files / leak patterns |

## Public repository

**GitHub:** [narwalsandeep/argoned-vault](https://github.com/narwalsandeep/argoned-vault)  
**SSH:** `git@github.com:narwalsandeep/argoned-vault.git`

Private repo has remote **`oss-public`** pointing at the public repo (for reference only — publish via CI or bootstrap below).

## One-time bootstrap (if public repo is empty)

From your machine (needs SSH access to `argoned-vault`):

```bash
cd vault   # private clone root
git pull origin main
./oss/scripts/build-export.sh --output /tmp/argoned-vault-bootstrap --ref HEAD
cd /tmp/argoned-vault-bootstrap
git init -b main
git add -A
git commit -m "Initial OSS release v0.1.0"
git remote add origin git@github.com:narwalsandeep/argoned-vault.git
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

After that, use tags on the **private** repo (`oss-v*`) for automated releases. See [GITHUB-SECRETS.md](./GITHUB-SECRETS.md).

## Local preview

```bash
./oss/scripts/build-export.sh --dry-run
./oss/scripts/build-export.sh --output /tmp/argoned-export
```

## Publish a release

1. Merge to `main` (deploys hosted service as today).
2. Tag and push: `git tag oss-v1.0.0 && git push origin oss-v1.0.0`
3. GitHub Actions [publish-oss.yml](../.github/workflows/publish-oss.yml) runs tests, export, leak scan, and pushes to `narwalsandeep/argoned-vault` as `v1.0.0`.

**Required repo secrets:** `OSS_PUBLISH_GITHUB_TOKEN`, optional `OSS_PUBLIC_REPO` (default `narwalsandeep/argoned-vault`).

See [SELF-HOST.md](./SELF-HOST.md) for what self-hosters receive.
