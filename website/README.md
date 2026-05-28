# Argoned marketing site

Angular + Tailwind v4 marketing pages that ship **inside the vault monorepo** (`vault/website/`). They run as the **`website`** Docker Compose service alongside `ui`, `api`, and `db`.

## Commands

From `vault/website/` (or use Compose dev service — see root `docker-compose.yml`):

```bash
npm install
npm start              # ng serve → http://localhost:4200
npm run build          # production output: dist/website/browser
npm run build:prod     # explicit production configuration (used by Docker prod image)
```

Production deploy is **`vault/.github/workflows/deploy-vault.yml`** (same stack as the vault app): EC2 runs `docker compose … build/up` including this image.

## Pages

| Route        | Content |
|-------------|---------|
| `/`         | Hero, product summary, recovery |
| `/product`  | Product depth |
| `/security` | Security posture |
| `/faq`      | FAQs |
| `/founders` | Founders |
| `/company`  | Company |
| `/contact`  | Contact |
| `/terms`    | Terms |
| `/privacy`  | Privacy |

CTAs link to the vault app (e.g. `https://vault.argoned.com`). Styling tokens align with `vault/ui`.
