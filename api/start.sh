#!/usr/bin/env bash
# Levanta la API: crea el entorno virtual si falta, instala dependencias y arranca uvicorn.
# Uso: ./start.sh [argumentos extra de uvicorn, por ejemplo --reload]
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-8000}"

if [ ! -x .venv/bin/python ]; then
  if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))'; then
    echo "Se necesita Python 3.11 o posterior (encontrado: $(python3 --version 2>&1))." >&2
    exit 1
  fi
  echo "Creando el entorno virtual en api/.venv…"
  python3 -m venv .venv
fi

# Reinstala solo si requirements.txt cambió desde la última instalación
if ! cmp -s requirements.txt .venv/.requirements.txt; then
  echo "Instalando dependencias…"
  .venv/bin/python -m pip install --quiet -r requirements.txt
  cp requirements.txt .venv/.requirements.txt
fi

echo "API en http://localhost:$PORT (documentación en /docs). Ctrl+C para detenerla."
exec .venv/bin/uvicorn app.main:app --port "$PORT" "$@"
