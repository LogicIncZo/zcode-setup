#!/usr/bin/env bash
# grade-extension.sh — local quality score for a Swamp extension directory.
# Approximates the swamp-club registry's observable quality signals (/100, A–D).
# The exact registry rubric is not public; this is a pre-flight check, not a guarantee.
#
# Usage: bash grade-extension.sh <extension-dir>
# Exit codes: 0 = report produced, 1 = usage/argument error.

set -u

if [ $# -ne 1 ]; then
  echo "usage: bash grade-extension.sh <extension-dir>" >&2
  exit 1
fi

EXT_DIR="$1"
if [ ! -d "$EXT_DIR" ]; then
  echo "error: not a directory: $EXT_DIR" >&2
  exit 1
fi

SCORE=0
N_FAILURES=0
FAIL_LIST=""

pass() { SCORE=$((SCORE + $2)); printf '  [ ok ] %s (+%d)\n' "$1" "$2"; }
fail() {
  printf '  [FAIL] %s (0/%d)\n' "$1" "$2"
  N_FAILURES=$((N_FAILURES + 1))
  FAIL_LIST="$FAIL_LIST  - $1"$'\n'
}
warn() { printf '  [WARN] %s (partial, +%d/%d)\n' "$1" "$2" "$3"; SCORE=$((SCORE + $2)); }

echo "Grading extension: $EXT_DIR"
echo "=================================================="

# --- 1. Metadata file (15) -----------------------------------------------
META_FILE=""
for candidate in extension.yaml extension.yml swamp.yaml package.json; do
  if [ -f "$EXT_DIR/$candidate" ]; then META_FILE="$EXT_DIR/$candidate"; break; fi
done
echo "-- metadata"
if [ -n "$META_FILE" ]; then
  pass "metadata file present ($(basename "$META_FILE"))" 15
else
  fail "no metadata file (expected extension.yaml, extension.yml, swamp.yaml, or package.json)" 15
fi

# --- 2. Namespacing (10) -------------------------------------------------
echo "-- namespacing"
META_CONTENT=""
[ -n "$META_FILE" ] && META_CONTENT="$(cat "$META_FILE" 2>/dev/null)"
if echo "$META_CONTENT" | grep -Eq '@[a-zA-Z0-9][a-zA-Z0-9_-]*/[a-zA-Z0-9][a-zA-Z0-9_./-]*'; then
  pass "namespaced id found (@scope/name)" 10
else
  fail "no @scope/name identifier in metadata (registry requires namespaced names)" 10
fi

# --- 3. Dated version (10) ----------------------------------------------
echo "-- versioning"
if echo "$META_CONTENT" | grep -Eq 'v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+'; then
  pass "dated version vYYYY.MM.DD.N found" 10
elif echo "$META_CONTENT" | grep -Eq '(^|[^0-9])v?[0-9]+\.[0-9]+\.[0-9]+([^0-9.]|$)'; then
  warn "semver found, registry expects dated vYYYY.MM.DD.N" 3 10
else
  fail "no version in metadata (expected vYYYY.MM.DD.N)" 10
fi

# --- 4. README (15) ------------------------------------------------------
echo "-- readme"
README_LINES=0
if [ -f "$EXT_DIR/README.md" ]; then
  README_LINES=$(grep -c '[^[:space:]]' "$EXT_DIR/README.md" 2>/dev/null)
  README_LINES=${README_LINES:-0}
fi
if [ "$README_LINES" -ge 15 ] && grep -qiE 'usage|quickstart|example|getting started' "$EXT_DIR/README.md" 2>/dev/null; then
  pass "README substantial with usage section ($README_LINES lines)" 15
elif [ "$README_LINES" -ge 5 ]; then
  warn "README exists but thin or missing usage section ($README_LINES lines)" 7 15
else
  fail "README missing or nearly empty" 15
fi

# --- 5. Content present (15) --------------------------------------------
echo "-- content"
CONTENT_DIRS="models workflows skills vaults datastores reports drivers"
HAS_CONTENT=0
CONTENT_LABEL=""
for d in $CONTENT_DIRS; do
  if [ -d "$EXT_DIR/$d" ] && [ -n "$(ls -A "$EXT_DIR/$d" 2>/dev/null)" ]; then
    HAS_CONTENT=1
    CONTENT_LABEL="$d"
    break
  fi
done
if [ "$HAS_CONTENT" -eq 1 ]; then
  pass "content present ($CONTENT_LABEL/)" 15
else
  fail "no content directories with files (expected one of: $CONTENT_DIRS)" 15
fi

# --- 6. Evals (10) -------------------------------------------------------
echo "-- evals"
EVAL_COUNT=0
if [ -d "$EXT_DIR/evals" ]; then
  EVAL_COUNT=$(find "$EXT_DIR/evals" -type f | wc -l)
fi
if [ "$EVAL_COUNT" -ge 2 ]; then
  pass "evals present ($EVAL_COUNT files)" 10
elif [ "$EVAL_COUNT" -eq 1 ]; then
  warn "only one eval file (aim for one case per method)" 5 10
else
  fail "no evals/ directory with cases" 10
fi

# --- 7. License note (10) ------------------------------------------------
echo "-- license"
LICENSE_HIT=0
for f in "$EXT_DIR"/LICENSE* "$EXT_DIR"/COPYING* "$EXT_DIR"/LICENSE-NOTE*; do
  [ -f "$f" ] && LICENSE_HIT=1 && break
done
if [ "$LICENSE_HIT" -eq 0 ] && [ -f "$EXT_DIR/README.md" ] \
   && grep -qiE '^#+ *licen[cs]e|licen[cs]e:' "$EXT_DIR/README.md" 2>/dev/null; then
  LICENSE_HIT=1
fi
if [ "$LICENSE_HIT" -eq 1 ]; then
  pass "license file or license section present" 10
else
  fail "no license file or section (swamp core is AGPL-3.0 + extension exception — read COPYING-EXCEPTION)" 10
fi

# --- 8. Secret hygiene (10) ---------------------------------------------
echo "-- secret hygiene"
SECRET_HITS=""
if [ "$HAS_CONTENT" -eq 1 ] || [ -n "$META_CONTENT" ]; then
  SECRET_HITS=$(grep -rInE \
    -e 'AKIA[0-9A-Z]{16}' \
    -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
    -e 'ghp_[A-Za-z0-9]{20,}' \
    -e 'github_pat_[A-Za-z0-9_]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e '(aws_secret_access_key|secret_access_key)[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{20,}' \
    "$EXT_DIR" \
    --exclude-dir=.git 2>/dev/null | head -5)
fi
if [ -z "$SECRET_HITS" ]; then
  pass "no obvious secrets detected (heuristic scan)" 10
else
  fail "possible secrets found — move to vaults, never inline:" 10
  echo "$SECRET_HITS" | sed 's/^/         /'
fi

# --- 9. Changelog (5) ----------------------------------------------------
echo "-- changelog"
if [ -f "$EXT_DIR/CHANGELOG.md" ] || echo "$META_CONTENT" | grep -Eq 'changelog'; then
  pass "changelog present" 5
else
  fail "no CHANGELOG.md" 5
fi

# --- Summary -------------------------------------------------------------
echo "=================================================="
GRADE=D
if [ "$SCORE" -ge 85 ]; then GRADE=A;
elif [ "$SCORE" -ge 70 ]; then GRADE=B;
elif [ "$SCORE" -ge 50 ]; then GRADE=C; fi

echo "Score: $SCORE/100  Grade: $GRADE"
if [ "$N_FAILURES" -gt 0 ]; then
  echo "Fix list (in order):"
  printf '%s' "$FAIL_LIST"
fi
echo "Note: local approximation of registry signals; the registry's rubric is not public."
exit 0
