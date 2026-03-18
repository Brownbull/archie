#!/usr/bin/env bash
# aislop-report.sh — Run aislop scan and save report to docs/quality-reports/
#
# Usage:
#   scripts/aislop-report.sh              # Full scan, save report
#   scripts/aislop-report.sh --staged     # Staged files only
#   scripts/aislop-report.sh --changes    # Changed files only
#
# Reports saved to: docs/quality-reports/
#   - aislop-latest.json    (machine-readable, overwritten each run)
#   - aislop-latest.md      (human-readable summary, overwritten each run)
#   - history/              (timestamped copies, optional archive)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_DIR/docs/quality-reports"
HISTORY_DIR="$REPORT_DIR/history"

mkdir -p "$REPORT_DIR" "$HISTORY_DIR"

SCAN_FLAGS="${*:---staged}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
JSON_FILE="$REPORT_DIR/aislop-latest.json"

# Run aislop scan with JSON output, save directly to file
npx aislop scan $SCAN_FLAGS --json > "$JSON_FILE" 2>/dev/null || true

# Validate JSON
if [ ! -s "$JSON_FILE" ] || ! python3 -c "import json; json.load(open('$JSON_FILE'))" 2>/dev/null; then
  echo "aislop scan produced no valid JSON output"
  rm -f "$JSON_FILE"
  exit 0
fi

# Save timestamped copy to history
cp "$JSON_FILE" "$HISTORY_DIR/aislop-$TIMESTAMP.json"

# Generate human-readable markdown summary
python3 - "$JSON_FILE" "$TIMESTAMP" "$SCAN_FLAGS" <<'PYEOF' > "$REPORT_DIR/aislop-latest.md"
import json, sys

json_path = sys.argv[1]
timestamp = sys.argv[2]
scan_flags = sys.argv[3]

with open(json_path) as f:
    data = json.load(f)

score = data.get('score', '?')
label = data.get('label', '?')
engines = data.get('engines', {})
diagnostics = data.get('diagnostics', [])

lines = []
lines.append('# aislop Quality Report')
lines.append('')
lines.append(f'**Date:** {timestamp}')
lines.append(f'**Score:** {score}/100 ({label})')
lines.append(f'**Scan:** `aislop scan {scan_flags}`')
lines.append('')
lines.append('## Engine Summary')
lines.append('')
lines.append('| Engine | Issues | Time |')
lines.append('|--------|--------|------|')
for eng, info in engines.items():
    if not info.get('skipped', False):
        lines.append(f'| {eng} | {info["issues"]} | {info["elapsed"]:.0f}ms |')
lines.append('')

# Group non-format diagnostics by engine
by_engine = {}
for d in diagnostics:
    if d['engine'] == 'format':
        continue
    by_engine.setdefault(d['engine'], []).append(d)

if by_engine:
    lines.append('## Findings')
    lines.append('')
    for eng, issues in sorted(by_engine.items()):
        lines.append(f'### {eng} ({len(issues)})')
        lines.append('')
        for i in issues:
            sev = '!!!' if i['severity'] == 'error' else '!' if i['severity'] == 'warning' else 'i'
            line_num = i.get('line', '?')
            msg = i['message'][:120]
            lines.append(f'- [{sev}] `{i["filePath"]}:{line_num}` — {i["rule"]}: {msg}')
        lines.append('')
else:
    lines.append('No actionable findings.')

print('\n'.join(lines))
PYEOF

# Print summary to console
python3 - "$JSON_FILE" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
score = data.get('score', '?')
label = data.get('label', '?')
total = sum(e['issues'] for e in data.get('engines', {}).values())
print(f'\naislop: {score}/100 ({label}) — {total} issues')
print(f'Report: docs/quality-reports/aislop-latest.md')
print(f'JSON:   docs/quality-reports/aislop-latest.json')
PYEOF
