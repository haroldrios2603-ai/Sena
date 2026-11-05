[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$container = "rmparking-db"
$containerFile = "/tmp/rmparking-restore.dump"

if (-not $PSCmdlet.ShouldProcess($resolvedBackup, 'Restaurar sobre la base de datos configurada en Docker Compose')) {
    Write-Host "Restauracion cancelada. Ejecuta nuevamente con -WhatIf para revisar la operacion."
    exit 0
}

Write-Host "ADVERTENCIA: la restauracion reemplazara los datos actuales de la base configurada."
$confirmation = Read-Host "Escribe RESTAURAR para continuar"
if ($confirmation -cne 'RESTAURAR') {
    throw "Restauracion cancelada por el operador."
}

docker compose exec -T db pg_isready -U postgres | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL no esta disponible. Inicia el servicio con: docker compose up -d db"
}

docker cp $resolvedBackup "${container}:$containerFile"
if ($LASTEXITCODE -ne 0) {
    throw "No fue posible copiar el respaldo al contenedor."
}

Write-Host "Restaurando $resolvedBackup ..."
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --exit-on-error /tmp/rmparking-restore.dump'
$restoreExitCode = $LASTEXITCODE
docker compose exec -T db rm -f $containerFile | Out-Null
if ($restoreExitCode -ne 0) {
    throw "La restauracion fallo. Revisa la salida de pg_restore y no elimines el respaldo original."
}

Write-Host "Restauracion completada correctamente."
