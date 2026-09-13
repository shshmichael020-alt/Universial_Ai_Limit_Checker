$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$paths = [System.Collections.Generic.List[string]]::new()
$assetExtensions = '\.(js|css|html|png|svg|json|woff2?)$'

function Add-ManifestAsset([object]$value) {
  if ($null -eq $value) { return }
  if ($value -is [string]) {
    if ($value -notmatch '^(?:[a-z]+:|/)' -and $value -match $assetExtensions) { $paths.Add($value) }
    return
  }
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    foreach ($item in $value) { Add-ManifestAsset $item }
    return
  }
  foreach ($property in $value.PSObject.Properties) { Add-ManifestAsset $property.Value }
}

Add-ManifestAsset $manifest
$paths = @($paths | Sort-Object -Unique)
$missing = @($paths | Where-Object { -not (Test-Path (Join-Path $root $_) -PathType Leaf) })
if ($missing.Count) {
  $missing | ForEach-Object { Write-Error "Missing manifest asset: $_" }
  throw "Manifest validation failed: $($missing.Count) referenced asset(s) are missing."
}

$sourceFiles = Get-ChildItem (Join-Path $root 'src') -Recurse -File |
  Where-Object { $_.Extension -in '.js', '.css' }
if ($sourceFiles.Count -eq 0) { throw "Manifest validation failed: no source JS/CSS files found." }

$legacyPatterns = @(
  ("src/" + "frontend"),
  ("src/" + "backend"),
  ("MASTER_" + "BUILD_PROMPT"),
  ("PROJECT_" + "TREE")
)
$oldReferences = Get-ChildItem $root -Recurse -File |
  Where-Object { $_.FullName -notmatch "\\\.git\\|\\node_modules\\|\\scripts\\validate-extension\.ps1$" } |
  Select-String -Pattern $legacyPatterns

if ($oldReferences) {
  throw "Found stale pre-reorganization references."
}

Write-Output "AI Limit extension validation passed."
Write-Output "Manifest assets: $($paths.Count)"
Write-Output "Source JS/CSS files present: $($sourceFiles.Count)"
