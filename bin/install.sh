#!/usr/bin/env bash
# reviewer-harness installer (Linux / macOS)
#
# Installs the reviewer-harness CLI globally from GitHub, so you can
# run `reviewer-harness` in any project. The only requirement is
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

echo "Installing reviewer-harness globally from GitHub..."
npm install -g github:xcell321/reviewer-harness

echo ""
echo "Done. Try it in any project:"
echo "  reviewer-harness init     # create a master config"
echo "  reviewer-harness sync     # sync the rules to every runtime"
