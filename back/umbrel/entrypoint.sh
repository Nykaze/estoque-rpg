#!/bin/bash
set -e

mkdir -p /var/lib/tailscale /data

# Start tailscaled in background
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &
TS_PID=$!
sleep 3

# Authenticate Tailscale (if auth key provided)
if [ -n "$TS_AUTHKEY" ]; then
    echo "Autenticando Tailscale..."
    tailscale up \
        --hostname="${TS_HOSTNAME:-estoque-rpg}" \
        --auth-key="$TS_AUTHKEY" \
        --reset \
        --accept-routes 2>&1 || true
    sleep 2
fi

# Enable Funnel on port 3000
if [ "$TS_FUNNEL" = "true" ]; then
    echo "Ativando Tailscale Funnel na porta 3000..."
    tailscale funnel --bg 3000
    sleep 2
    # Show the public URL
    tailscale funnel status 2>&1 || true
fi

echo "Iniciando aplicacao..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
