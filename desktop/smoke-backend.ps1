$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = (Resolve-Path (Join-Path $projectRoot 'backend\dist\rehab-backend')).Path
$backendExe = Join-Path $backendDir 'rehab-backend.exe'
$backendProcess = Start-Process -FilePath $backendExe -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru
try {
  $healthy = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
      $healthy = $true
      $response | ConvertTo-Json -Compress
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $healthy) { throw 'Backend health check failed.' }
} finally {
  if (-not $backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force }
}
