#!/bin/sh
# Decode the sheet once, before any consumer interprets its lines. PowerShell
# 5.1 writes UTF-16LE; other writers may add a UTF-8 BOM or CRLF line endings.
set -eu
sheet=$1
[ -f "$sheet" ] && [ -r "$sheet" ] || exit 1
# FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): command substitution on Git
# for Windows strips a trailing CRLF, CR included, not just the LF. That ate a
# CR the contract has to keep. The x sentinel makes the substitution strip
# nothing, so $text is the decoded bytes exactly.
if [ "$(od -An -tx1 -N2 "$sheet" | tr -d ' ')" = fffe ]; then
  text=$(iconv -f UTF-16LE -t UTF-8 "$sheet"; printf x)
else
  text=$(cat "$sheet"; printf x)
fi
text=${text%x}
bom=$(printf '\357\273\277')
cr=$(printf '\r')
# FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): sed on Git for Windows treats
# CRLF as the line terminator, so it dropped that CR and the substitution then
# dropped a second one. The contract drops exactly one. read -r keeps every CR,
# so the single removal below is the only one.
# $text now carries its own trailing newline, so emit it as is. The read test
# keeps a final line that has no newline, which a sheet is allowed to end on.
printf '%s' "$text" | {
  first=1
  while IFS= read -r line || [ -n "$line" ]; do
    if [ "$first" = 1 ]; then
      line=${line#"$bom"}
      first=0
    fi
    printf '%s\n' "${line%"$cr"}"
  done
}
