#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"
DEFAULT_ENV_FILE="$INFRA_DIR/.env.example"
PROJECT_ENV_FILE="$INFRA_DIR/.env"

if [[ -f "$PROJECT_ENV_FILE" ]]; then
  COMPOSE_ENV_FILE="$PROJECT_ENV_FILE"
else
  COMPOSE_ENV_FILE="$DEFAULT_ENV_FILE"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command is required." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

usage() {
  cat <<'EOF'
Usage: ./scripts/local-stack.sh <command> [args]

Commands:
  up       Build, start, and wait for frontend, backend, worker, postgres, redis
  down     Stop containers and preserve volumes
  logs     Tail compose logs; pass an optional service name
  ps       Show compose service status
  reset    Stop containers and remove volumes
  config   Print resolved compose configuration
EOF
}

command_name="${1:-up}"

case "$command_name" in
  up)
    compose up --build --wait
    ;;
  down)
    compose down --remove-orphans
    ;;
  logs)
    shift || true
    compose logs -f "$@"
    ;;
  ps)
    compose ps
    ;;
  reset)
    compose down -v --remove-orphans
    ;;
  config)
    compose config
    ;;
  *)
    usage
    exit 1
    ;;
esac