---
description: Search the swamp-club.com extensions registry and list matching extensions
argument-hint: <query> [page N]
allowed-tools: WebFetch, WebSearch
---

# Swamp Registry Search

Search the Swamp extensions registry (swamp-club.com/extensions, ~1,600 items)
for extensions matching the user's query, and report the matches with enough
metadata to pick one.

User's query: **$ARGUMENTS**

## Procedure

1. **Parse the arguments.** Everything is the search query, except a trailing
   `page N` (or bare integer), which selects the results page (24 results per
   page).
2. **Fetch the search.** Use WebFetch on:

   ```
   https://swamp-club.com/extensions?q=<url-encoded query>[&page=N]
   ```

   The registry searches server-side (verified: `?q=docker` returns 44 of
   1,603 items). There is **no content-type URL filter** — if the user asked
   for a specific type (model, report, workflow, skill, vault, datastore,
   driver), filter the fetched results yourself by card text, and confirm
   type on the detail page during drill-down.
3. **Extract per match** (verified card fields): namespaced id (`@scope/name`),
   description, version, last-update date, pull count, quality grade (letter +
   score /100). Cards do **not** show content type or channel — get those from
   the detail page or `swamp extension info` if the user needs them.
4. **Report:**
   - First line: total matches found and which page/range is shown.
   - A table of the matches, best candidates first (weigh quality grade and
     pull count; say so when ordering is your judgment, not the registry's).
   - The search URL as a clickable link so the user can browse further.
   - If nothing matched, say so, then retry once with broader or split terms
     before giving up. Facet labels make good queries: aws, gcp, kubernetes,
     docker, ssh, terraform, observability, security.
5. **Drill down only if the user asked for detail or only one strong match
   remains:** prefer `swamp extension info <name>` when the CLI is installed;
   otherwise WebFetch `https://swamp-club.com/extensions/<@scope/name>`.
   Report: what it wraps, methods/inputs, install line, license.

## Honesty rules

- Never invent extensions, versions, or grades — only report what the fetched
  page actually shows. If the fetch fails, say the registry was unreachable
  and offer to retry.
- If the results are ambiguous (e.g. many partial-name hits), present the
  shortlist and let the user choose; do not silently pick one.
