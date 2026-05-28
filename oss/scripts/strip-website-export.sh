#!/usr/bin/env bash
# Remove marketing website from an OSS export tree (compose + env template only).
# Private repo keeps website/; this runs on the export directory after excludes.
set -euo pipefail

ROOT="${1:?usage: strip-website-export.sh <export-root>}"

python3 - "$ROOT" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])


def remove_compose_service(text: str, service: str) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    skipping = False
    service_re = re.compile(rf"^  {re.escape(service)}:\s*$")
    next_service_re = re.compile(r"^  [a-zA-Z0-9_-]+:\s*$")
    for line in lines:
        if service_re.match(line):
            skipping = True
            continue
        if skipping:
            if next_service_re.match(line):
                skipping = False
                out.append(line)
            continue
        out.append(line)
    return "".join(out)


def remove_volume(text: str, volume: str) -> str:
    return re.sub(rf"^  {re.escape(volume)}:\s*\n", "", text, flags=re.MULTILINE)


def patch_compose(path: Path) -> None:
    if not path.is_file():
        return
    text = path.read_text()
    text = remove_compose_service(text, "website")
    text = remove_volume(text, "website_node_modules")
    text = text.replace("ui`, `website`, `api`, `db`", "ui`, `api`, `db`")
    text = text.replace("ui, website, api, db", "ui, api, db")
    text = text.replace("Static SPAs (ui, website):", "Static SPA (ui):")
    text = text.replace(", `ui`, and `website` services", ", `ui` services")
    text = text.replace("The `ui` and `website` services receive", "The `ui` service receives")
    text = text.replace("${WEBSITE_PORT}", "")
    text = text.replace("WEBSITE_PORT, ", "")
    text = text.replace(", WEBSITE_PORT", "")
    path.write_text(text)
    print(f"strip-website: patched {path.relative_to(root)}")


def patch_env_example(path: Path) -> None:
    if not path.is_file():
        return
    lines = path.read_text().splitlines(keepends=True)
    out: list[str] = []
    skip_block = False
    for line in lines:
        if line.startswith("WEBSITE_PORT="):
            continue
        if "WEBSITE_PORT" in line and line.strip().startswith("#"):
            continue
        out.append(line)
    path.write_text("".join(out))
    print(f"strip-website: patched {path.relative_to(root)}")


patch_compose(root / "docker-compose.yml")
patch_compose(root / "docker-compose.prod.yml")
patch_env_example(root / "api" / ".env.example")

if (root / "website").exists():
    raise SystemExit(f"strip-website: website/ still present in export")

print("strip-website: OK")
PY
