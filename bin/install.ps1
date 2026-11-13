# reviewer-harness installer (Windows PowerShell)
#
# Installs the reviewer-harness CLI globally from npm (the published
# `reviewer-harness` package), so you can run `reviewer-harness` in
# any project. The install is pinned to the latest GitHub release
# version when that can be resolved; otherwise it falls back to
# npm's unpinned `latest`, and says so. The only requirement is
# Node.js 18+ (the harness itself has zero dependencies).
#
# Usage:
#   irm https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.ps1 | iex

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "reviewer-harness needs Node.js 18 or newer."
    Write-Host "Install it first: https://nodejs.org"
    exit 1
}

$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 18) {
    Write-Host "reviewer-harness needs Node.js 18 or newer (you have $(node -v))."
    exit 1
}

# Resolve the latest GitHub release tag (e.g. "v1.19.0" -> "1.19.0")
# so the npm install below is pinned to a released version, not
# whatever `latest` happens to point at today.
$version = ""
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/xcell321/reviewer-harness/releases/latest" -Headers @{ "User-Agent" = "reviewer-harness-installer" }
    $tag = [string]$release.tag_name -replace "^v", ""
    if ($tag -match "^[0-9.]+$") { $version = $tag }
} catch {
    $version = ""
}

if ($version) {
    Write-Host "Installing reviewer-harness@$version from npm (pinned to the latest GitHub release)..."
    npm install -g "reviewer-harness@$version"
} else {
    Write-Host "Note: could not resolve the latest release version - installing the unpinned latest from npm."
    npm install -g reviewer-harness
}

Write-Host ""
Write-Host "Done. Try it in any project:"
Write-Host "  reviewer-harness init     # create a master config"
Write-Host "  reviewer-harness sync     # sync the rules to every runtime"
