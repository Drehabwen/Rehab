$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
  $env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
  npm run build
  npm run desktop:backend
  npx electron-builder --projectDir desktop --win dir
  $prepacked = (Resolve-Path 'release-lean\win-unpacked').Path
  npx electron-builder --projectDir desktop --prepackaged $prepacked --win nsis
} finally { Pop-Location }
