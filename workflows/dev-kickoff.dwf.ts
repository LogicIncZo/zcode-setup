/* zcode-workflow
description: "Start a dev session on a GitHub repo you own: discover/pick the
  repo, clone or fetch it into your projects folder, audit its agent-loop
  readiness, suggest ZCode plugins, build a dev digest and environment check,
  and publish a kickoff card."
whenToUse: At the start of any ZCode development session on one of your GitHub
  repositories — when you want the repo on disk with its loop setup, relevant
  plugins, and first tasks laid out before you start coding.
args:
  base_dir:
    type: string
    description: Local folder to clone into or update from (your projects
      directory).
    required: true
  repo:
    type: string
    description: Repository to work on, as "owner/name". Leave empty to
      discover all repos you own across your personal account and orgs and
      pick one interactively.
    required: false
    default: ""
*/
// dev-kickoff — discover a GitHub repo you own, clone it, audit its agent-loop
// readiness, and recommend ZCode plugins. Meant to be run at the start of a dev session.

interface RepoCandidate {
  /** Full "owner/name" identifier on GitHub. */
  nameWithOwner: string;
  /** Last push timestamp, ISO 8601; empty when unknown. */
  pushedAt: string;
  /** ADMIN / MAINTAIN / WRITE as gh reports it, or EXPLICIT when the user named the repo. */
  viewerPermission: string;
  /** Primary language name, or "unknown". */
  language: string;
}

interface AuditCheck {
  /** What was checked, e.g. "Agent instruction file (AGENTS.md)". */
  area: string;
  /** True when the thing checked is present in the repo. */
  present: boolean;
  /** Short evidence: the path(s) seen, or "not found". Keep under 120 chars, no pipe characters. */
  evidence: string;
  /** One sentence: what to do about it (empty when present and fine). */
  recommendation: string;
}

interface AuditGap {
  /** One sentence: what is missing. */
  what: string;
  /** Why it hurts the agent development loop, in one sentence. */
  why: string;
  /** How much it matters. Reserve "high" for "an agent cannot build or verify anything". */
  severity: "low" | "medium" | "high";
  /** Named path the gap refers to, repo-relative, or "" when it is not about one path. */
  path: string;
}

interface AuditResult {
  /** 0-100 readiness score for agent-loop development. */
  score: number;
  /** One or two sentences: overall state of the repo for loop engineering. */
  summary: string;
  checks: AuditCheck[];
  /** Gaps that materially hurt an agent loop. Empty when the repo is in good shape. */
  criticalGaps: AuditGap[];
}

interface PluginRecommendation {
  /** Plugin name as it appears in its marketplace. */
  name: string;
  /** Marketplace it comes from, e.g. "zcode-official". */
  source: string;
  /** One or two sentences: why this repo's development wants this plugin. */
  why: string;
}

interface PluginAdvice {
  /** Languages/frameworks/tooling detected in the repo. */
  stack: string[];
  /** At most 5, ranked most to least relevant. */
  recommendations: PluginRecommendation[];
  /** Names from the recommendation list that are already installed on this machine. */
  alreadyInstalled: string[];
}

interface DigestResult {
  /** One-liners for the most recent meaningful commits (max ~8). */
  recentWork: string[];
  /** Open issues and PRs worth knowing about, one line each with number. */
  openThreads: string[];
  /** TODO/FIXME concentrations, e.g. "src/parser.ts (7)". */
  todoHotspots: string[];
  /** 2-4 concrete suggestions for what to work on first in this session. */
  suggestedFirstTasks: string[];
}

interface EnvToolRow {
  /** Tool name, e.g. "node". */
  tool: string;
  /** Version the repo asks for, or "any". */
  required: string;
  /** Version found on this machine, or "not installed". */
  installed: string;
  ok: boolean;
}

