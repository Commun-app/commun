#!/usr/bin/env bash
# CI guard: no opencorp residue may survive in Commun sources (task 1.4 of the
# scaffold-monorepo change). Exits 1 and lists offenders if any are found.
set -uo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
matches=$(grep -ril opencorp \
  --include='*.ts' --include='*.vue' --include='*.json' --include='*.sh' \
  --include='*.yaml' --include='*.yml' --include='*.md' --include='*.feature' \
  "$repo_root/apps" "$repo_root/packages" "$repo_root/scripts" \
  "$repo_root/e2e" "$repo_root/docs/docs" "$repo_root/docs/.config" \
  "$repo_root/package.json" "$repo_root/playwright.config.ts" \
  "$repo_root/tsconfig.base.json" "$repo_root/.env.example" 2>/dev/null \
  | grep -v node_modules | grep -v check-naming.sh)

if [[ -n "$matches" ]]; then
  echo "opencorp residue found in:"
  echo "$matches"
  exit 1
fi
echo "naming check OK — no opencorp residue"
