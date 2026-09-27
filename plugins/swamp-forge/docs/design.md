# swamp-forge design

Date: 2026-09-10
Status: MVP scaffold implemented (unreleased)

## Context

swamp.club (→ swamp-club.com) is "Deterministic Automation for AI Agents":
agent-authored **Swamp models** (typed wrappers over external systems), YAML
**definitions** (CEL expressions), **workflows** (guarded DAGs with
schedule/webhook triggers), immutable versioned **run history**, runtime-injected
secrets via **vaults**, and an **extensions registry** (1,603 items: models,
reports, workflows, skills, vaults, datastores, drivers; `@scope/name`,
dated versions `vYYYY.MM.DD.N`, stable/rc/beta channels, quality grades).

Swamp bundles agent skills for Claude Code (default), Cursor, OpenCode, and
Codex — **not ZCode**. Upstream accepts no external PRs (issue-driven,
fork PRs auto-closed), so a ZCode port must live outside their repo.

## Goals (from brainstorm, user-selected)

- **A. Extension Authoring Workbench** — make ZCode the best tool for building
  and publishing registry extensions.
- **C. Session→Workflow Capture Bridge** — promote proven ad-hoc session work
  into deterministic Swamp automation.

Directions B (registry copilot MCP) and D (run forensics) were deferred to the
roadmap.

## Key design decisions

1. **Skills + hooks + bash; no MCP server.** The MVP's value is knowledge
   routing and process discipline, not new transport surface. Keeps install
   dependency-free (bash only).
2. **Router skills, not tutorials.** Mirrors Swamp's own skill philosophy:
   load the guide for the task, verify flags with `swamp help`, never answer
   from memory. Guides live in `skills/swamp-extension-dev/references/`.
3. **Verified-vs-inferred marking.** Guides mark claims ✅ (confirmed from
   public docs/registry/CLI help) or ⚠️ (inferred convention). After the real
   CLI was discovered installed locally (v`20260910.174835.0`), all cited
   commands were checked against `swamp --help`; corrections applied:
   - `swamp extension init` **does not exist** → hand-authored manifest +
     `extension fmt` / `extension quality` / `extension push`.
   - `swamp extension quality <manifest-path>` is the **authoritative**
     registry rubric scorer (10 client-earnable factors).
   - `swamp workflow validate|run|resume`, `model create|validate|get`,
     `vault create <type> [name]`, `extension pull|info|install|rm` all
     confirmed.
4. **Two-layer grading.** Prefer the CLI's `extension quality` (authoritative);
   the local `grade-extension.sh` (9 checks, /100, A–D) works without the CLI
   and covers hygiene the rubric may not (secret scan, changelog). The script
   is intentionally not the arbiter: findings are advisory, and the skill
   forbids editing the grader to make an extension pass.
5. **Capture works from conversation context, not transcripts.** No coupling
   to ZCode transcript internals; the skill requires a clean `workflow run` as
   the completion criterion and marks unverified steps as untested.
6. **SessionStart hook reports, never acts.** One capability line: CLI
   present/absent (+version), repo or not, skill inventory. Always exits 0.

## Plugin anatomy

Follows installed-plugin conventions verified in the local plugin cache:
`.claude-plugin/plugin.json`, `hooks/hooks.json` (SessionStart,
`${CLAUDE_PLUGIN_ROOT}`), `skills/<name>/SKILL.md` with `name`/`description`
frontmatter.

```
.claude-plugin/plugin.json
package.json
hooks/hooks.json, hooks/session-start.sh
skills/swamp-extension-dev/{SKILL.md, references/{extension-types,versioning-publishing,definitions-cel}.md}
skills/swamp-capture/SKILL.md
skills/swamp-grade/SKILL.md
scripts/grade-extension.sh
tests/fixture-extension/          (grader fixture, scores 100/A)
```

## Testing

- `bash -n` on both scripts; `jq` on all three JSON manifests.
- Grader: fixture scores 100/A; a broken copy scores 38/D with the expected
  fix list (missing README/content/evals/license/changelog; semver WARN
  correctly +3/10 — this caught an initial `warn()` bug that added max points).
- Secret regexes spot-checked with constructed strings (AKIA 16-char, ghp_ 25,
  PEM header) — no credential literals written to any file.
- Hook exercised in both CLI-present (real swamp) and shim/absent paths, and
  both repo-detected and non-repo cwd.

## Error handling

- Grader and hook always exit 0 (report tools); usage errors exit 1.
- Skills degrade gracefully without the CLI (install pointer, local grading
  still available).
- Capture refuses to automate steps that were never run successfully in the
  session.

## Roadmap

- **B. Registry Copilot:** MCP server for registry search/compare/license-check.
  First slice shipped in 0.2.0: the `/swamp-forge:swamp-search` command +
  skill routing, using the registry's server-rendered search — verified URL
  grammar: `?q=<query>` searches server-side (docker → 44/1603), `&page=N`
  paginates at 24/page, and **no content-type facet param exists** (`&type=`
  is ignored), so type filtering is agent-side from card text/detail pages.
  Remaining for B: license/grade comparison across candidates, "adopt this
  extension" flow (pull + pin + vault wiring), and an MCP transport if
  fetch-per-query proves too heavy.
- **D. Run forensics:** agent over `swamp run history` + `swamp serve` OTel traces.
- **Capture deepening:** SessionEnd capture-candidate stubs; eval-case
  generation from actual run inputs/outputs.
- **Upstream alignment:** watch `systeminit/swamp` for a native ZCode skill
  target; if it ships, slim this plugin to the delta.
