# Swamp Extension Types

The registry (swamp-club.com/extensions) catalogs pluggable components by
**content type**. Pick the type that matches what your package provides; when in
doubt, browse comparable entries in the registry and mirror their shape.

Confidence legend: ✅ confirmed from Swamp's public docs/registry · ⚠️ inferred
convention — verify against `swamp help` and registry examples before relying on it.

## Types at a glance

| Type | Count in registry | What it provides |
|---|---|---|
| models | ~1,450 | New **model types**: typed wrappers around external systems |
| reports | ~100 | Formatted outputs of run data |
| workflows | ~80 | Pre-built reusable workflow packages |
| skills | ~50 | Agent guidance/playbooks bundled as registry artifacts |
| vaults | ~14 | Secret-storage backends |
| datastores | ~12 | Storage backends for versioned run data |
| drivers | 5 | Low-level execution/transport adapters ⚠️ |

## Models (primary authoring target)

A model type is a **typed representation of an external system** — a cloud
resource, a CLI tool, or an API. Registry examples: `@hivemq/docker` is "a thin
swamp wrapper around the `docker` CLI" exposing methods like `build`, `run`,
`push`. ✅

- **Language:** TypeScript. Custom models live in `extensions/models/` inside the
  repo (or a directory set via `SWAMP_MODELS_DIR` / `.swamp.yaml`). ✅
- **Shape:** each model type defines **metadata, arguments, methods, and inputs**. ✅
  Methods are the operations instances support (a Docker-like model: `build`,
  `run`, `push`; generic lifecycle methods seen in Swamp's own skill:
  `create`/`stop`/`destroy`/`sync`).
- **Instances** are created from YAML **definitions** (see
  `definitions-cel.md`), then methods run via
  `swamp model method run <instance> <method> --input key=value`. ✅
- **Runs inherit the local shell environment** (AWS creds, SSH keys). Prefer
  explicit inputs and vault references over ambient env, so runs are reproducible. ✅

Authoring checklist:

1. Author the manifest (e.g. `extension.yaml`) and content directories. There
   is no scaffold command (`swamp extension init` does not exist as of CLI
   `20260910.174835.0`) — copy the layout from a registry extension you
   respect, or from `tests/fixture-extension/` in this plugin.
2. Implement the model in TypeScript under `extensions/models/`; lint with
   `swamp extension fmt <manifest-path>`.
3. Keep methods small and idempotent where possible; document each method's
   inputs and outputs in the README.
4. Add at least one eval case per method (input → expected output).
5. Ship a definition example so users can instantiate it immediately.
6. Score with `swamp extension quality <manifest-path>` before publishing.

## Skills (secondary target)

Registry "skills" bundle **guidance/playbooks for agents** driving a model —
e.g. an entry described as "Ships a Claude skill playbook for driving the
model." ✅ Swamp itself ships its agent skill bundled in the binary with a
`SKILL.md` + `references/` + `evals/` layout. ⚠️ A skills-type extension in this
repo's spirit: a SKILL.md router plus reference guides, packaged under
`skills/` inside the extension. Verify exact packaging with `swamp help
extension` and by inspecting a registry skills entry.

## Workflows

Packages containing reusable workflow DAGs: parallel jobs/steps with dependency
ordering, guard expressions for idempotent execution, asserts, and triggers
(schedule or webhook). ✅ Author with `swamp workflow create` → `validate` →
`run`; see `definitions-cel.md` for the YAML and CEL surface.

## Reports

Formatting/output components that render run data (registry shows ~100). ✅ Run
via `swamp report run`. Authoring details not public — inspect a registry
example before implementing. ⚠️

## Vaults

Secret-storage backends. Registry credentials, cloud keys, etc. are stored in a
vault and injected at run time so they "never appear in prompts." ✅ 14 entries
exist; implementing a new backend likely follows the datastore extension pattern
(below). ⚠️

## Datastores

Backends for Swamp's immutable versioned run data. Reference implementation:
`@swamp/s3-datastore` (~93k pulls), installed via
`swamp datastore setup extension @swamp/s3-datastore --config '{"bucket":...}'`.
✅ Backends: local filesystem, external filesystem, S3. Distributed locks exist
for file/S3. ✅

## Drivers

Lowest-level adapters (5 in registry). No public authoring docs — treat as
expert-only; inspect registry entries and `swamp help` before attempting. ⚠️