interface EnvCheckResult {
  toolchain: EnvToolRow[];
  /** True when dependencies appear installed (node_modules, venv, etc.). */
  depsInstalled: boolean;
  /** Short practical notes (how to install deps, notable setup steps). */
  notes: string[];
  /** Things that stop build/test from running right now, one sentence each. */
  blockers: string[];
}

interface ScaffoldOutcome {
  /** True when the user approved creating files. */
  approved: boolean;
  /** Repo-relative paths actually written (empty when none). */
  wroteFiles: string[];
  /** One sentence on what happened. */
  note: string;
}

interface Finding {
  /** Path the finding is about, or the repo root marker "repo". */
  where: string;
  /** One sentence: what was found. */
  what: string;
  /** What showed it: lines read, or the command and output that proved it. */
  evidence: string;
  /** "verified" when a deterministic check confirmed it; "unconfirmed" otherwise. */
  status: "verified" | "unconfirmed";
  /** How much it matters. Reserve "high" for data loss, a crash, or a wrong result. */
  severity: "low" | "medium" | "high";
}

interface WorkflowReport {
  /** Two or three sentences answering what the user asked for. */
  conclusion: string;
  findings: Finding[];
  /** What the run checked and how: the commands it ran, the files it covered. */
  verified: string[];
  /** What the run did not look at or could not check, and why. */
  notCovered: string[];
}

const baseDir = typeof args.base_dir === "string" ? args.base_dir.trim() : "";
if (baseDir === "") {
  return {
    conclusion:
      "No base_dir given. Pass the local folder to clone into (your projects directory), e.g. base_dir: /home/you/projects.",
    findings: [],
    verified: [],
    notCovered: ["nothing ran — base_dir is required"],
  };
}
const repoArg =
  typeof args.repo === "string" && args.repo.trim() !== "" ? args.repo.trim() : "";

function parseRepos(json: string): RepoCandidate[] {
  const raw = JSON.parse(json) as Array<{
    nameWithOwner?: string;
    pushedAt?: string;
    viewerPermission?: string;
    isFork?: boolean;
    primaryLanguage?: { name?: string } | null;
  }>;
  const seen = new Set<string>();
  const out: RepoCandidate[] = [];
  for (const r of raw) {
    if (typeof r.nameWithOwner !== "string" || typeof r.pushedAt !== "string") continue;
    if (r.isFork === true) continue;
    const perm = typeof r.viewerPermission === "string" ? r.viewerPermission : "READ";
    if (perm !== "ADMIN" && perm !== "MAINTAIN" && perm !== "WRITE") continue;
    if (seen.has(r.nameWithOwner)) continue;
    seen.add(r.nameWithOwner);
    out.push({
      nameWithOwner: r.nameWithOwner,
      pushedAt: r.pushedAt,
      viewerPermission: perm,
      language: typeof r.primaryLanguage?.name === "string" ? r.primaryLanguage.name : "unknown",
    });
  }
  out.sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : -1));
  return out;
}

function clean(text: string): string {
  return text.split("|").join("/").trim();
}

