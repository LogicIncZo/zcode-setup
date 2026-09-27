# zcode-setup

My ZCode setup, packaged for reuse: dynamic workflows, plugins, and custom commands.

## Layout

| Folder | What lives here |
| --- | --- |
| `workflows/` | Dynamic workflows (`.dwf.ts`) — multi-step agent pipelines you run by name |
| `plugins/` | ZCode plugins |
| `commands/` | Custom commands |

## Installing a workflow

Copy the file into `~/.zcode/workflows/` (available from every project on the machine) or a project's `.zcode/workflows/` (project-only):

```bash
cp workflows/dev-kickoff.dwf.ts ~/.zcode/workflows/
```

Then run it by name from any session, or from the Workflows hub. Requirements: [GitHub CLI](https://cli.github.com/) authenticated (`gh auth status`) and `git`.

## Workflows

### `dev-kickoff`

Starts a development session on a GitHub repo you own:

1. **Discover & pick** — lists every non-fork repo you can push to (your account + your orgs), most recently pushed first; with more than one candidate you pick interactively. Pass a `repo` argument to skip discovery.
2. **Clone or update** — clones into `base_dir`, or fetches an existing clone (never resets or stashes local work; reports branch and dirty-file count).
3. **Four parallel analysts** — an agent-loop readiness scorecard (instruction files like `AGENTS.md`, agent tool configs, verifiable build/test/lint commands, CI, environment reproducibility), ZCode plugin suggestions matched to the stack, a session digest (recent work, open PRs/issues, TODO hotspots, suggested first tasks), and an environment/bootstrap check.
4. **Cross-check & scaffold** — gap claims are verified against `git ls-files` before reporting, and a scaffold offer fires only for files that are genuinely missing — and only after you approve (existing files are never touched).
5. **Kickoff card** — a markdown artifact with the scorecard, gaps, plugin picks, first tasks, and environment state.

Arguments: `base_dir` (required — your projects folder), `repo` (optional `owner/name`; empty = discover and pick).

## Z.AI Coding

This setup is built and run with Z.AI's Coding plan.

👉Join now: https://z.ai/subscribe?ic=5CA0GFZ4CO
