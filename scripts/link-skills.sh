#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

unset AI_AGENT CLAUDECODE CLAUDE_CODE CODEX_SANDBOX CODEX_CI CODEX_THREAD_ID \
  CURSOR_TRACE_ID CURSOR_AGENT
exec npx --yes skills add "$repo/.agents" --agent claude-code
