# Open source release and cloud deploy (same codebase)

This describes the **simplest durable pattern** for shipping **one full codebase** as both (a) what you deploy to the cloud and (b) what the community can clone and run—without maintaining two divergent trees.

---

## What you want

- **Production:** `main` (or release tags) deploys to your cloud via CI/CD (as today).
- **Open source:** The **same repository and same commits**—no stripped-down fork required for parity.
- **Future updates:** One branch workflow; releases are tagged versions, not manual copies.

---

## Recommended approach (simplest): public canonical repo + secrets only in CI / hosts

**Rule:** The Git repo contains **no secrets**—only `.env.example`, documented variables, and Docker/compose files. Production values live in **GitHub Actions secrets**, **environment-specific env files on the server**, or a **secret manager**—never committed.

1. **Make the vault monorepo’s canonical remote public** (rename/move repo if needed). Your existing deploy workflow (`deploy-vault.yml` → EC2, etc.) keeps working; it already pulls from Git and injects runtime config outside the tree (see [operations-runbooks.md](./operations-runbooks.md)).
2. **Treat `.env.example` as the contract** for self-hosters: copy → `.env`, fill values. Your cloud deploy fills the same variables from secured storage.
3. **Add an explicit `LICENSE`** at the repo root (pick explicitly: e.g. MIT for permissive use, AGPL/SSPL if you require derivatives to stay open—product/legal choice).
4. **Versioning:** Tag releases (`v1.0.0`, …). GitHub **Releases** + optional **OCI images** (GHCR) give OSS users something stable to pin without relying only on `main`.

This matches how many infra/product teams ship: **one public repo**, **commercial value** is hosted offering + support + ops—not a hidden second codebase.

---

## CI/CD shape (conceptual)

Keep concerns separated so forks and contributors stay safe:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | PR + push to `main` | Tests (PHP, Angular), lint, build artifacts—no deploy secrets needed for fork PRs if jobs avoid deploy steps. |
| **Deploy** | Push to `main` (protected) or manual `workflow_dispatch` | Uses GitHub **Environment** `production` (or similar) with secrets: SSH key, host paths, registry tokens. Only maintainers merge to `main`. |
| **Release** | Tag `v*` | Optional: attach tarballs, publish Docker images to GHCR, generate changelog. |

**Important:** Deploy jobs should **not** rely on secrets embedded in the repo—only on GitHub/cloud secrets and server-side `.env`.

---

## If you must keep a **private** repo today

Some teams start private then publish later; others keep a private monorepo for compliance.

**Option A — Automated mirror (same commits):**

- Add a workflow that on push to `main` **mirrors** to `github.com/your-org/blackbox-public` (read-only public copy).
- Use a **machine user PAT** or GitHub App with least privilege; branch protection on public repo optional.
- **Caveat:** If the mirror fails, public lags—monitor the workflow.

**Option B — Flip visibility once**

- After secret scanning (`git-secrets`, TruffleHog, GitHub secret scanning), rotate anything ever leaked, then **make the repo public** and delete the mirror—simplest long-term.

Avoid maintaining **two repos edited by hand**—they will drift.

---

## How other companies tend to structure this

- **Single public repo + env-only configuration:** Common for self-hostable apps (same Docker Compose / Helm; prod is “same bits, different env”).
- **Open core:** Core OSS repo + **private** enterprise plugins—**not** what you asked for (you want full parity).
- **Periodic OSS dumps:** Sometimes used for compliance—usually worse for updates than one source of truth.

---

## Safety checklist before going public

1. Run secret scanners on full history; **rotate** any leaked keys (Stripe, DB, OAuth client secrets, SMTP).
2. Confirm **no prod URLs or internal hostnames** are required in tracked files—or document them as examples only.
3. `.gitignore`: ensure `.env`, `.pem`, key exports stay ignored (already standard).
4. **Branch protection** on `main`: required reviews, CI green.

---

## Future updates (single stream)

- **`main`** stays the integration branch; production tracks it or release tags.
- **Semver tags** for distributions consumers can pin (`v2.3.1`).
- Optional **`CHANGELOG.md`** for human-readable release notes.

This keeps **one engineering workflow**: merge → CI → deploy → tag release—without a separate “OSS packaging” step beyond LICENSE + docs + tagged releases.
