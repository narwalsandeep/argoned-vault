# Security Policy

## Supported versions

Security fixes are applied to the latest release on the public [narwalsandeep/argoned-vault](https://github.com/narwalsandeep/argoned-vault) repository and deployed to the managed service at [argoned.com](https://argoned.com).

| Version | Supported |
|---------|-----------|
| Latest tagged release | Yes |
| Older tags | Best effort — upgrade recommended |

## Reporting a vulnerability

**Please do not open public GitHub issues for undisclosed security problems.**

Email security reports to the maintainers (use the contact address published on [argoned.com](https://argoned.com) or your organization's security contact if you are an enterprise customer).

Include:

- Description of the issue and impact
- Steps to reproduce
- Affected version or commit (if known)
- Proof of concept if available

We aim to acknowledge reports within a few business days and will coordinate disclosure timing with you.

## Scope

In scope:

- Argoned Vault application code in this repository (`ui/`, `api/`, `website/`)
- Cryptographic handling of vault data, authentication, and recovery flows
- Server-side authorization and billing webhooks

Out of scope:

- Third-party infrastructure you operate when self-hosting (unless a default configuration in this repo is clearly unsafe)
- Social engineering, denial-of-service against your own deployment without a product defect
- Issues in dependencies without a practical exploit path in this application

## Safe disclosure

- Do not access, modify, or exfiltrate data that is not yours.
- Do not test against the production argoned.com service without prior written permission.

## Security model (summary)

Argoned is designed as a **zero-knowledge vault**: the server stores encrypted blobs and metadata, not vault plaintext. Account login is separate from vault unlock. See [docs/vault-crypto-and-data-lifecycle.md](docs/vault-crypto-and-data-lifecycle.md) and [docs/security-program-and-hardening-roadmap.md](docs/security-program-and-hardening-roadmap.md).