phase("Find repositories you own");
let candidates: RepoCandidate[] = [];
const discoveryNotes: string[] = [];
if (repoArg !== "") {
  const view = await world.run(
    "gh",
    ["repo", "view", repoArg, "--json", "nameWithOwner,pushedAt,viewerPermission,isFork,primaryLanguage"],
  );
  if (view.exitCode !== 0) {
    return {
      conclusion: `Could not look up ${repoArg}: ${clean(view.stderr).slice(0, 300)}`,
      findings: [],
      verified: [],
      notCovered: ["nothing ran — the repository lookup failed"],
    };
  }
  candidates = parseRepos(view.stdout);
  if (candidates.length === 0) {
    // The user named this repo explicitly; accept it even if it is a fork or read-only.
    candidates = [{ nameWithOwner: repoArg, pushedAt: "", viewerPermission: "EXPLICIT", language: "unknown" }];
  }
} else {
  const orgsRes = await world.run("gh", ["api", "/user/memberships/orgs", "--jq", ".[].organization.login"]);
  const loginRes = await world.run("gh", ["api", "/user", "--jq", ".login"]);
  const login = loginRes.exitCode === 0 ? loginRes.stdout.trim() : "";
  const owners = login !== "" ? [login] : [];
  if (login === "") {
    discoveryNotes.push("could not resolve your GitHub login; searched org memberships only");
  }
  if (orgsRes.exitCode === 0) {
    for (const line of orgsRes.stdout.split("\n")) {
      const o = line.trim();
      if (o !== "") owners.push(o);
    }
  } else {
    discoveryNotes.push("could not list org memberships; searched personal repos only");
  }
  const lists = await Promise.all(
    owners.map((owner) =>
      world.run("gh", [
        "repo", "list", owner, "--limit", "200", "--json",
        "nameWithOwner,pushedAt,viewerPermission,isFork,primaryLanguage",
      ]),
    ),
  );
  const seen = new Set<string>();
  for (let i = 0; i < lists.length; i++) {
    const res = lists[i];
    if (res === undefined || res.exitCode !== 0) {
      discoveryNotes.push(`skipped ${owners[i]} — gh list failed`);
      continue;
    }
    for (const c of parseRepos(res.stdout)) {
      if (!seen.has(c.nameWithOwner)) {
        seen.add(c.nameWithOwner);
        candidates.push(c);
      }
    }
  }
  log(`Found ${candidates.length} ownable non-fork repos across ${owners.length} owners`);
}
if (candidates.length === 0) {
  return {
    conclusion: "No repositories you own (non-fork, with admin/maintain/write permission) were found.",
    findings: [],
    verified: ["discovery ran gh repo list for the personal account and every active org"],
    notCovered: discoveryNotes,
  };
}

phase("Pick a repository and get it onto disk");
let chosen = candidates[0];
if (candidates.length > 1) {
  const top = candidates.slice(0, 15);
  chosen = await agent("Repo picker", {
    system:
      "You help the user pick one GitHub repository to start a development session on. " +
      "Present options clearly and never invent a choice the user did not make. " +
      "If anything about the choice is ambiguous, escalate and ask rather than guessing.",
  }).ask<RepoCandidate>(
    "The user is starting a development session and must pick one GitHub repository to work on. " +
      "Escalate a question to the user presenting these candidates, most recently pushed first, " +
      "one per line as \"N. owner/name — language (permission, last push YYYY-MM-DD)\", and say the user may " +
      `also name any other repository they own (these ${candidates.length} are only the ones found). ` +
      "When the user answers, return exactly the repository they chose — for a repository not on the list, " +
      "return it with empty pushedAt, viewerPermission EXPLICIT and language unknown.\n\n" +
      top
        .map(
          (c) =>
            `- ${c.nameWithOwner} — ${c.language} (${c.viewerPermission}, pushed ${c.pushedAt.slice(0, 10)})`,
        )
        .join("\n"),
  );
}
const nameWithOwner = chosen.nameWithOwner;
const repoName = nameWithOwner.split("/")[1] ?? nameWithOwner;
const destSimple = baseDir + "/" + repoName;
const destFallback = baseDir + "/" + nameWithOwner.replace("/", "--");
let dest = destSimple;
let action = "cloned";
const probe = await world.run("test", ["-d", destSimple]);
if (probe.exitCode === 0) {
  const remote = await world.run("git", ["-C", destSimple, "remote", "get-url", "origin"]);
  if (remote.exitCode === 0 && remote.stdout.includes(nameWithOwner)) {
    dest = destSimple;
    action = "updated";
    await world.run("git", ["-C", dest, "fetch", "--all", "--quiet"], { timeoutMs: 120000 });
  } else {
    dest = destFallback;
  }
}
if (action !== "updated") {
  const exists = await world.run("test", ["-d", dest]);
  if (exists.exitCode === 0) {
    return {
      conclusion: `${dest} already exists but is not ${nameWithOwner}; not overwriting it. Rename or move it first.`,
      findings: [],
      verified: [`checked for existing directory with test -d ${dest}`],
      notCovered: ["clone and all analysis — blocked by the directory conflict"],
    };
  }
  const clone = await world.run("gh", ["repo", "clone", nameWithOwner, dest], { timeoutMs: 600000 });
  if (clone.exitCode !== 0) {
    return {
      conclusion: `Cloning ${nameWithOwner} failed: ${clean(clone.stderr).slice(0, 300)}`,
      findings: [],
      verified: [],
      notCovered: ["analysis — blocked by the failed clone"],
    };
  }
}
const statusRes = await world.run("git", ["-C", dest, "status", "--porcelain=v1", "-b"]);
let branch = "unknown";
let dirtyCount = 0;
for (const line of statusRes.stdout.split("\n")) {
  if (line.startsWith("## ")) {
    const rest = line.slice(3).trim();
    branch = rest.split("...")[0]?.trim() ?? rest;
  } else if (line.trim() !== "") {
    dirtyCount++;
  }
}
log(`${action} ${nameWithOwner} at ${dest} (branch ${branch}, ${dirtyCount} dirty files)`);
report({ repo: nameWithOwner, location: dest, action, branch, dirtyFiles: dirtyCount });

