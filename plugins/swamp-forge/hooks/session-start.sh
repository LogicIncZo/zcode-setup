#!/usr/bin/env bash
# session-start.sh — SessionStart hook: report Swamp availability to the agent.
# Prints a compact capability line; never fails the session (always exits 0).

set -u

lines=()

if command -v swamp >/dev/null 2>&1; then
  ver="$(swamp --version 2>/dev/null || swamp version 2>/dev/null || echo 'unknown version')"
  lines+=("[swamp-forge] swamp CLI: available ($ver)")
else
  lines+=("[swamp-forge] swamp CLI: not installed (official installer at https://swamp-club.com/install.sh)")
fi

if [ -d ".swamp" ]; then
  lines+=("[swamp-forge] swamp repo: detected (.swamp/ present in cwd)")
else
  lines+=("[swamp-forge] swamp repo: not a swamp repo (cwd has no .swamp/)")
fi

lines+=("[swamp-forge] skills: swamp-extension-dev (author/publish), swamp-capture (promote session work), swamp-grade (score extension)")

printf '%s\n' "${lines[@]}"
exit 0
