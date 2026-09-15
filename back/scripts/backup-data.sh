#!/bin/bash
# Snapshot dos dados de produção do Estoque RPG (volume /data) para ~/estoque-rpg-backups
# Uso: bash scripts/backup-data.sh   (no diretório do projeto, no Umbrel)
set -e
BACKUP_DIR="${BACKUP_DIR:-$HOME/estoque-rpg-backups}"
KEEP="${KEEP:-10}"

if ! docker ps --format '{{.Names}}' | grep -qx estoque-rpg; then
  echo "AVISO: container 'estoque-rpg' nao esta rodando. Nada a fazer." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

docker cp estoque-rpg:/data/. "$TMP/"
tar -czf "$BACKUP_DIR/snap-$TS.tgz" -C "$TMP" .
rm -rf "$TMP"
trap - EXIT

echo "Backup criado: $BACKUP_DIR/snap-$TS.tgz"
ls -lh "$BACKUP_DIR"

# manter apenas os últimos K snapshots
ls -1t "$BACKUP_DIR"/snap-*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f