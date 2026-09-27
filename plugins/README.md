# Plugins

ZCode plugins live here. Build new ones with the `plugin-creator` skill, test them against a local marketplace, then drop the source under a folder per plugin.

## `swamp-forge`

ZCode workbench for the [Swamp](https://swamp-club.com) automation platform
("Deterministic Automation for AI Agents", open source at `systeminit/swamp`):
author, grade, and publish Swamp extensions, search the extensions registry
(`/swamp-forge:swamp-search`), and capture proven agent sessions into
deterministic Swamp models and workflows (`swamp-capture` skill).

Plain skills + hooks + bash — no build step, no runtime dependencies beyond
bash and (optionally) the `swamp` CLI. Install:

```bash
cd plugins/swamp-forge && bash scripts/install.sh
```

Requires `jq`; restart ZCode sessions afterwards to load it. Details in the
[plugin README](swamp-forge/README.md).
