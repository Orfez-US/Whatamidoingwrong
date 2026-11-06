#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(/usr/bin/time -p bash -c 'cd "$1" && pwd -P' _ "$(dirname "$0")")"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project.}"
case "$CAPTURE_DIR" in
  "$PROJECT_DIR"|"$PROJECT_DIR"/*)
    echo "CAPTURE_DIR must be outside the source project: $PROJECT_DIR" >&2
    exit 1
    ;;
esac
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
export CAPTURE_STRICT=1
export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-#gameCanvas}"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
