$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$distRoot = Join-Path $backendRoot 'dist'
$venvRoot = Join-Path $projectRoot '.venv-desktop'
$pythonExe = Join-Path $venvRoot 'Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
  py -3.12 -m venv $venvRoot
}
& $pythonExe -m pip install --disable-pip-version-check -r (Join-Path $backendRoot 'requirements-desktop.txt')
if (Test-Path $distRoot) { Remove-Item -LiteralPath $distRoot -Recurse -Force }
Push-Location $backendRoot
try {
  & $pythonExe -m PyInstaller --noconfirm --clean --onedir --name rehab-backend --distpath dist --workpath build\pyinstaller --specpath build `
    --exclude-module torch `
    --exclude-module transformers `
    --exclude-module pandas `
    --exclude-module scipy `
    --exclude-module sklearn `
    --exclude-module matplotlib `
    --exclude-module yt_dlp `
    --exclude-module sympy `
    --exclude-module numba `
    --exclude-module pytest `
    main.py
} finally { Pop-Location }
