#!/bin/sh
# O volume persistente chega montado como root. Ajusta o dono do diretorio do
# banco antes de baixar privilegio, senao o SQLite falha com CANTOPEN (14).
# Falhas aqui nao podem derrubar o container: se o chown ou o su-exec nao
# estiverem disponiveis, segue como root em vez de morrer sem log.

db_dir=$(dirname "${NEXUS_DB_PATH:-/data/nexus.db}")
echo "[entrypoint] preparando $db_dir (uid=$(id -u))"

mkdir -p "$db_dir" 2>/dev/null || true
chown -R nexus:nexus "$db_dir" 2>/dev/null || echo "[entrypoint] chown falhou, seguindo mesmo assim"

if [ "$(id -u)" = "0" ] && command -v su-exec >/dev/null 2>&1; then
  echo "[entrypoint] iniciando como nexus: $*"
  exec su-exec nexus "$@"
fi

echo "[entrypoint] iniciando sem troca de usuario: $*"
exec "$@"
