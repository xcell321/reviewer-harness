# reviewer-harness installer (Windows PowerShell)
#
# Installs the reviewer-harness CLI globally from GitHub, so you can
# run `reviewer-harness` in any project. The only requirement is
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

Write-Host "Installing reviewer-harness globally from GitHub..."
npm install -g github:xcell321/reviewer-harness

Write-Host ""
Write-Host "Done. Try it in any project:"
Write-Host "  reviewer-harness init     # create a master config"
Write-Host "  reviewer-harness sync     # sync the rules to every runtime"
