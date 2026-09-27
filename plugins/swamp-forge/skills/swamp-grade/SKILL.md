---
name: swamp-grade
description: Use when checking a Swamp extension's quality before publishing — score an extension directory against registry-style criteria (/100, letter grade), get actionable findings, or when the user asks to grade, lint, or score a swamp extension
---

# Grade a Swamp Extension

## Overview

The swamp-club registry scores extensions /100 with letter grades. The
authoritative scorer is the CLI's `swamp extension quality` (the rubric's "10
client-earnable factors") — prefer it when the CLI is installed. This skill
also runs a local approximation (`scripts/grade-extension.sh`) over the
**observable signals** registry quality correlates with: metadata completeness,
namespacing, dated versions, README quality, content presence, evals, license
hygiene, secret hygiene, and changelog.

Treat the local score as a pre-flight check, not a guarantee of the registry's grade.

## Procedure

1. Identify the extension root (directory containing the extension manifest,
   e.g. `extension.yaml`).
2. **If the `swamp` CLI is available**, run the authoritative scorer first:

   ```bash
   swamp extension quality <manifest-path>
   ```

   That is the registry's own rubric (10 client-earnable factors) and it
   caches the packaged tarball for `push`. Fix its findings, then continue —
   the local script below is a superset hygiene check that also runs without
   the CLI.
3. Run the local grader:

   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/grade-extension.sh" <extension-dir>
   ```

   (`${CLAUDE_PLUGIN_ROOT}` resolves to this plugin's root; if running outside
   the plugin, use the absolute path to `scripts/grade-extension.sh`.)

4. Read every `[FAIL]`/`[WARN]` finding and fix it in the extension — not in
   the script. The findings are the fix list; address them in order (they are
   roughly ordered by impact).
5. Re-run until the local grade is **A** (≥ 85). B is acceptable only if the
   user explicitly opts to publish anyway.
6. Report the final score(s), grade, and any remaining `[WARN]` lines to the
   user.

## Interpretation

| Grade | Score | Meaning |
|---|---|---|
| A | ≥ 85 | Publish-ready by local criteria |
| B | 70–84 | Missing polish (usually evals, changelog, or README depth) |
| C | 50–69 | Structural gaps — metadata, content, or versioning wrong |
| D | < 50 | Not viable; likely missing metadata or entirely empty |

Do not edit the grader to make a failing extension pass. If a finding is a
false positive, say so to the user and skip it explicitly.
