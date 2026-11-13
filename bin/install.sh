#!/usr/bin/env bash
# reviewer-harness installer (Linux / macOS)
#
# Installs the reviewer-harness CLI globally from npm (the published
# `reviewer-harness` package), so you can run `reviewer-harness` in
# any project. The install is pinned to the latest GitHub release
# version when that can be resolved; otherwise it falls back to
# npm's unpinned `latest`, and says so. The only requirement is
# Node.js 18+ (the harness itself has zero dependencies).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.sh | bash

set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "reviewer-harness needs Node.js 18 or newer."
  echo "Install it first: https://nodejs.org"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "reviewer-harness needs Node.js 18 or newer (you have $(node -v))."
  exit 1
fi

# Resolve the latest GitHub release tag (e.g. "v1.19.0" → "1.19.0")
# so the npm install below is pinned to a released version, not
# whatever `latest` happens to point at today.
VERSION=""
if command -v curl >/dev/null 2>&1; then
  VERSION="$(curl -fsSL https://api.github.com/repos/xcell321/reviewer-harness/releases/latest 2>/dev/null \
    | node -e 'let d="";process.stdin.on("data",(c)=>d+=c).on("end",()=>{try{console.log(String(JSON.parse(d).tag_name||"").replace(/^v/,""))}catch{}})' \
    || true)"
fi
case "$VERSION" in
  *[!0-9.]* | "") VERSION="" ;;
esac

if [ -n "$VERSION" ]; then
  echo "Installing reviewer-harness@$VERSION from npm (pinned to the latest GitHub release)..."
  npm install -g "reviewer-harness@$VERSION"
else
  echo "Note: could not resolve the latest release version — installing the unpinned latest from npm."
  npm install -g reviewer-harness
fi

echo ""
echo "Done. Try it in any project:"
echo "  reviewer-harness init     # create a master config"
echo "  reviewer-harness sync     # sync the rules to every runtime"
