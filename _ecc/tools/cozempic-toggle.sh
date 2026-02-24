#!/usr/bin/env bash
# Toggle cozempic hooks in .claude/settings.json
# Usage: bash _ecc/tools/cozempic-toggle.sh [enable|disable|status]
#
# Adds/removes SessionStart, PreCompact, and Stop hooks for cozempic
# without touching existing ECC hooks (PreToolUse, PostToolUse).

set -euo pipefail

SETTINGS="${CLAUDE_PROJECT_DIR:-.}/.claude/settings.json"

if [[ ! -f "$SETTINGS" ]]; then
  echo "ERROR: $SETTINGS not found. Run from project root or set CLAUDE_PROJECT_DIR."
  exit 1
fi

# Check if cozempic hooks are present
has_cozempic() {
  python3 -c "
import json, sys
with open('$SETTINGS') as f:
    data = json.load(f)
hooks = data.get('hooks', {})
sys.exit(0 if 'SessionStart' in hooks or 'PreCompact' in hooks or 'Stop' in hooks else 1)
"
}

show_status() {
  if has_cozempic; then
    echo "cozempic: ENABLED"
    echo ""
    # Show guard config from SessionStart hook
    python3 -c "
import json
with open('$SETTINGS') as f:
    data = json.load(f)
hooks = data.get('hooks', {})
for event in ['SessionStart', 'PreCompact', 'Stop']:
    if event in hooks:
        for entry in hooks[event]:
            for h in entry.get('hooks', []):
                print(f'  {event}: {h[\"command\"][:80]}')
"
  else
    echo "cozempic: DISABLED"
  fi
}

enable_cozempic() {
  if has_cozempic; then
    echo "cozempic hooks already enabled."
    show_status
    return 0
  fi

  python3 -c "
import json

with open('$SETTINGS') as f:
    data = json.load(f)

hooks = data.setdefault('hooks', {})

hooks['SessionStart'] = [{
    'hooks': [{
        'type': 'command',
        'command': 'cozempic guard --daemon --cwd \"\$CLAUDE_PROJECT_DIR\" -rx gentle --threshold 50 --no-reload',
        'timeout': 5
    }]
}]

hooks['PreCompact'] = [{
    'hooks': [{
        'type': 'command',
        'command': 'cozempic treat current -rx gentle --execute',
        'timeout': 30
    }]
}]

hooks['Stop'] = [{
    'hooks': [{
        'type': 'command',
        'command': 'cozempic checkpoint current 2>/dev/null || true',
        'timeout': 10
    }]
}]

with open('$SETTINGS', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"

  echo "cozempic: ENABLED"
  echo "  SessionStart -> guard daemon (gentle, 50MB threshold)"
  echo "  PreCompact   -> gentle treat before compaction"
  echo "  Stop         -> checkpoint session state"
}

disable_cozempic() {
  if ! has_cozempic; then
    echo "cozempic hooks already disabled."
    return 0
  fi

  python3 -c "
import json

with open('$SETTINGS') as f:
    data = json.load(f)

hooks = data.get('hooks', {})
for key in ['SessionStart', 'PreCompact', 'Stop']:
    hooks.pop(key, None)

with open('$SETTINGS', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"

  echo "cozempic: DISABLED"
  echo "  Removed SessionStart, PreCompact, Stop hooks"
  echo "  ECC hooks (PreToolUse, PostToolUse) untouched"
}

case "${1:-status}" in
  enable)  enable_cozempic ;;
  disable) disable_cozempic ;;
  status)  show_status ;;
  *)
    echo "Usage: bash _ecc/tools/cozempic-toggle.sh [enable|disable|status]"
    exit 1
    ;;
esac
