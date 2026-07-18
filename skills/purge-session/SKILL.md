---
name: purge-session
description: Purge one historical Claude Code session from local storage.
argument-hint: "Session ID, session name, or leave blank to pick interactively"
disable-model-invocation: true
---

Purge all local traces of a single Claude Code session — transcripts, file history, tasks, telemetry, jobs, history entries, and dangling `lastSessionId` references.

## Script Directory

All scripts live in `scripts/` next to this file. Replace `${SKILL_DIR}` with this skill's directory.

| Script | Purpose |
|--------|---------|
| `scripts/purge.mjs` | List, dry-run, and purge sessions |

Run with: `npx -y bun ${SKILL_DIR}/scripts/purge.mjs <args>`

## Workflow

1. **Locate the session**
   - If the user passed a UUID, use it.
   - If they passed a name, run `--list` and match by `displayName`.
   - If nothing passed, run `--list` and ask them to pick.
   - **Completion criterion**: one normalized `sessionId` is selected.

2. **Dry-run**
   - Run `npx -y bun ${SKILL_DIR}/scripts/purge.mjs --dry-run <session-id>`.
   - Present the JSON result grouped by what would be deleted and rewritten.
   - **Completion criterion**: user sees the plan.

3. **Confirm**
   - Require the user to type exactly `delete <session-id>`.
   - **Completion criterion**: exact confirmation received.

4. **Execute**
   - Run `npx -y bun ${SKILL_DIR}/scripts/purge.mjs --execute <session-id>`.
   - Add `--backup` if the user asked for backups.
   - **Completion criterion**: script exits 0 and prints the final JSON.

5. **Report**
   - Summarize deleted paths, rewritten files, backups, skipped items, and errors.
   - Remind that deleted files cannot be restored; backups only cover `.claude.json` and `history.jsonl`.
   - **Completion criterion**: user acknowledges the result.

## Guardrails

- Refuse active sessions: the script rejects `--execute` while the session is running.
- Scope to the Claude data directory: the script only deletes paths under the configured `--claude-dir`.
- Backup only on request: pass `--backup` to copy `.claude.json` and `history.jsonl` to `~/.claude/backups/` before rewriting.
