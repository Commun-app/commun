#!/usr/bin/env bash
# One-command dev launcher — `bun run dev`.
# Boots the API (:3001) against a repo-local sandboxed COMMUN_DATA_DIR, so dev
# data never lands in the operator's real ~/.commun directory.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
data_dir="${COMMUN_DATA_DIR:-$repo_root/.data}"
mkdir -p "$data_dir"

cat <<EOF

Commun dev sandbox
  COMMUN_DATA_DIR  $data_dir
  api              http://127.0.0.1:3001   (health: /health, tRPC: /api/trpc)

EOF

export COMMUN_DATA_DIR="$data_dir"

# --bun is load-bearing: nitro's CLI has a Node shebang but core imports bun:sqlite.
cd "$repo_root/apps/api" && exec bun --bun nitro dev
