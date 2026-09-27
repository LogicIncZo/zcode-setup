#!/usr/bin/env bash
# install.sh — install/update swamp-forge into the local ZCode plugin system.
# Idempotent: syncs this repo to the plugin cache, registers it in
# installed_plugins.json, and enables it in ~/.zcode/cli/config.json.
#
# Usage: bash scripts/install.sh
# Requires: jq. Restart ZCode sessions afterwards to load the plugin.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGINS_DIR="${HOME}/.zcode/cli/plugins"
CACHE="${PLUGINS_DIR}/cache/local/swamp-forge"
MARKETPLACE="local"

command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }
[ -f "${SRC}/.claude-plugin/plugin.json" ] || { echo "error: run from the swamp-forge repo" >&2; exit 1; }

VERSION="$(jq -r .version "${SRC}/.claude-plugin/plugin.json")"
NAME="$(jq -r .name "${SRC}/.claude-plugin/plugin.json")"
PLUGIN_ID="${NAME}@${MARKETPLACE}"
INSTALL_PATH="${CACHE}/${VERSION}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

# 1. Sync source into the cache (exclude session-state dirs).
mkdir -p "${INSTALL_PATH}"
rm -rf "${INSTALL_PATH:?}/"*
(cd "${SRC}" && tar -cf - \
    --exclude=./.mimosa --exclude=./.zcode --exclude=./.git \
    .) | tar -xf - -C "${INSTALL_PATH}"
echo "synced ${SRC} -> ${INSTALL_PATH}"

# 2. Register in installed_plugins.json (replace existing entry for this id).
TMP="$(mktemp)"
jq --arg id "${PLUGIN_ID}" --arg name "${NAME}" --arg ver "${VERSION}" \
   --arg path "${INSTALL_PATH}" --arg now "${NOW}" --arg src "${SRC}" '
  .plugins = ((.plugins // []) | map(select(.id != $id)) + [{
    id: $id, name: $name, marketplace: "local", version: $ver,
    installPath: $path, installedAt: $now, updatedAt: $now,
    scope: "user", source: $src
  }])' "${PLUGINS_DIR}/installed_plugins.json" > "${TMP}"
mv "${TMP}" "${PLUGINS_DIR}/installed_plugins.json"
echo "registered ${PLUGIN_ID} (v${VERSION})"

# 3. Enable it.
TMP="$(mktemp)"
jq --arg id "${PLUGIN_ID}" \
  '.plugins.enabledPlugins[$id] = true' \
  "${HOME}/.zcode/cli/config.json" > "${TMP}"
mv "${TMP}" "${HOME}/.zcode/cli/config.json"
echo "enabled ${PLUGIN_ID}"

echo "done — restart ZCode sessions to load swamp-forge"