phase("Analyze the repository from four angles in parallel");
const noEdit = "The repository is on local disk. Inspect it with your own file and command tools. Do not edit, create, or delete any file. Answer in English.";
const auditP = agent("Loop-readiness auditor", {
  system:
    "You audit whether a repository is set up for effective AI-agent development loops (\"loop engineering\"): " +
    "agent instruction files, agent tool configs, hooks, verification commands an agent can run itself, CI, and " +
    "environment reproducibility. You are precise about present versus absent and cite repo-relative paths as " +
    "evidence for every check. Say plainly what you could not determine. If your instructions conflict with " +
    "reality, escalate and say so rather than working around it.",
}).ask<AuditResult>(
  `Audit the repository at ${dest} (GitHub: ${nameWithOwner}) for agent-loop readiness. Check:\n` +
    "1. Agent instruction files: AGENTS.md, ZCODE.md, CLAUDE.md, GEMINI.md, .cursorrules, .github/copilot-instructions.md.\n" +
    "2. Agent tool configs: .zcode/, .claude/, .cursor/, .codex/ directories; .mcp.json; hooks; project skills or commands.\n" +
    "3. Verification loop: build/test/lint commands an agent could run (package.json scripts, Makefile, justfile, " +
    "pyproject/tox, etc.) — confirm they actually exist and say what they are; pre-commit config.\n" +
    "4. CI: .github/workflows and what it runs.\n" +
    "5. Environment reproducibility: devcontainer, mise/asdf/.tool-versions, nix, direnv, lockfiles, README setup steps.\n" +
    "Score 0-100 (100 = an agent session could be productive immediately with zero setup guessing). " +
    "Every check gets cited path evidence. criticalGaps only for things that materially hurt an agent loop — " +
    "use path for the named file/dir the gap refers to, or empty string when it is not about one path. " +
    "Keep evidence under 120 characters, no pipe characters. " + noEdit,
);
const pluginsP = agent("Plugin advisor", {
  system:
    "You are a pragmatic ZCode power user who matches repositories to ZCode plugins that would genuinely help " +
    "developing them — never padding a list to look thorough. You know the installed plugin landscape on this " +
    "machine (~/.zcode/cli/plugins) and what the marketplaces offer. Do not edit any file.",
}).ask<PluginAdvice>(
  `The user is about to start ZCode development on the repository at ${dest} (${nameWithOwner}).\n` +
    "First detect the stack by reading its manifests and key files (languages, frameworks, package manager, " +
    "test runner, docs/tooling artifacts like .md doc sets, OpenAPI specs, browser UIs, desktop-app tooling).\n" +
    "Then recommend at most 5 ZCode plugins for developing THIS repo, ranked. Draw from these known marketplaces:\n" +
    "- zcode-official: browser-use (browser automation and GUI testing of web apps), computer-use (native desktop " +
    "app automation), documents (docx), pdf, presentations (pptx), spreadsheets (xlsx), plugin-creator (building " +
    "ZCode plugins), skill-creator (authoring skills).\n" +
    "- claude-official: superpowers (disciplined dev-process skills: TDD, debugging, planning, code review) and " +
    "roughly 280 more; if the repo clearly wants something not listed above, name it from claude-official with a " +
    "caveat that you have not verified its exact name.\n" +
    "Also list ~/.zcode/cli/plugins contents to mark which recommendations are already installed. " +
    "Tie every why to something concrete you saw in the repo. " + noEdit,
);
const digestP = agent("Session digest analyst", {
  system:
    "You are a fast scout who tells a developer what state their project is in and what is worth doing next, " +
    "in concrete terms with issue/commit numbers — never vague. Do not edit any file.",
}).ask<DigestResult>(
  `Build a development digest for the repository at ${dest} (GitHub: ${nameWithOwner}).\n` +
    `Useful commands: git -C ${dest} log --oneline -15; gh issue list -R ${nameWithOwner} --limit 10 --state open; ` +
    `gh pr list -R ${nameWithOwner} --limit 10 --state open; and search for TODO/FIXME/HACK in the repo ` +
    "(report only real concentrations). suggestedFirstTasks must be concrete things a session could do today, " +
    "grounded in what you saw — not generic advice. " + noEdit,
);
const envP = agent("Environment checker", {
  system:
    "You check whether a repository's toolchain and dependencies are ready to run on this machine, read-only: " +
    "you never install anything, never run builds or test suites, and never edit files. Version checks and " +
    "directory listings only. Say plainly what you could not check.",
}).ask<EnvCheckResult>(
  `Check environment readiness for the repository at ${dest}.\n` +
    "1. From manifests (.nvmrc, .python-version, package.json engines, pyproject requires-python, Dockerfile " +
    "FROM, etc.) determine required toolchain; check installed versions with version commands (node --version, " +
    "python3 --version, etc.) run inside the repo directory.\n" +
    "2. Dependencies present? node_modules/, venv/.venv populated, vendor dirs — report what you actually see.\n" +
    "3. Note the README's setup/quickstart commands if any.\n" +
    "blockers = only things that stop build or test from running right now. " + noEdit,
);

