#!/bin/sh
# O volume persistente chega montado como root. Ajusta o dono do diretorio do
# banco antes de baixar privilegio, senao o SQLite falha com CANTOPEN (14).
set -e

db_dir=$(dirname "${NEXUS_DB_PATH:-/data/nexus.db}")
mkdir -p "$db_dir"
chown -R nexus:nexus "$db_dir"

exec su-exec nexus "$@"
