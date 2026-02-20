#!/usr/bin/env bash
#
# lp-triage-cron.sh — Cron wrapper for daily LP Gmail triage
#
# Runs lp-triage.js and writes output to .lp-triage-latest (human)
# and .lp-triage-latest.json (machine). Session startup can check
# the file age and surface results.
#

set -euo pipefail

TC_HOME="/Users/mick/Dropbox/Development/tigerclaw"
NODE="/usr/local/bin/node"
SCRIPT="$TC_HOME/scripts/lp-triage.js"
OUT="$TC_HOME/.lp-triage-latest"
OUT_JSON="$TC_HOME/.lp-triage-latest.json"

# Ensure Google creds are accessible (gmail-monitor needs this)
export GOOGLE_CREDENTIALS_PATH="${GOOGLE_CREDENTIALS_PATH:-$HOME/.config/google/credentials.json}"

cd "$TC_HOME"

# Run triage — human-readable
"$NODE" "$SCRIPT" --hours=24 > "$OUT" 2>/dev/null || true

# Run triage — JSON
"$NODE" "$SCRIPT" --hours=24 --json > "$OUT_JSON" 2>/dev/null || true

# If there are items needing response, send a macOS notification
NEEDS=$(python3 -c "import json; d=json.load(open('$OUT_JSON')); print(len(d.get('needs_response',[])))" 2>/dev/null || echo "0")
if [ "$NEEDS" -gt 0 ]; then
  osascript -e "display notification \"$NEEDS LP emails need response\" with title \"LP Triage\" sound name \"Glass\"" 2>/dev/null || true
fi
