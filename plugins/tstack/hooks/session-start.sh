#!/bin/sh
set -eu

# Each runtime's hooks file passes its own name.
# Literal plugin paths, so a static reader of the hooks files can follow them.
case "${1:-}" in
  claude)
    sheet="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/tstack-models.md"
    reader="${CLAUDE_PLUGIN_ROOT}/skills/setup-tstack/scripts/read-sheet.sh"
    ;;
  codex)
    sheet="${CODEX_HOME:-$HOME/.codex}/tstack-models.md"
    reader="${CLAUDE_PLUGIN_ROOT}/skills/setup-tstack/scripts/read-sheet.sh"
    ;;
  copilot)
    sheet="${COPILOT_HOME:-$HOME/.copilot}/tstack-models.md"
    reader="${COPILOT_PLUGIN_ROOT}/skills/setup-tstack/scripts/read-sheet.sh"
    ;;
  *)
    echo "session-start.sh: unknown runtime '${1:-}' (expected claude, codex, or copilot)" >&2
    exit 2
    ;;
esac

# A sheet that cannot be decoded counts as missing, so injection stays on.
found=0
normalized=
if [ -f "$sheet" ] && [ -r "$sheet" ]; then
  # FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): command substitution on Git
  # for Windows strips a trailing CRLF, CR included, which ate a CR the sheet
  # contract has to keep. The x sentinel leaves nothing for it to strip, and it
  # is appended only on success, so its absence still means the reader failed.
  decoded=$(sh "$reader" "$sheet" && printf x) || decoded=
  case "$decoded" in
    *x)
      normalized=${decoded%x}
      found=1
      ;;
  esac
fi
# FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): grep -x on Git for Windows
# strips a trailing CR, so a value of `off\r` compared equal to `off` and the
# hook turned itself off. The sheet contract drops exactly one CR before the
# LF; the shell compares whatever is left byte for byte.
off=0
while IFS= read -r line; do
  if [ "$line" = 'session hook: off' ]; then off=1; fi
done <<SHEET
$normalized
SHEET
if [ "$off" = 1 ]; then
  exit 0
fi

# GitHub Copilot parses stdout as one JSON object. Its sheet sits outside
# Copilot's path sandbox, so the hook checks the sheet and adds its role lines
# to the mandate, and the agent never reads the file.
if [ "$1" = copilot ]; then
  # FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): awk expands escape
  # sequences in a -v assignment, so a plugin root with backslash separators
  # lost them and every mandate file read back empty. ENVIRON does not.
  printf '%s\n' "$normalized" | TSTACK_HOOKS="${COPILOT_PLUGIN_ROOT}/hooks" LC_ALL=C awk -v found="$found" \
    -f "${COPILOT_PLUGIN_ROOT}/hooks/json.awk" \
    -f "${COPILOT_PLUGIN_ROOT}/skills/setup-tstack/scripts/sheet.awk" \
    -f "${COPILOT_PLUGIN_ROOT}/hooks/copilot-context.awk"
  exit 0
fi

cat "${CLAUDE_PLUGIN_ROOT}/hooks/session-start-context.md"
