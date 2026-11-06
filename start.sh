#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(/usr/bin/time -p bash -c 'cd "$1" && pwd -P' _ "$(dirname "$0")")"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT
METADATA_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DEPLOYMENT_OUTPUT="$METADATA_DIR/deployment-output.json"

/usr/bin/time -p npm install --ignore-scripts --no-audit --no-fund --package-lock=false
/usr/bin/time -p npm run build
/usr/bin/time -p mkdir -p "$METADATA_DIR"
PROJECT_DIR="$PROJECT_DIR" DEPLOYMENT_OUTPUT="$DEPLOYMENT_OUTPUT" /usr/bin/time -p node -e 'const fs=require("node:fs"); const path=require("node:path"); fs.writeFileSync(process.env.DEPLOYMENT_OUTPUT, JSON.stringify({project:process.env.PROJECT_DIR,directory:path.join(process.env.PROJECT_DIR,"dist")}))'
/usr/bin/time -p npm start
