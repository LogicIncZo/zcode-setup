# Naming, Versioning, and Publishing

Confidence legend: ✅ confirmed from public registry/docs · ⚠️ inferred — verify
with `swamp help extension` / registry before publishing.

## Namespacing

Extensions use namespaced identifiers: `@scope/name`.

- `@swamp/...` is the first-party scope (e.g. `@swamp/s3-datastore`).
- Community examples: `@hivemq/ssh/keygen`, `@hivemq/oci/image/patch` — note the
  deeper slash-separated paths exist. ⚠️ Keep scopes consistent with your
  organization's identity on the registry.

Rules of thumb:

1. Scope = publisher (org or user), name = what it wraps.
2. Model extensions are usually thin wrappers named after the wrapped tool
   (`docker`, `terraform`, ...). Mirror the tool's own naming.

## Versions

Registry versions are **dated**: `vYYYY.MM.DD.N` (e.g. `v2026.09.10.1`), where
the trailing `.N` disambiguates multiple releases on the same day. ✅

- Always bump when behavior changes; never republish an existing version.
- The trailing counter restarts conceptually each day (`.1` first release). ⚠️

## Channels

Three release channels: **stable**, **rc**, **beta**. ✅

- `beta`: new APIs, may break.
- `rc`: feature-complete, seeking validation.
- `stable`: default channel users should get.

Promote in one direction (beta → rc → stable). Don't downgrade a published
version's channel; cut a new version instead. ⚠️

## Quality grading

The registry scores extensions (e.g. 100/100, 85/100) with letter grades
(A/B/D) or "unscored", and shows pull counts. ✅

Two layers, use both:

1. **Authoritative:** `swamp extension quality <manifest-path>` — the CLI's own
   implementation of the Swamp Club quality rubric ("10 client-earnable
   factors"); it also caches the packaged tarball for reuse by `push`. ✅
2. **Local pre-flight (this plugin):** the `swamp-grade` skill's
   `scripts/grade-extension.sh` approximates registry signals when the CLI is
   absent or for quick iteration. Treat it as a pre-check, not a guarantee.

## Publishing (confirmed subcommands)

From `swamp extension --help` (CLI `20260910.174835.0`): ✅

- `push <manifest-path>` — publish to the registry
- `quality <manifest-path>` — rubric score + tarball cache
- `fmt <manifest-path>` — format/lint extension TypeScript
- `pull <extension>` / `install` / `rm` — pull, lockfile-restore, remove
- `info <name>` — full registry metadata for an extension

## Publish checklist

Run through before every publish:

1. [ ] Manifest (e.g. `extension.yaml`) is accurate and complete.
2. [ ] Version bumped to today's dated version.
3. [ ] Channel chosen deliberately (default: beta for first release).
4. [ ] README: what it wraps, method/input tables, one quickstart.
5. [ ] Evals present (≥1 per method).
6. [ ] No secrets in code or fixtures (vault references only).
7. [ ] License noted — Swamp core is AGPL-3.0 with a **Swamp Extension and
       Definition Exception** (`COPYING-EXCEPTION`) that carves out licensing
       for extensions and definitions. Read it before choosing your license. ✅
8. [ ] `swamp extension fmt` clean.
9. [ ] `swamp extension quality` score accepted (all 10 factors addressed or
       consciously waived).
10. [ ] `swamp extension push <manifest-path>` — then verify with
        `swamp extension info <name>`.

## Deprecation

The registry supports deprecation (Swamp's own skill routes to a "publishing"
guide covering registry publishing and deprecation). ✅ Prefer deprecating over
deleting so downstream workflows keep resolving. ⚠️
