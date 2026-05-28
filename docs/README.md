# Vault documentation index

Canonical technical documentation for the **Argoned / Blackbox** vault monorepo (`ui/` vault SPA, `website/` marketing Angular site, `api/` Slim PHP, Postgres). Prefer these files over older copies in git history.

| Document | Purpose |
|----------|---------|
| [system-reference.md](./system-reference.md) | **Source of truth** for HTTP routes, Angular routes, database tables, billing, import pipeline, and primary code pointers. |
| [security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md) | **Primary security document:** implemented controls, residual risks by area, prioritized remediation, consolidated release backlog. |
| [architecture-security-and-threats.md](./architecture-security-and-threats.md) | Diagrams, sequences, trust boundaries, browser-extension threat discussion (roadmap items → security program doc). |
| [vault-crypto-and-data-lifecycle.md](./vault-crypto-and-data-lifecycle.md) | Field-level vault/recovery semantics, **as-built** unlock model, profile rotation vs items, recovery artifacts. |
| [account-recovery.md](./account-recovery.md) | **Pre-login emergency lane:** forgot-password vs account recovery, server effects, API gate, and how it **should** evolve (ownership proof). |
| [development-phases-plan.md](./development-phases-plan.md) | Phased delivery plan, risks, testing strategy, and global definition of done. |
| [operations-runbooks.md](./operations-runbooks.md) | Local Docker workflow and EC2 / GitHub Actions deployment. |
| [self-host.md](./self-host.md) | **Self-hosting:** copy `api/.env.example`, Stripe/admin optional, Docker Compose up. |
| [open-source-release-strategy.md](./open-source-release-strategy.md) | **OSS + cloud:** one canonical repo, secrets outside Git, CI/CD layout, mirror vs public flip. |
| [oss-plan.md](./oss-plan.md) | **OSS delivery plan:** two-repo mirror, export manifest, `publish-oss.yml`, phases and checklist. |
| [research-todos-and-backlog.md](./research-todos-and-backlog.md) | Legal/GDPR follow-ups, product TODOs, industry research, import **design** notes (security checklist → security program doc). |
| [free-tier-active-items-policy.md](./free-tier-active-items-policy.md) | **Planned product + security model:** Free tier “choose N active items” after downgrade, server enforcement, export/upgrade paths; file items excluded on Free. |

**Product naming:** UI copy uses *Argoned*; repository and paths often use *vault* or *blackbox*.
