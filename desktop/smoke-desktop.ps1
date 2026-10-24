$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$unpackedRoot = Join-Path $projectRoot 'release-lean\win-unpacked'
$desktopExe = Get-ChildItem -LiteralPath $unpackedRoot -Filter '*.exe' | Select-Object -First 1
if (-not $desktopExe) { throw 'Desktop executable not found.' }
$desktopLog = Join-Path $env:APPDATA 'rehab-main-desktop\logs\desktop.log'
$launchStarted = Get-Date

$desktopProcess = Start-Process -FilePath $desktopExe.FullName -WorkingDirectory $unpackedRoot -PassThru
try {
  $healthy = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
      $healthy = $true
      $response | ConvertTo-Json -Compress
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $healthy) { throw 'Desktop-launched backend health check failed.' }

  $rendererReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ((Test-Path $desktopLog) -and
        (Get-Item $desktopLog).LastWriteTime -ge $launchStarted.AddSeconds(-1) -and
        (Select-String -LiteralPath $desktopLog -Pattern 'renderer-ready' -Quiet)) {
      $rendererReady = $true
      break
    }
    if ($desktopProcess.HasExited) { break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $rendererReady) { throw "Desktop renderer did not become ready. Log: $desktopLog" }
  Write-Output 'renderer-ready'
} finally {
  if (-not $desktopProcess.HasExited) { Stop-Process -Id $desktopProcess.Id -Force }
  Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -like '*release-lean*resources*backend*rehab-backend.exe'
  } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
