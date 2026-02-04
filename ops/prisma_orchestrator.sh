#!/usr/bin/env bash
set -euo pipefail

# Permite ejecutar comandos de Prisma dentro del contenedor backend.
# Uso: ./ops/prisma_orchestrator.sh [migrate|push|seed|studio]

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR%/ops}"
cd "$PROJECT_ROOT"

COMPOSE_CMD=${DOCKER_COMPOSE_CMD:-"docker compose"}
SERVICE_NAME=${PRISMA_SERVICE:-"backend"}

command=${1:-migrate}
case "$command" in
  migrate)
    prisma_cmd="npx prisma migrate deploy"
    ;;
  push)
    prisma_cmd="npx prisma db push"
    ;;
  seed)
    prisma_cmd="npx prisma db seed"
    ;;
  studio)
    prisma_cmd="npx prisma studio"
    ;;
  *)
    echo "Comando desconocido: $command"
    echo "Uso: $0 [migrate|push|seed|studio]"
    exit 1
    ;;
esac

set +e
$COMPOSE_CMD exec "$SERVICE_NAME" sh -c "$prisma_cmd"
status=$?
set -e

if [ $status -ne 0 ]; then
  echo "Error al ejecutar Prisma dentro del contenedor ($command)."
  exit $status
fi

echo "Comando Prisma '$command' ejecutado correctamente en el contenedor '$SERVICE_NAME'."
