# Definitions, CEL, and Vaults

Confidence legend: ✅ confirmed from public docs · ⚠️ inferred — verify against
`swamp help` and existing definitions before relying on specifics.

## Definitions

A **definition** is a YAML file that instantiates a model type with specific
configuration. Definitions live in the repo's `.swamp/` structure (with symlink
views under `/models/` and `/workflows/`). ✅

```yaml
# Shape (illustrative — mirror an existing definition in the repo):
# kind/type reference the model type the definition instantiates
# config fields come from the model type's declared arguments
```

Every repo's existing definitions are the best template: read one that
instantiates the same model type before writing a new one.

## CEL expressions

Definitions support **CEL** (Common Expression Language) for computed values,
including **cross-model references** — one definition's config can reference
another model instance's outputs. ✅

Practices:

1. Keep CEL expressions short; push complex logic into the model's methods
   (TypeScript) rather than the definition.
2. Cross-references make the dependency graph explicit — use them instead of
   duplicating literal values between definitions.
3. Validate after every edit: `swamp workflow validate` (workflows) and the
   model-type's validate path; `swamp model get <name> --json` to confirm
   instance state.

## Vaults (secrets)

Credentials live in **vaults** and are referenced via CEL; Swamp injects them at
run time so they "never appear in prompts" — agents operate real systems
without seeing keys. ✅

- Create: `swamp vault create`. ✅
- Reference secrets from definitions via CEL vault references — never inline. ✅
- Registry workflows do this too: "Registry credentials are injected from a
  swamp vault at run time." ✅

When authoring extensions or definitions:

1. Any value that authenticates becomes a vault reference.
2. Example configs use placeholder vault paths, plus a README note on creating
   the vault.
3. Never write real secrets into evals or fixtures — evals run with fake inputs
   by design.

## Workflows

Workflows chain model methods into **parallel jobs/steps with dependency
ordering**, with **guard expressions for idempotent execution** and **asserts**. ✅

Lifecycle: `swamp workflow create` → edit DAG → `swamp workflow validate` →
`swamp workflow run --input key=value` → on failure, `swamp workflow resume`
(re-enters at the failed step). ✅ Triggers: schedule or webhook. ✅

Guards are the idempotency mechanism: a step whose guard evaluates false is
skipped, making reruns safe. Use guards for "already done?" checks (resource
exists, artifact present) rather than relying on step order. ⚠️
