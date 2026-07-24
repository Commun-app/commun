#!/usr/bin/env bash
# One-command dev launcher — `bun run dev`.
# Boots the API (:3001) AND the admin front (:3000) against a repo-local
# sandboxed COMMUN_DATA_DIR, so dev data never lands in the operator's real
# ~/.commun directory.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
data_dir="${COMMUN_DATA_DIR:-$repo_root/.data}"
mkdir -p "$data_dir"

export COMMUN_DATA_DIR="$data_dir"
# The dev worker bundles core sources — the migrations folder cannot be
# resolved relatively from there, so pin it explicitly.
export COMMUN_MIGRATIONS_DIR="$repo_root/packages/core/drizzle"

# S3 factice par défaut : le presign fonctionne hors-ligne (les images ne se
# chargeront simplement pas). Surchargez avec de vraies créds (ou MinIO)
# pour tester les médias de bout en bout.
export COMMUN_S3_BUCKET="${COMMUN_S3_BUCKET:-commun-dev}"
export COMMUN_S3_ACCESS_KEY="${COMMUN_S3_ACCESS_KEY:-dev-offline}"
export COMMUN_S3_SECRET_KEY="${COMMUN_S3_SECRET_KEY:-dev-offline}"
export COMMUN_S3_ENDPOINT="${COMMUN_S3_ENDPOINT:-http://127.0.0.1:9000}"
export COMMUN_S3_REGION="${COMMUN_S3_REGION:-fr-par}"

# L'admin (Nuxt) consomme l'API locale.
export NUXT_ENV_API_URL="${NUXT_ENV_API_URL:-http://127.0.0.1:3001}"

cat <<EOF

Commun dev sandbox
  COMMUN_DATA_DIR  $data_dir
  api              http://127.0.0.1:3001   (health: /health, tRPC: /api/trpc)
  admin            http://localhost:3000

EOF

# Garde-fou : une base sans utilisateur rend la connexion à l'admin impossible
# (pas encore de bootstrap « premier admin » — les comptes viennent de la
# migration legacy).
user_count="$(bun -e "try{const{Database}=require('bun:sqlite');const db=new Database('$data_dir/commun.db',{readonly:true});console.log(db.query('SELECT count(*) c FROM users').get().c)}catch{console.log(0)}" 2>/dev/null || echo 0)"
if [ "${user_count:-0}" = "0" ]; then
  cat <<EOF
  ⚠️  Aucun compte utilisateur dans cette base : la connexion à l'admin
      échouera (401). Pour tester sur les données grigny migrées :
        COMMUN_DATA_DIR=$repo_root/.dump/smoke-grigny bun run dev

EOF
fi

# --bun is load-bearing: nitro's CLI has a Node shebang but core imports bun:sqlite.
(cd "$repo_root/apps/api" && exec bun --bun nitro dev) &
api_pid=$!
(cd "$repo_root/apps/admin" && exec bun run dev) &
admin_pid=$!

# Un Ctrl+C arrête les deux processus.
trap 'kill "$api_pid" "$admin_pid" 2>/dev/null; wait' EXIT INT TERM
wait
