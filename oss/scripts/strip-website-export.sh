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

    remove_prefixes = (
        "OAUTH_",
        "STRIPE_",
        "BILLING_",
        "ADMIN_EMAIL=",
    )
    remove_keys = (
        "VAULT_REQUIRE_NON_FREE_PLAN_FOR_IMPORT_AND_FILES=",
        "UI_SHOW_LIFETIME_PRICING=",
    )
    section_starts = (
        "# --- OAuth sign-in",
        "# Stripe (optional)",
    )

    def is_removable_config(stripped: str) -> bool:
        return any(stripped.startswith(p) for p in remove_prefixes) or any(
            stripped.startswith(k) for k in remove_keys
        )

    def is_section_starter(stripped: str) -> bool:
        return any(stripped.startswith(s) for s in section_starts)

    def is_oss_strip_comment(stripped: str) -> bool:
        if not stripped.startswith("#"):
            return False
        low = stripped.lower()
        keywords = (
            "oauth",
            "stripe",
            "billing",
            "payment link",
            "admin_email",
            "/api/v1/admin",
            "customers in the app",
            "lifetime tier",
            "price_",
            "webhook",
            "hosted (argoned.com)",
            "oss publish credentials",
        )
        return any(k in low for k in keywords)

    in_section = False
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if line.startswith("WEBSITE_PORT="):
            i += 1
            continue
        if "WEBSITE_PORT" in line and stripped.startswith("#"):
            i += 1
            continue

        if stripped.startswith("# Public URL of this API") and "OAuth" in line:
            out.append(
                "# Public URL of this API as seen by the browser (scheme + host + port, no trailing slash).\n"
            )
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("API_PUBLIC_BASE_URL="):
                i += 1
            continue

        if is_section_starter(stripped):
            in_section = True
            i += 1
            continue

        if in_section:
            if stripped == "" or stripped.startswith("#") or is_removable_config(stripped):
                i += 1
                continue
            in_section = False

        if is_removable_config(stripped) or is_oss_strip_comment(stripped):
            i += 1
            continue

        out.append(line)
        i += 1

    text = "".join(out)
    # Collapse runs of 3+ blank lines to 2.
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    oss_intro = (
        "# Copy to `api/.env` and adjust values. This file is the single env template: there is no repo-root `.env`.\n"
        "#\n"
        "# Docker Compose: from the repository root run `docker compose --env-file ./api/.env …` so\n"
        "# ${UI_PORT} and ${API_PORT} in `docker-compose.yml` match this file. Postgres host port **5454**.\n"
        "#\n"
    )
    if text.startswith("# Copy to"):
        first_blank = text.find("\n\n")
        if first_blank != -1:
            text = oss_intro + text[first_blank + 2 :]

    path.write_text(text)
    print(f"strip-website: patched {path.relative_to(root)}")


def validate_env_example(path: Path) -> None:
    if not path.is_file():
        return
    text = path.read_text()
    forbidden = (
        "OAUTH_",
        "STRIPE_",
        "BILLING_",
        "ADMIN_EMAIL=",
        "VAULT_REQUIRE_NON_FREE_PLAN_FOR_IMPORT_AND_FILES",
        "UI_SHOW_LIFETIME_PRICING",
    )
    for needle in forbidden:
        if needle in text:
            raise SystemExit(
                f"strip-website: forbidden OSS env key still in api/.env.example: {needle}"
            )


patch_compose(root / "docker-compose.yml")
patch_compose(root / "docker-compose.prod.yml")
patch_env_example(root / "api" / ".env.example")
validate_env_example(root / "api" / ".env.example")

if (root / "website").exists():
    raise SystemExit(f"strip-website: website/ still present in export")

print("strip-website: OK")
PY