phase("Cross-check the audit's claims against the files");
const audit = await auditP;
report({ area: "loop-readiness", score: audit.score, summary: audit.summary });
const tracked = await world.run("git", ["-C", dest, "ls-files"]);
const porcelain = await world.run("git", ["-C", dest, "status", "--porcelain"]);
const fileSet = new Set<string>();
for (const line of tracked.stdout.split("\n")) {
  const p = line.trim();
  if (p === "") continue;
  fileSet.add(p);
  fileSet.add(p.split("/")[0] ?? p);
}
for (const line of porcelain.stdout.split("\n")) {
  const p = line.slice(3).trim();
  if (p === "") continue;
  fileSet.add(p);
  fileSet.add(p.split("/")[0] ?? p);
}
// Deterministic second opinion on every critical gap that is about a named path:
// a claimed-missing path that IS on disk (or vice versa) downgrades the finding.
const gapStatus = (gap: AuditGap): "verified" | "unconfirmed" => {
  if (gap.path === "") return "unconfirmed";
  if (!gap.what.toLowerCase().includes("no ") && !gap.what.toLowerCase().includes("missing")) return "unconfirmed";
  return fileSet.has(gap.path) ? "unconfirmed" : "verified";
};

let scaffold: ScaffoldOutcome | null = null;
// Only offer scaffolding for gaps that name a path the cross-check confirmed is
// genuinely absent — never for files that already exist.
const scaffoldable = audit.criticalGaps.filter(
  (g) =>
    g.path !== "" &&
    !fileSet.has(g.path) &&
    (g.what.toLowerCase().includes("no ") || g.what.toLowerCase().includes("missing")),
);
if (scaffoldable.length > 0) {
  phase("Offer to scaffold the missing setup files");
  scaffold = await agent("Setup scaffolder", {
    system:
      "You prepare repositories for AI-agent development loops by writing minimal, honest setup files. " +
      "You create files only with explicit user approval, you write only what was agreed, and you leave " +
      "everything uncommitted for review. Never modify or delete an existing file. If the repository does not " +
      "give you enough to write something true, escalate and say so rather than inventing content.",
  }).ask<ScaffoldOutcome>(
    `The repository at ${dest} (${nameWithOwner}) is missing these files that its loop-readiness audit flagged:\n` +
      scaffoldable.map((g) => `- [${g.severity}] ${g.what} → create ${g.path}`).join("\n") +
      "\n\nEscalate a yes/no question to the user offering to scaffold exactly these missing files, each tailored " +
      "to this repository: project purpose (from README), directory layout, build/test/lint commands you observed, " +
      "and conventions. For an agent-instruction gap, default to a starter AGENTS.md unless the gap names another " +
      "file. The question must name the exact file paths and say they will be left uncommitted. If approved, " +
      "inspect the repo and write only the listed files; if declined or the repo gives you nothing true to write, " +
      "return approved=false. wroteFiles lists repo-relative paths you actually wrote.",
  );
  if (scaffold.approved && scaffold.wroteFiles.length > 0) {
    for (const f of scaffold.wroteFiles) {
      const check = await world.run("test", ["-f", dest + "/" + f.replace(/^\/+/, "")]);
      if (check.exitCode !== 0) {
        scaffold.note += ` (warning: ${f} was reported written but not found on disk)`;
      }
    }
  }
}

