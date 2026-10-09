# Prints the GitHub Copilot SessionStart output: one JSON object whose
# additionalContext is the solo mandate with the Copilot notes inside its
# closing tag. Run after json.awk and setup-tstack's sheet.awk, with the sheet
# as input, TSTACK_HOOKS=<this directory> in the environment, and
# -v found=<1 when the sheet exists>.
# Only a valid sheet's known role lines reach the context, rebuilt from their
# checked values, so no other text in the sheet does.
{ sheet_add($0) }

END {
  n = sheet_roles(roles, panel)
  notes = text("session-start-copilot.md")
  problems = found ? sheet_problems() : "no sheet"
  if (problems == "") {
    notes = notes "\n\n" text("session-start-copilot-sheet.md") "\n"
    for (i = 1; i <= n; i++) notes = notes "\n" roles[i] ": " VALUE[roles[i]]
    if ("default effort" in VALUE) notes = notes "\ndefault effort: " VALUE["default effort"]
  } else {
    if (found) notes = notes "\n\nsheet invalid: " problems
    notes = notes "\n\n" text("session-start-copilot-setup.md")
  }
  body = text("session-start-context.md")
  close_tag = "</EXTREMELY_IMPORTANT>"
  i = index(body, close_tag)
  if (i) body = substr(body, 1, i - 1) "\n" notes "\n" substr(body, i)
  else body = body "\n" notes
  n = split(body "\n", L, "\n")
  out = ""
  for (i = 1; i <= n; i++) out = out (i > 1 ? "\\n" : "") esc(L[i])
  print "{\"additionalContext\":\"" out "\"}"
}

# The file's text without its trailing newline.
function text(name,    file, line, s, first, r) {
  file = ENVIRON["TSTACK_HOOKS"] "/" name
  s = ""
  first = 1
  while ((r = (getline line < file)) > 0) {
    s = s (first ? "" : "\n") line
    first = 0
  }
  close(file)
  # FIX [Claude AI - Opus 5] (2026-10-09 17:30:59): an unreadable file returned
  # "" and the mandate came out as blank lines, which hid the cause for a whole
  # session. getline returns -1 on error and 0 at EOF, so only -1 is a failure.
  if (r < 0) {
    printf "copilot-context.awk: cannot read %s\n", file | "cat 1>&2"
    exit 1
  }
  return s
}
