---
name: swamp-capture
description: Use when the user wants to capture, promote, or "make repeatable" work that was just done in this session — turning proven ad-hoc agent steps into a deterministic Swamp model, definition, or workflow — or mentions saving this session to swamp
---

# Session → Swamp Capture

## Overview

Swamp exists because "agents solve problems once, then forget." This skill is the
bridge: it takes work **this session actually completed and verified** and promotes
it into Swamp's deterministic, reviewable, versioned form. The value is that the
source material is *proven* — you debugged the real steps, so you know what works.

Capture from conversation context. There is no transcript parsing and no external
session store: if this session did the work, you already hold the steps.

## When to decline

- The steps were never actually run to completion here — capturing untested steps
  produces automation that fails the first real run. Say so and offer to run them
  first.
- The work was pure exploration with no repeatable shape (one-off investigation).
  Offer instead to write a short run report as data.
- The target repo isn't a Swamp repo (no `.swamp/`) and the user doesn't want
  `swamp init`.

## Capture procedure

### 1. Reconstruct the proven path

From this session, extract only what was **verified to work**:

- Commands run (with the exact arguments that succeeded, not the failed attempts)
- External systems touched (APIs, CLIs, cloud resources)
- Inputs/parameters, and which values were one-off vs. reusable
- Secrets involved — **these never get captured**; note only that a vault
  reference is needed

Present the reconstruction to the user and get a yes before writing files.

### 2. Classify the automation

| Proven work | Swamp shape |
|---|---|
| Wraps one external system with a few operations | **Model** (TypeScript) + example definition |
| Instantiates an existing model type with this repo's config | **Definition** (YAML) only |
| Chains multiple steps with ordering/conditions | **Workflow** (DAG of model methods) |
| Recurring variant of a workflow | Workflow + schedule/webhook trigger |

Load `swamp-extension-dev`'s references (`extension-types.md`,
`definitions-cel.md`) for authoring details.

### 3. Scaffold and implement

```
swamp model create <type> <name>   # if instantiating a model instance
swamp workflow create <name>       # if a workflow
```

If the captured work is a *new model type* (an extension), hand-author the
extension manifest and content dirs — there is no scaffold command — then lint
and score with `swamp extension fmt` and `swamp extension quality`.

Then replace everything brittle with Swamp primitives:

- Hard-coded credentials → vault references (create via `swamp vault create`)
- One-off hostnames/IDs → CEL expressions or definition inputs
- "I know this worked because I saw it" → **guards** (idempotency checks) and
  **asserts** (postcondition checks)
- Destructive steps get explicit guards and require the user's sign-off in the
  workflow review

### 4. Validate and run once

```
swamp workflow validate
swamp workflow run --input key=value ...
```

If the run fails, fix and resume (`swamp workflow resume` re-enters at the
failed step). **A capture isn't done until one clean run is recorded** — that run
is the versioned proof in Swamp's run history.

### 5. Grade and file

Run the `swamp-grade` skill on the result (it defers to the CLI's
`swamp extension quality` when available). Fix findings to A-range, then hand
off to the user for publish (`swamp extension push`, see
`references/versioning-publishing.md`) if this is meant for the team library —
every published automation is reusable by the team.

## Honesty rules

- Mark every step you did **not** personally verify in this session as
  untested in the workflow comments/README.
- Never invent outputs for the eval cases — run the commands, or label the case
  as untested.
- If a step depended on ambient state (a session-scoped token, a temp file),
  either make it an explicit input or the automation will silently break for the
  next runner.
