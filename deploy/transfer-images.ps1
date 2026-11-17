param(
    [ValidateSet('all', 'frontend', 'backend')]
    [string]$Service = 'all',
    [string]$RemoteHost = 'root@45.12.237.102'
)

$ErrorActionPreference = 'Stop'
$remoteDir = '/opt/mwworks'
$composeFile = Join-Path $PSScriptRoot 'docker-compose.yml'
$envFile = Join-Path $PSScriptRoot '.env'
$versionText = (Get-Content -LiteralPath $envFile -Raw).Trim()
if ($versionText -notmatch '^APP_VERSION=(\d+\.\d+\.\d+)$') {
    throw 'deploy/.env must contain APP_VERSION in MAJOR.MINOR.PATCH format.'
}
$version = $Matches[1]
$services = if ($Service -eq 'all') { @('backend', 'frontend') } else { @($Service) }
$images = @($services | ForEach-Object { "mwworks-${_}:$version" })
$archiveName = "mwworks-$Service-$version-$([guid]::NewGuid().ToString('N')).tar"
$archive = Join-Path ([IO.Path]::GetTempPath()) $archiveName
try {
    docker image inspect @images | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Build the version in deploy/.env before transferring.' }
    docker save --output $archive @images
    if ($LASTEXITCODE -ne 0) { throw 'Docker image export failed.' }
    ssh $RemoteHost "mkdir -p $remoteDir"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot prepare the remote directory.' }
    scp $archive "${RemoteHost}:${remoteDir}/$archiveName"
    if ($LASTEXITCODE -ne 0) { throw 'Image upload failed.' }
    ssh $RemoteHost "docker load -i $remoteDir/$archiveName && docker image inspect $($images -join ' ') > /dev/null && rm -f $remoteDir/$archiveName"
    if ($LASTEXITCODE -ne 0) { throw 'Remote Docker image import failed.' }
    scp $composeFile $envFile "${RemoteHost}:${remoteDir}/"
    if ($LASTEXITCODE -ne 0) { throw 'Compose configuration upload failed.' }
    Write-Host "Transferred $($images -join ', ') to $RemoteHost. Containers were not restarted."
    Write-Host "Start on server: cd $remoteDir && docker compose --env-file .env -f docker-compose.yml up -d --no-build --pull never"
} finally {
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
}
