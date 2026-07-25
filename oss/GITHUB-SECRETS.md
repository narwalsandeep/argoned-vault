# GitHub secrets for OSS publish

Configure on the **private** repo (`narwalsandeep/blackbox`) → **Settings → Secrets and variables → Actions**.

| Secret | Value |
|--------|--------|
| `OSS_PUBLISH_GITHUB_TOKEN` | PAT with **push (Contents write)** on `narwalsandeep/argoned-vault` — see below |
| `OSS_PUBLIC_REPO` | `narwalsandeep/argoned-vault` (optional — workflow default matches this) |

---

## Fix: `403 Permission denied to narwalsandeep`

The workflow reached the push step but the token **cannot write** to the public repo. GitHub authenticated you as `narwalsandeep`, but the PAT lacks **Contents: Read and write** on **`argoned-vault`**.

### Option A — Fine-grained PAT (recommended)

1. GitHub → your avatar → **Settings**
2. **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
3. Set:
   - **Token name:** `blackbox-oss-publish`
   - **Expiration:** 90 days or 1 year
   - **Resource owner:** `narwalsandeep` (your user)
   - **Repository access:** **Only select repositories** → check **`argoned-vault`**
4. **Repository permissions** (this is what most people get wrong):

   | Permission | Required? | Why |
   |------------|-----------|-----|
   | **Contents** | **Read and write** | **`git push` to `main` and tags — without this you get 403** |
   | Metadata | Read (automatic) | Repo lookup |
   | Actions | Not needed | — |
   | Workflows | **Not needed for push** | Editing workflow YAML via API only |
   | Administration | **Not needed for push** | Repo settings only |
   | Pull requests | Not needed | — |

   **Do not** rely on *Workflows* or *Administration* — they do **not** allow pushing code.
5. **Generate token** → copy the value once (`github_pat_…`)

Update the secret on **`narwalsandeep/blackbox`**:

**Settings → Secrets and variables → Actions → `OSS_PUBLISH_GITHUB_TOKEN` → Update**

Paste the new token with **no extra spaces or newlines**.

### Option B — Classic PAT

1. **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**
2. Scopes: check **`public_repo`** (enough for public `argoned-vault`)
3. Save as `OSS_PUBLISH_GITHUB_TOKEN` on `blackbox`

### Common mistakes

| Mistake | Result |
|---------|--------|
| Token only has **Contents: Read** | 403 on push |
| Token has **Workflows** / **Administration** but **not Contents** | 403 on push (common mistake) |
| Repo `argoned-vault` not selected on fine-grained token | 403 |
| Token created before repo existed — repo never added | 403 |
| Secret not set on **blackbox** (private repo) | fails earlier |
| Using `GITHUB_TOKEN` (default Actions token) | cannot push to another repo |
| Trailing newline in secret value | auth failures |

### Verify locally (optional)

```bash
export GH_TOKEN=github_pat_your_token_here
gh auth status
gh repo view narwalsandeep/argoned-vault
# Should print repo info, not "404" or "403"
```

---

## Publish after fixing the secret

Re-run the failed workflow in Actions, **or** push a new tag:

```bash
git tag oss-v0.3.2
git push origin oss-v0.3.2
```

No code changes needed — only the secret.