const [plugins, digest, env] = await Promise.all([pluginsP, digestP, envP]);
report({ area: "plugin-advice", stack: plugins.stack, top: plugins.recommendations[0]?.name ?? "none" });
report({ area: "session-digest", firstTasks: digest.suggestedFirstTasks });
report({ area: "environment", blockers: env.blockers.length, depsInstalled: env.depsInstalled });

const findings: Finding[] = [];
for (const gap of audit.criticalGaps) {
  findings.push({
    where: gap.path === "" ? dest : dest + "/" + gap.path,
    what: `${gap.what} — ${gap.why}`,
    evidence:
      gapStatus(gap) === "verified"
        ? `path absent from git ls-files and git status output for ${dest}`
        : `auditor report; path "${gap.path}" not deterministically cross-checked`,
    status: gapStatus(gap),
    severity: gap.severity === "high" ? "high" : gap.severity,
  });
}
for (const b of env.blockers) {
  findings.push({
    where: dest,
    what: b,
    evidence: "environment checker's read of the repo and machine",
    status: "unconfirmed",
    severity: "medium",
  });
}

const notCovered: string[] = [
  "plugin recommendations are advisory — not verified against live marketplace listings",
  "the test/build commands were identified but never executed",
  "issue and PR lists reflect the moment the run executed",
];
notCovered.push(...discoveryNotes);

const verified: string[] = [
  `discovery via gh repo list across personal account + active orgs (${candidates.length} ownable non-fork repos)`,
  `${action} ${nameWithOwner}; branch/dirty state via git status in ${dest}`,
  "presence of named paths in critical gaps cross-checked against git ls-files + git status",
];
if (scaffold !== null && scaffold.approved && scaffold.wroteFiles.length > 0) {
  verified.push(`scaffolded files confirmed on disk with test -f: ${scaffold.wroteFiles.join(", ")}`);
}

