# swamp-forge

A ZCode plugin for the [Swamp](https://swamp-club.com) automation platform
("Deterministic Automation for AI Agents", open source at `systeminit/swamp`).
It makes ZCode a first-class workbench for the Swamp extensions registry and
bridges ad-hoc agent sessions into Swamp's deterministic, auditable world.

Swamp ships bundled agent skills for Claude Code, Cursor, OpenCode, and Codex —
not ZCode. This plugin closes that gap and goes beyond a port.

## Skills

| Skill | Trigger | What it does |
|---|---|---|
| `swamp-extension-dev` | authoring/editing/publishing a Swamp extension | Routing skill: extension types (models, reports, workflows, skills, vaults, datastores, drivers), naming/versioning/channels, definitions + CEL, publish checklist |
| `swamp-grade` | "grade / score / lint this extension" | Runs `swamp extension quality` (the registry's own 10-factor rubric) when the CLI is present, plus a local 9-check hygiene grader (`scripts/grade-extension.sh`) that works without the CLI |
| `swamp-capture` | "capture this", "make this repeatable" | Promotes work proven in the current session into a Swamp model/definition/workflow: reconstruct → classify → implement → validate → run once → grade |

## Commands

| Command | Arguments | What it does |
|---|---|---|
| `/swamp-forge:swamp-search` | `<query> [page N]` | Searches the extensions registry via `https://swamp-club.com/extensions?q=...` (server-side search, 24 results/page) and reports matches with id, version, channel, grade, pulls, and description; drills into `swamp extension info` / detail pages on request |

## Hook

`SessionStart` (`hooks/session-start.sh`): reports whether the `swamp` CLI is
installed (with version) and whether the cwd is a Swamp repo (`.swamp/`
present), so the agent knows its capabilities without probing.

## Grading model

Two layers, authoritative first:

1. `swamp extension quality <manifest-path>` — the CLI's implementation of the
   Swamp Club quality rubric (10 client-earnable factors); also caches the
   packaged tarball for `push`.
2. `scripts/grade-extension.sh <dir>` — local fallback scoring 9 signals
   (/100, letter grades A–D): metadata, `@scope/name` namespacing, dated
   `vYYYY.MM.DD.N` versions, README depth, content presence, evals, license,
   secret hygiene, changelog. The registry's exact rubric is not public; the
   local score is a pre-flight check only.

Verified against the real CLI (`20260910.174835.0`): command names in the
guides were checked against `swamp --help` output; claims that could not be
verified are marked ⚠️ in the reference guides.

## Layout

```
.claude-plugin/plugin.json     plugin manifest
commands/swamp-search.md       /swamp-forge:swamp-search registry search command
hooks/hooks.json               SessionStart hook registration
hooks/session-start.sh         environment report
skills/swamp-extension-dev/    routing skill + references/ guides
skills/swamp-capture/          session→workflow promotion skill
skills/swamp-grade/            grading skill
scripts/grade-extension.sh     local extension grader
scripts/install.sh             install/update into ZCode's plugin system
tests/fixture-extension/       grader fixture (scores 100/A)
docs/design.md                 design decisions and roadmap
```

## Install (local plugin)

```bash
bash scripts/install.sh
```

The script syncs this repo into ZCode's plugin cache
(`~/.zcode/cli/plugins/cache/local/swamp-forge/<version>/`), registers the
plugin in `~/.zcode/cli/plugins/installed_plugins.json`, and enables it in
`~/.zcode/cli/config.json` (`plugins.enabledPlugins`). Requires `jq`.
Restart ZCode sessions afterwards to load it. Re-run after making changes —
the cache copy is not live-linked to the repo.

The plugin is plain skills + hooks + bash — no build step, no runtime
dependencies beyond bash and (optionally) the `swamp` CLI.

## Roadmap

- **Registry Copilot (direction B, not yet built):** MCP server for searching
  the extensions registry, comparing grades/pulls, license-checking before
  adoption.
- **Run forensics (direction D):** diagnose failed runs from
  `swamp run history` and the OTel traces emitted by `swamp serve`.
- **Capture automation:** deepen the SessionEnd story so every session leaves a
  capture candidate in the repo.

## License

MIT for this plugin. Swamp core is AGPL-3.0 with a Swamp Extension and
Definition Exception — read `COPYING-EXCEPTION` in the swamp repo before
choosing licenses for extensions you author.
