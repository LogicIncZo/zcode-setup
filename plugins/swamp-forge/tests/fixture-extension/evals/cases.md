# Eval cases — @swamp-forge/fixture-model

Untested fixture: these cases document intent, they have never been run.

## status

- Input: instance with host=`demo.example.internal`, token from vault
  `vaults/example-host/token`.
- Expected: JSON output containing `version` (string) and `state` in
  {clean, applied}.

## apply

- Input: `config=./example.conf`, `dry_run=true`.
- Expected: exit 0; output reports planned changes; no state change observed on
  a follow-up `status`.
