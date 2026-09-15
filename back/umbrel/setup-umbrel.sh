#!/bin/bash
# Setup do Estoque RPG no Umbrel via Docker + Tailscale Funnel
# Rodar como: bash setup-umbrel.sh
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "=== Estoque RPG - Setup Umbrel ==="
echo ""

# 1. Check Docker
if ! command -v docker &>/dev/null; then
    echo "Docker nao encontrado. Instalando..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "Docker instalado. Faça logout e login novamente, ou rode: newgrp docker"
fi

if ! docker compose version &>/dev/null; then
    echo "ERRO: docker compose nao disponivel"
    exit 1
fi

echo "Docker OK: $(docker --version)"

# 2. Check .env
if [ ! -f .env ]; then
    echo ""
    echo "Arquivo .env nao encontrado."
    echo "Copie .env.example para .env e preencha a TS_AUTHKEY:"
    echo "  cp umbrel/.env.example .env"
    echo "  nano .env"
    echo ""
    echo "Obtenha a chave em: https://login.tailscale.com/admin/settings/keys"
    exit 1
fi

source .env
if [ -z "$TS_AUTHKEY" ] || [[ "$TS_AUTHKEY" == *"CHAVE_AQUI"* ]]; then
    echo "ERRO: TS_AUTHKEY nao configurada no .env"
    exit 1
fi

echo "TS_AUTHKEY: ${TS_AUTHKEY:0:15}..."

# 3. Build & Start
echo ""
echo "Buildando imagem Docker..."
docker compose build --no-cache

echo ""
echo "Iniciando container..."
docker compose up -d

echo ""
echo "Aguardando Tailscale conectar..."
sleep 10

# 4. Show status
echo ""
echo "=== Status ==="
docker compose ps
echo ""

# Show Funnel URL
echo "Verificando Tailscale Funnel..."
FUNNEL_URL=$(docker exec estoque-rpg tailscale funnel status 2>&1 || true)
echo "$FUNNEL_URL"

echo ""
echo "=== Setup completo ==="
echo "Container: estoque-rpg"
echo "Porta local: http://localhost:3000"
echo "Tailscale Funnel: https://estoque-rpg.$(docker exec estoque-rpg tailscale status --json 2>/dev/null | grep -o '"DomainName":"[^"]*"' | cut -d'"' -f4 || echo 'FALHOU')/"
echo ""
echo "Para ver logs: docker compose logs -f"
echo "Para parar:    docker compose down"
echo "Para reiniciar: docker compose restart"
