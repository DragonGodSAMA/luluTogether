$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $projectRoot
$stageRoot = Join-Path $workspaceRoot 'carpool-system-portable'
$archivePath = Join-Path $workspaceRoot 'carpool-system-portable-win-x64.zip'
$nodeVersion = 'v22.23.2'
$nodeArchiveName = "node-$nodeVersion-win-x64.zip"
$nodeUrl = "https://nodejs.org/dist/$nodeVersion/$nodeArchiveName"
$checksumsUrl = "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt"
$downloadRoot = Join-Path $env:TEMP 'carpool-portable-runtime'
$nodeArchive = Join-Path $downloadRoot $nodeArchiveName
$nodeExtractRoot = Join-Path $downloadRoot "node-$nodeVersion-win-x64"

Write-Host '1/5 Building the frontend...'
$originalLocation = Get-Location
try {
  Set-Location (Join-Path $projectRoot 'frontend')
  & node '.\node_modules\vite\bin\vite.js' build --emptyOutDir
  if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally {
  Set-Location $originalLocation
}

Write-Host '2/5 Preparing the official Node.js runtime...'
[System.IO.Directory]::CreateDirectory($downloadRoot) | Out-Null
if (-not (Test-Path -LiteralPath $nodeArchive)) {
  Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeArchive -UseBasicParsing
}
$checksums = (Invoke-WebRequest -Uri $checksumsUrl -UseBasicParsing).Content
$expectedMatch = [regex]::Match($checksums, "(?m)^([a-f0-9]{64})  $([regex]::Escape($nodeArchiveName))$")
if (-not $expectedMatch.Success) { throw 'The official Node.js checksum could not be read.' }
$actualHash = (Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedMatch.Groups[1].Value) { throw 'The downloaded Node.js archive failed checksum verification.' }
if (-not (Test-Path -LiteralPath (Join-Path $nodeExtractRoot 'node.exe'))) {
  Expand-Archive -LiteralPath $nodeArchive -DestinationPath $downloadRoot -Force
}

Write-Host '3/5 Creating a clean portable folder...'
if (Test-Path -LiteralPath $stageRoot) { [System.IO.Directory]::Delete($stageRoot, $true) }
[System.IO.Directory]::CreateDirectory($stageRoot) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $stageRoot 'runtime')) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $stageRoot 'backend')) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $stageRoot 'frontend')) | Out-Null
Copy-Item -LiteralPath (Join-Path $nodeExtractRoot 'node.exe') -Destination (Join-Path $stageRoot 'runtime\node.exe')
Copy-Item -LiteralPath (Join-Path $projectRoot 'start.bat') -Destination $stageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $stageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\server.js') -Destination (Join-Path $stageRoot 'backend\server.js')
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\package.json') -Destination (Join-Path $stageRoot 'backend\package.json')
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\middleware') -Destination (Join-Path $stageRoot 'backend\middleware') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\routes') -Destination (Join-Path $stageRoot 'backend\routes') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\node_modules') -Destination (Join-Path $stageRoot 'backend\node_modules') -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot 'frontend\dist') -Destination (Join-Path $stageRoot 'frontend\dist') -Recurse
[System.IO.Directory]::CreateDirectory((Join-Path $stageRoot 'backend\db')) | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\db\database.js') -Destination (Join-Path $stageRoot 'backend\db\database.js')

Write-Host '4/5 Creating the ZIP archive...'
if (Test-Path -LiteralPath $archivePath) { [System.IO.File]::Delete($archivePath) }
Compress-Archive -Path $stageRoot -DestinationPath $archivePath -CompressionLevel Optimal

Write-Host '5/5 Portable package ready.'
Write-Host $archivePath
