@AGENTS.md

Claude Code: start with the `setup` skill. Delegate to the sub-agents `connection-adapter`, `visual-adapter` and
`panel-builder` (defined in `.claude/agents/`), one at a time, and finish with `run-checks`. Project permissions in
`.claude/settings.json` block web access, secret files and package installs; do not try to work around them.
