---
name: swamp-extension-dev
description: Use when authoring, editing, validating, grading, or publishing a Swamp extension (models, workflows, vaults, datastores, reports, drivers, or skills) for the swamp-club.com extensions registry, or when the user mentions swamp extensions, @scope/name extension names, Swamp models, or Swamp workflows
---

# Swamp Extension Development

## Overview

You are working inside the [Swamp](https://swamp-club.com) ecosystem — "Deterministic
Automation for AI Agents." Swamp turns ad-hoc agent work into **validated, versioned
automation**: typed **Models** that wrap external systems, YAML **Definitions** that
instantiate them, **Workflows** that chain them with guards, and an **extensions
registry** where packages are published under namespaced names.

This skill is a **router**. Never answer Swamp questions from memory — load the
relevant reference guide, then verify CLI flags against `swamp help <subcommand>`
before executing. The CLI's structured help output is the canonical schema.

## Routing table

| Intent | Load |
|---|---|
| Which extension type fits? How do I author a model / report / vault / datastore / driver / skill? | `references/extension-types.md` |
| Naming, versioning, channels, or publishing to the registry | `references/versioning-publishing.md` |
| Writing YAML definitions, CEL expressions, cross-model references, vault references | `references/definitions-cel.md` |
| Find existing extensions in the registry (natural-language ask) | run the `swamp-search` command's procedure: WebFetch `https://swamp-club.com/extensions?q=<query>` (24/page via `&page=N`; no content-type filter — filter yourself) |
| Score an extension before publishing | invoke the `swamp-grade` skill |
| Turn this session's work into a Swamp automation | invoke the `swamp-capture` skill |

## Iron rules

1. **Author around a manifest.** An extension is a manifest plus content
   directories. There is no `swamp extension init` (as of CLI
   `20260910.174835.0`): hand-author the manifest, then lint and score with
   `swamp extension fmt` and `swamp extension quality <manifest-path>`.
2. **Never guess flags.** Run `swamp help <subcommand>` (structured output) to confirm
   exact flags before running any command.
3. **Secrets never appear in prompts or code.** Credentials live in Swamp vaults and are
   referenced via CEL; they are injected at run time. If you see a literal token, key, or
   password about to enter an extension, stop and route it to a vault reference.
4. **Confirm before destructive model methods.** Before `destroy`/`stop`/`sync` style
   methods on real infrastructure, verify instance state via `swamp model get <name> --json`.
5. **Dated versions only.** Registry versions follow `vYYYY.MM.DD.N` — see
   `references/versioning-publishing.md` before bumping or publishing.

## Authoring loop

1. Clarify which external system the extension wraps and which registry type fits
   (`references/extension-types.md`).
2. Author the manifest (e.g. `extension.yaml`) plus content directories
   (`models/`, `evals/`, ... — see `references/extension-types.md`).
3. Implement (TypeScript for models); lint with `swamp extension fmt <manifest-path>`.
4. Add definitions if the extension instantiates model types
   (`references/definitions-cel.md`).
5. Add evals — at least one documented input/output case per method.
6. Score with `swamp extension quality <manifest-path>` (the registry's own
   rubric); fix findings. The `swamp-grade` skill's local script is the
   CLI-absent fallback.
7. Publish with `swamp extension push <manifest-path>`, per
   `references/versioning-publishing.md`.

## Environment check

If `swamp` is not on PATH, tell the user the install one-liner:
`curl -fsSL https://swamp-club.com/install.sh | sh` — and ask whether to proceed with
scaffolding files anyway (they can be validated once the CLI is installed).
The SessionStart hook of this plugin normally reports CLI and repo status already.
