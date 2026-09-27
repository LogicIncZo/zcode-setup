# Eval cases — destroy method

Untested fixture: documents the destructive-method contract.

## destroy

- Input: `force=false` on an instance with no applied config.
- Expected: no-op success; `state` remains `clean`.
- Guard: requires `swamp model get <name> --json` confirmation before running
  when a config is applied.
