#!/bin/sh
# Double-click in Finder to start the demo at http://localhost:5173.
# First time only: if macOS says it can't be opened, run once in Terminal:
#   chmod +x start.command
# or right-click > Open.
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  exec node server.js
fi
# Fallback when Node isn't installed: Python's built-in server.
PORT=${PORT:-5173}
echo "Node.js not found; using Python. Open http://localhost:$PORT/ (Ctrl+C to stop)"
( sleep 1 && open "http://localhost:$PORT/" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
