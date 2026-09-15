# Deploy Estoque RPG para Umbrel
# Rodar do Windows: .\deploy-umbrel.ps1
$ErrorActionPreference = 'Stop'

$UMBREL_HOST = 'umbrel@umbrel.local'
$REMOTE_DIR  = '/home/umbrel/estoque-rpg'
$LOCAL_ROOT  = $PSScriptRoot
$ROOT_ROOT   = Split-Path $PSScriptRoot -Parent

Write-Host "=== Deploy Estoque RPG -> Umbrel ==="

# Create remote directory
Write-Host "Criando diretorios remotos..."
ssh $UMBREL_HOST "mkdir -p $REMOTE_DIR/umbrel $REMOTE_DIR/public $REMOTE_DIR/scripts"

# SCP essential files
$files = @(
    @{ local = "$LOCAL_ROOT\deploy-app.js";        remote = "$REMOTE_DIR/server.js" },
    @{ local = "$ROOT_ROOT\public\app.js";        remote = "$REMOTE_DIR/public/app.js" },
    @{ local = "$ROOT_ROOT\public\style.css";     remote = "$REMOTE_DIR/public/style.css" },
    @{ local = "$ROOT_ROOT\public\index.html";    remote = "$REMOTE_DIR/public/index.html" },
    @{ local = "$ROOT_ROOT\public\login.html";    remote = "$REMOTE_DIR/public/login.html" },
    @{ local = "$ROOT_ROOT\public\login.js";      remote = "$REMOTE_DIR/public/login.js" },
    @{ local = "$LOCAL_ROOT\umbrel\Containerfile"; remote = "$REMOTE_DIR/umbrel/Containerfile" },
    @{ local = "$LOCAL_ROOT\umbrel\supervisord.conf"; remote = "$REMOTE_DIR/umbrel/supervisord.conf" },
    @{ local = "$LOCAL_ROOT\umbrel\entrypoint.sh"; remote = "$REMOTE_DIR/umbrel/entrypoint.sh" },
    @{ local = "$LOCAL_ROOT\umbrel\.env.example";  remote = "$REMOTE_DIR/umbrel/.env.example" },
    @{ local = "$LOCAL_ROOT\umbrel\setup-umbrel.sh"; remote = "$REMOTE_DIR/umbrel/setup-umbrel.sh" },
    @{ local = "$LOCAL_ROOT\docker-compose.yml";   remote = "$REMOTE_DIR/docker-compose.yml" },
    @{ local = "$LOCAL_ROOT\scripts\seed-users.js"; remote = "$REMOTE_DIR/scripts/seed-users.js" },
    @{ local = "$LOCAL_ROOT\scripts\backup-data.sh"; remote = "$REMOTE_DIR/scripts/backup-data.sh" },
    @{ local = "$LOCAL_ROOT\package.json";         remote = "$REMOTE_DIR/package.json" }
)

foreach ($f in $files) {
    scp -q $f.local "${UMBREL_HOST}:$($f.remote)"
    Write-Host "  $($f.local.Split('\')[-1]) -> $($f.remote)"
}

# Upload complete public/ (frontend Svelte: assets/, js/, vendor/, login.*)
Write-Host "  public/ (completo) -> $REMOTE_DIR/public/"
scp -q -r "$ROOT_ROOT\public\." "${UMBREL_HOST}:$REMOTE_DIR/public/"

# Upload existing data.json if present
$dataFile = "$LOCAL_ROOT\data\data.json"
if (Test-Path $dataFile) {
    Write-Host "  data.json (existente) -> $REMOTE_DIR/data.json"
    scp -q $dataFile "${UMBREL_HOST}:$REMOTE_DIR/data.json"
} else {
    Write-Host "  data.json nao encontrado (sera criado no primeiro acesso)"
}

Write-Host ""
Write-Host "=== Proximos passos ==="

# Check if .env already exists remotely
$hasEnv = ssh $UMBREL_HOST "test -f $REMOTE_DIR/.env && echo yes || echo no"
if ($hasEnv -eq "yes") {
    Write-Host ""
    Write-Host "Backup dos dados antes do rebuild..."
    ssh $UMBREL_HOST "bash $REMOTE_DIR/scripts/backup-data.sh || echo 'AVISO: backup falhou (container parado?)'"
    Write-Host ""
    Write-Host "Arquivos enviados. Reconstruindo container..."
    ssh $UMBREL_HOST "cd $REMOTE_DIR && docker compose build && docker compose up -d --force-recreate"
    Write-Host ""
    Write-Host "Container reconstruido!"
    Write-Host ""
    # Check if users.json exists inside the container
    $hasUsers = ssh $UMBREL_HOST "docker exec estoque-rpg test -f /data/users.json 2>/dev/null && echo yes || echo no"
    if ($hasUsers -eq "no") {
        Write-Host ""
        Write-Host "Nenhum users.json encontrado. Execute o seed para criar usuarios:"
        Write-Host ""
        Write-Host "  ssh $UMBREL_HOST"
        Write-Host "  cd $REMOTE_DIR"
        Write-Host "  docker exec -it estoque-rpg node scripts/seed-users.js"
        Write-Host ""
        Write-Host "  (ou crie manualmente via API POST /api/register)"
    } else {
        Write-Host "users.json ja existe no container."
    }
} else {
    Write-Host ".env nao encontrado no Umbrel. Execute manualmente:"
    Write-Host ""
    Write-Host "  ssh $UMBREL_HOST"
    Write-Host "  cd $REMOTE_DIR"
    Write-Host "  cp umbrel/.env.example .env"
    Write-Host "  nano .env              # adicionar TS_AUTHKEY"
    Write-Host "  bash umbrel/setup-umbrel.sh"
    Write-Host ""
    Write-Host "Ou, se ja tem o .env configurado:"
    Write-Host "  cd $REMOTE_DIR && bash umbrel/setup-umbrel.sh"
}
