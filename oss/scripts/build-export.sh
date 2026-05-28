#!/usr/bin/env bash
# Build a sanitized OSS export tree from the private monorepo (full code, secrets excluded).
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
MANIFEST="$REPO_ROOT/oss/export-manifest.yml"

DRY_RUN=0
OUTPUT=""
GIT_REF="HEAD"
SKIP_LEAK_SCAN=0
SKIP_README_PATCH=0

usage() {
  cat <<'EOF'
Usage: build-export.sh [options]

Options:
  --dry-run              Print actions; do not write output (still validates manifest).
  --output DIR           Export destination (required unless --dry-run).
  --ref GIT_REF          Git tree to export (default: HEAD).
  --skip-leak-scan       Skip leak-scan.sh (not for CI).
  --skip-readme-patch    Do not replace README with the public OSS version.
  -h, --help             Show this help.

Example:
  ./oss/scripts/build-export.sh --dry-run
  ./oss/scripts/build-export.sh --output /tmp/argoned-vault-export
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --output) OUTPUT="${2:?--output requires a path}"; shift 2 ;;
    --ref) GIT_REF="${2:?--ref requires a value}"; shift 2 ;;
    --skip-leak-scan) SKIP_LEAK_SCAN=1; shift ;;
    --skip-readme-patch) SKIP_README_PATCH=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "$DRY_RUN" -eq 0 && -z "$OUTPUT" ]]; then
  echo "error: --output is required (or use --dry-run)" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: missing manifest at $MANIFEST" >&2
  exit 1
fi

mapfile -t EXCLUDES < <(awk '
  /^exclude:/ { in_ex=1; next }
  /^[a-zA-Z_]+:/ { in_ex=0 }
  in_ex && /^  - / { sub(/^  - /, ""); print }
' "$MANIFEST")

LICENSE_SRC=$(awk '
  /^add:/ { in_add=1; src=""; dest=""; next }
  /^[a-zA-Z_]+:/ && !/^  / { in_add=0 }
  in_add && /src:/ {
    sub(/^[^:]*src:[[:space:]]*/, "")
    src=$0
  }
  in_add && /dest:/ {
    sub(/^[^:]*dest:[[:space:]]*/, "")
    dest=$0
    if (src != "") {
      print src "|" dest
      exit
    }
  }
' "$MANIFEST")

README_BANNER=$(awk '
  /^patch_readme:/ { sub(/^patch_readme: */, ""); print; exit }
' "$MANIFEST")

README_REPLACE=$(awk '
  /^replace_readme:/ { sub(/^replace_readme: */, ""); print; exit }
' "$MANIFEST")

STRIP_WEBSITE=$(awk '
  /^strip_website:/ { sub(/^strip_website: */, ""); print; exit }
' "$MANIFEST")

mapfile -t REPLACE_PAIRS < <(awk '
  /^replace:/ { in_rep=1; src=""; next }
  /^[a-zA-Z_]+:/ && !/^  / { in_rep=0 }
  in_rep && /src:/ {
    sub(/^[^:]*src:[[:space:]]*/, "")
    src=$0
  }
  in_rep && /dest:/ {
    sub(/^[^:]*dest:[[:space:]]*/, "")
    if (src != "") {
      print src "|" $0
      src=""
    }
  }
' "$MANIFEST")

log() { echo "build-export: $*"; }

apply_excludes() {
  local root=$1
  local pattern rel base name

  for pattern in "${EXCLUDES[@]}"; do
    [[ -z "$pattern" ]] && continue
    case "$pattern" in
      '**/*.pem')
        find "$root" -type f -name '*.pem' -delete
        ;;
      '**/*.key')
        find "$root" -type f -name '*.key' -delete
        ;;
      '**/secrets/**')
        find "$root" -type d -name secrets -exec rm -rf {} + 2>/dev/null || true
        ;;
      'website/**')
        rm -rf "$root/website"
        ;;
      .github/workflows/deploy-vault.yml)
        rm -f "$root/.github/workflows/deploy-vault.yml"
        ;;
      .git/**)
        rm -rf "$root/.git"
        ;;
      *'*'*)
        base="${pattern%%/*}"
        name="${pattern##*/}"
        if [[ "$base" == "**" ]]; then
          find "$root" -type f -name "$name" -delete
        fi
        ;;
      *)
        rel="${pattern#/}"
        if [[ -e "$root/$rel" ]]; then
          rm -rf "$root/$rel"
        fi
        ;;
    esac
  done
}