const topPlugin = plugins.recommendations[0];
const conclusion =
  `${nameWithOwner} is ${action === "updated" ? "already on disk and fetched" : "cloned"} at ${dest} ` +
  `(branch ${branch}, ${dirtyCount} dirty files). Loop-readiness scored ${audit.score}/100: ${audit.summary}` +
  (audit.criticalGaps.length > 0
    ? ` ${audit.criticalGaps.length} critical gap(s)${scaffold !== null && scaffold.approved ? "; scaffolded " + scaffold.wroteFiles.join(", ") : ""}.`
    : ".") +
  (topPlugin !== undefined ? ` Top plugin pick: ${topPlugin.name} — ${topPlugin.why}` : "");

const md = [
  `# Dev kickoff — ${nameWithOwner}`,
  "",
  `**Location:** \`${dest}\` — ${action === "updated" ? "already cloned, fetched latest" : "freshly cloned"} · **Branch:** ${branch} · **Dirty files:** ${dirtyCount}`,
  `**Detected stack:** ${plugins.stack.length > 0 ? plugins.stack.join(", ") : "not determined"}`,
  "",
  `## Loop-readiness: ${audit.score}/100`,
  audit.summary,
  "",
  "| Area | Status | Evidence |",
  "| --- | --- | --- |",
  ...audit.checks.map(
    (c) => `| ${clean(c.area)} | ${c.present ? "present" : "missing"} | ${clean(c.evidence)} |`,
  ),
  "",
];
if (audit.criticalGaps.length > 0) {
  md.push("## Critical gaps", "");
  for (const f of findings.filter((f) => f.severity !== undefined && audit.criticalGaps.some((g) => `${g.what} — ${g.why}` === f.what))) {
    md.push(`- **[${f.severity}]** ${f.what} *(${f.status})*`);
  }
  if (scaffold !== null) {
    md.push("", `**Scaffold offer:** ${scaffold.note}${scaffold.approved ? "" : " (nothing written)"}`);
  }
  md.push("");
}
if (plugins.recommendations.length > 0) {
  md.push(
    "## Suggested ZCode plugins",
    "",
    ...plugins.recommendations.map(
      (r) =>
        `- **${r.name}** (${r.source})${plugins.alreadyInstalled.includes(r.name) ? " — already installed" : ""}: ${r.why}`,
    ),
    "",
  );
}
md.push(
  "## What to work on first",
  "",
  ...digest.suggestedFirstTasks.map((t) => `- ${t}`),
  "",
);
if (digest.openThreads.length > 0) {
  md.push("**Open threads:** " + digest.openThreads.join(" · "), "");
}
if (digest.todoHotspots.length > 0) {
  md.push("**TODO/FIXME hotspots:** " + digest.todoHotspots.join(", "), "");
}
if (digest.recentWork.length > 0) {
  md.push("**Recent work:**", ...digest.recentWork.map((r) => `- ${r}`), "");
}
md.push(
  "## Environment readiness",
  "",
  `**Dependencies installed:** ${env.depsInstalled ? "yes" : "no"}`,
  "",
  "| Tool | Required | Installed | OK |",
  "| --- | --- | --- | --- |",
  ...env.toolchain.map((t) => `| ${t.tool} | ${clean(t.required)} | ${clean(t.installed)} | ${t.ok ? "yes" : "no"} |`),
  "",
);
if (env.blockers.length > 0) {
  md.push("**Blockers right now:**", ...env.blockers.map((b) => `- ${b}`), "");
}
if (env.notes.length > 0) {
  md.push("**Notes:**", ...env.notes.map((n) => `- ${n}`), "");
}
md.push("## Limits", "", ...notCovered.map((n) => `- ${n}`));

await artifact.markdown("kickoff", md.join("\n"), {
  title: `Dev kickoff — ${repoName}`,
  description: `Loop-readiness ${audit.score}/100, plugin picks, first tasks, and environment state for ${nameWithOwner}.`,
  primary: true,
});

const result: WorkflowReport = { conclusion, findings, verified, notCovered };
return result;