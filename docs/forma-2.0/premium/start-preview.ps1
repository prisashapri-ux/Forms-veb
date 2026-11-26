$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
Set-Location $root
if ((git branch --show-current) -ne 'feature/forma-2.0') { throw 'Use feature/forma-2.0 only' }
if ((node --version) -notmatch '^v22\.') { throw 'Node.js 22 required' }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Write-Host 'PC: http://localhost:8765/'
Write-Host 'iPhone/iPad: use the Wi-Fi IPv4 address of this PC, port 8765.'
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } | ForEach-Object { Write-Host ("http://" + $_.IPAddress + ":8765/") }
Write-Host 'Trusted private Wi-Fi only. Synthetic data only. Ctrl+C stops server.'
python -m http.server 8765 --bind 0.0.0.0 --directory dist