replace_export_files() {
  local root=$1
  local pair src dest

  for pair in "${REPLACE_PAIRS[@]}"; do
    [[ -z "$pair" ]] && continue
    IFS='|' read -r src dest <<< "$pair"
    if [[ ! -f "$REPO_ROOT/$src" ]]; then
      echo "error: replace source missing: $REPO_ROOT/$src" >&2
      exit 1
    fi
    mkdir -p "$(dirname "$root/$dest")"
    cp "$REPO_ROOT/$src" "$root/$dest"
    log "replaced ${dest} from ${src}"
  done
}

replace_readme() {
  local root=$1
  local source_path=$2
  local readme="$root/README.md"

  [[ -f "$source_path" ]] || return 0
  cp "$source_path" "$readme"
  log "replaced README.md from $(basename "$source_path")"
}

patch_readme() {
  local root=$1
  local banner_path=$2
  local readme="$root/README.md"

  [[ -f "$banner_path" ]] || return 0
  [[ -f "$readme" ]] || return 0

  if grep -q 'Open source (MIT)' "$readme" 2>/dev/null; then
    log "README already has OSS banner; skipping patch"
    return 0
  fi

  local tmp
  tmp=$(mktemp)
  cat "$banner_path" > "$tmp"
  echo "" >> "$tmp"
  cat "$readme" >> "$tmp"
  mv "$tmp" "$readme"
  log "prepended OSS banner to README.md"
}

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "dry-run mode"
  log "repo root: $REPO_ROOT"
  log "git ref: $GIT_REF"
  log "manifest: $MANIFEST"
  log "excludes (${#EXCLUDES[@]}): ${EXCLUDES[*]}"
  log "license add: ${LICENSE_SRC:-(none)}"
  log "replace files (${#REPLACE_PAIRS[@]}): ${REPLACE_PAIRS[*]:-none}"
  log "strip website: ${STRIP_WEBSITE:-false}"
  log "readme replace (legacy): ${README_REPLACE:-(none)}"
  log "readme patch: ${README_BANNER:-(none)}"
  if [[ -n "$LICENSE_SRC" ]]; then
    IFS='|' read -r lic_src lic_dest <<< "$LICENSE_SRC"
    if [[ ! -f "$REPO_ROOT/$lic_src" ]]; then
      echo "error: license source missing: $REPO_ROOT/$lic_src" >&2
      exit 1
    fi
  fi
  for pair in "${REPLACE_PAIRS[@]}"; do
    [[ -z "$pair" ]] && continue
    IFS='|' read -r src _dest <<< "$pair"
    if [[ ! -f "$REPO_ROOT/$src" ]]; then
      echo "error: replace source missing: $REPO_ROOT/$src" >&2
      exit 1
    fi
  done
  if [[ -n "$README_REPLACE" && ! -f "$REPO_ROOT/$README_REPLACE" ]]; then
    echo "error: public README missing: $REPO_ROOT/$README_REPLACE" >&2
    exit 1
  fi
  if [[ -n "$README_BANNER" && ! -f "$REPO_ROOT/$README_BANNER" ]]; then
    echo "error: readme banner missing: $REPO_ROOT/$README_BANNER" >&2
    exit 1
  fi
  log "dry-run OK"
  exit 0
fi

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT"

log "archiving $GIT_REF into $OUTPUT"
git -C "$REPO_ROOT" archive "$GIT_REF" | tar -x -C "$OUTPUT"

apply_excludes "$OUTPUT"

if [[ -n "$LICENSE_SRC" ]]; then
  IFS='|' read -r src dest <<< "$LICENSE_SRC"
  cp "$REPO_ROOT/$src" "$OUTPUT/${dest:-LICENSE}"
  log "added ${dest:-LICENSE} from $src"
fi

if [[ "$SKIP_README_PATCH" -eq 0 && ${#REPLACE_PAIRS[@]} -gt 0 ]]; then
  replace_export_files "$OUTPUT"
elif [[ "$SKIP_README_PATCH" -eq 0 && -n "$README_REPLACE" ]]; then
  replace_readme "$OUTPUT" "$REPO_ROOT/$README_REPLACE"
elif [[ "$SKIP_README_PATCH" -eq 0 && -n "$README_BANNER" ]]; then
  patch_readme "$OUTPUT" "$REPO_ROOT/$README_BANNER"
fi

if [[ "${STRIP_WEBSITE:-}" == "true" ]]; then
  chmod +x "$SCRIPT_DIR/strip-website-export.sh"
  "$SCRIPT_DIR/strip-website-export.sh" "$OUTPUT"
fi

if [[ "$SKIP_LEAK_SCAN" -eq 0 ]]; then
  "$SCRIPT_DIR/leak-scan.sh" "$OUTPUT"
fi

log "export ready at $OUTPUT"
