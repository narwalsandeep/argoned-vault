#!/usr/bin/env bash
# Fail if the export tree contains secret files or common leak patterns.
set -euo pipefail

ROOT="${1:?usage: leak-scan.sh <export-root>}"

fail() {
  echo "leak-scan: $*" >&2
  exit 1
}

# Block committed env files (templates are allowed).
while IFS= read -r -d '' f; do
  case "$f" in
    */.env.example|*/api/.env.example) continue ;;
    */.env|*/.env.local|*/.env.production)
      fail "forbidden env file: ${f#"$ROOT"/}"
      ;;
  esac
done < <(find "$ROOT" -type f \( -name '.env' -o -name '.env.local' -o -name '.env.production' \) -print0 2>/dev/null)

# Private key material by extension.
while IFS= read -r -d '' f; do
  fail "forbidden key file: ${f#"$ROOT"/}"
done < <(find "$ROOT" -type f \( -name '*.pem' -o -name '*.key' \) -print0 2>/dev/null)

# Private docs tree, pricing notes, and CI workflows must not ship in OSS export.
[[ -d "$ROOT/docs" ]] && fail "forbidden directory: docs/"
[[ -f "$ROOT/pricing" ]] && fail "forbidden file: pricing"
[[ -d "$ROOT/.github" ]] && fail "forbidden directory: .github/"

# Stripe live secret keys.
if grep -R -l -E 'sk_live_[0-9a-zA-Z]+' "$ROOT" \
  --exclude='LICENSE' \
  --exclude='*.md' \
  --exclude='leak-scan.sh' \
  --exclude='build-export.sh' \
  --exclude='export-manifest.yml' \
  2>/dev/null | head -n 1 | grep -q .; then
  match=$(grep -R -l -E 'sk_live_[0-9a-zA-Z]+' "$ROOT" \
    --exclude='LICENSE' \
    --exclude='*.md' \
    --exclude='leak-scan.sh' \
    --exclude='build-export.sh' \
    --exclude='export-manifest.yml' \
    2>/dev/null | head -n 1)
  fail "Stripe live key pattern matched: ${match#"$ROOT"/}"
fi

# Content patterns — require PEM envelope (BEGIN + END) to avoid UI placeholder false positives.
if grep -R -l -E 'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY' "$ROOT" \
  --exclude='LICENSE' \
  --exclude='*.md' \
  --exclude='leak-scan.sh' \
  --exclude='build-export.sh' \
  --exclude='export-manifest.yml' \
  2>/dev/null | while read -r f; do
    if grep -qE 'END (RSA |OPENSSH |EC )?PRIVATE KEY' "$f" 2>/dev/null; then
      echo "$f"
    fi
  done | head -n 1 | grep -q .; then
  match=$(grep -R -l -E 'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY' "$ROOT" \
    --exclude='LICENSE' \
    --exclude='*.md' \
    --exclude='leak-scan.sh' \
    --exclude='build-export.sh' \
    --exclude='export-manifest.yml' \
    2>/dev/null | while read -r f; do
      grep -qE 'END (RSA |OPENSSH |EC )?PRIVATE KEY' "$f" && echo "$f"
    done | head -n 1)
  fail "PEM private key block found: ${match#"$ROOT"/}"
fi

echo "leak-scan: OK (${ROOT})"
