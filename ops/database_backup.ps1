[CmdletBinding()]
param(
    [string]$OutputDirectory = "./backups"
)

$ErrorActionPreference = 'Stop'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$backupFile = Join-Path $backupDirectory "rmparking-$timestamp.dump"
$container = "rmparking-db"
$containerFile = "/tmp/rmparking-$timestamp.dump"

New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null

Write-Host "Verificando que PostgreSQL este disponible..."
docker compose exec -T db pg_isready -U postgres | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL no esta disponible. Inicia el servicio con: docker compose up -d db"
}

Write-Host "Creando respaldo en $backupFile ..."
$dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --file=' + $containerFile
docker compose exec -T db sh -c $dumpCommand
if ($LASTEXITCODE -ne 0) {
    throw "No fue posible crear el respaldo dentro del contenedor."
}

docker cp "${container}:$containerFile" $backupFile
if ($LASTEXITCODE -ne 0) {
    throw "No fue posible copiar el respaldo al equipo local."
}

docker compose exec -T db rm -f $containerFile | Out-Null
$size = (Get-Item $backupFile).Length
Write-Host "Respaldo creado correctamente: $backupFile ($size bytes)"
Write-Host "Conserva este archivo fuera del repositorio y protegelo como un dato sensible."
