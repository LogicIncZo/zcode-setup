# @swamp-forge/fixture-model

Fixture extension for the swamp-forge plugin's grader tests. Wraps a fictional
`examplectl` CLI as a Swamp model type. Do not publish; do not use as a real
template without checking current Swamp docs.

## Model

- **Type:** `example` — a typed representation of a host that has `examplectl`
  installed.
- **Methods:**
  - `status` — returns the examplectl version and host state. Inputs: none.
  - `apply` — applies a config file. Inputs: `config` (path), `dry_run` (bool).
  - `destroy` — removes applied config. Inputs: `force` (bool). Destructive:
    requires confirmed instance state via `swamp model get <name> --json`.

## Usage / quickstart

1. Install: `swamp extension pull @swamp-forge/fixture-model` (hypothetical —
   this fixture is never published).
2. Create a vault for the example host token: `swamp vault create` and note the
   vault path; the definition references it, never a literal token.
3. Instantiate with the example definition and run a method:

   ```
   swamp model method run <instance> status
   swamp model method run <instance> apply --input config=./example.conf --input dry_run=true
   ```

## Definition example

See `evals/` for input/output cases per method. Definitions use CEL for
computed fields and vault references for the host token.

## License

MIT for this fixture. Note that Swamp core is AGPL-3.0 with a Swamp Extension
and Definition Exception — read `COPYING-EXCEPTION` in the swamp repo before
choosing a license for a real extension.
