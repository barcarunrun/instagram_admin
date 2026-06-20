#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"
MIGRATIONS_DIR="$INFRA_DIR/migrations"
SEED_FILE="$INFRA_DIR/seed.sql"

compose_exec() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U instagram -d instagram_ops "$@"
}

apply_file() {
  local file_path="$1"
  echo "Applying $(basename "$file_path")"
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U instagram -d instagram_ops < "$file_path"
}

usage() {
  cat <<'EOF'
Usage: ./scripts/local-db.sh <command>

Commands:
  migrate    Apply SQL files under infra/migrations in lexical order
  seed       Apply infra/seed.sql
  bootstrap  Run migrate and then seed
  tables     Show public tables
EOF
}

command_name="${1:-bootstrap}"

case "$command_name" in
  migrate)
    for migration in "$MIGRATIONS_DIR"/*.sql; do
      apply_file "$migration"
    done
    ;;
  seed)
    apply_file "$SEED_FILE"
    ;;
  bootstrap)
    "$0" migrate
    "$0" seed
    ;;
  tables)
    compose_exec -c '\dt public.*'
    ;;
  *)
    usage
    exit 1
    ;;
esac