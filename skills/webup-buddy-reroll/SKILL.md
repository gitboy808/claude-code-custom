---
name: webup-buddy-reroll
description: Reroll Claude Code /buddy companion to a target species and rarity. Use when the user wants to change their buddy pet, get a legendary companion, reroll their buddy, or is unhappy with their current /buddy result. Triggers on "reroll buddy", "change buddy", "legendary buddy", "new companion", "buddy hack", "换宠物", "重新抽", "传说宠物", "バディ変更", "伝説バディ", or similar.
---

# Buddy Reroll

Brute-force a new `/buddy` companion by finding a userID that hashes to the desired species and rarity.

## How It Works

Claude Code generates companions deterministically: `hash(userID + SALT)` → `mulberry32` PRNG → rarity, species, eyes, hat, shiny. Same userID = same companion, always.

To reroll: replace `userID` in `~/.claude.json`, clear `companion` field, restart.

**Critical**: Claude Code is Bun-bundled, so `Bun.hash()` (xxHash64) is the correct hash function. Node.js FNV-1a produces wrong results — the script MUST run under Bun.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.mjs`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/reroll.mjs` | Brute-force target species+rarity, optionally apply to config |
| `scripts/oauth-setup.mjs` | OAuth config helper for Pro/Max subscribers (--check/--prepare/--verify/--restore) |

## Prerequisites

- **Claude Code >= 2.1.89** — the `/buddy` system was introduced in this version. The script auto-checks and exits if the version is too old.
- **Bun** — required for correct hashing. Use `npx -y bun` if not installed globally.
- **API users**: Works directly — `userID` in `~/.claude.json` can be freely replaced.
- **Pro/Max subscribers**: Requires OAuth setup first (automated by this skill). Pro/Max accounts have `accountUuid` which `/buddy` uses instead of `userID`. The OAuth method bypasses this — see workflow below.

## Usage

```bash
# Direct (if bun is installed globally)
bun ${SKILL_DIR}/scripts/reroll.mjs --species dragon --rarity legendary --apply

# Via npx (works even without global bun install)
npx -y bun ${SKILL_DIR}/scripts/reroll.mjs --species dragon --rarity legendary --apply
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--species <name>` | `dragon` | Target species (see list below) |
| `--rarity <level>` | `legendary` | Minimum rarity: common / uncommon / rare / epic / legendary |
| `--max <n>` | `1000000` | Max brute-force iterations |
| `--apply` | off | Auto-write result to `~/.claude.json` and clear companion |

### Species (18)

| | | | | | |
|---|---|---|---|---|---|
| duck | goose | blob | cat | dragon | octopus |
| owl | penguin | turtle | snail | ghost | axolotl |
| capybara | cactus | robot | rabbit | mushroom | chonk |

### Rarity Tiers

| Rarity | Stars | Chance | ~Iterations to find |
|--------|-------|--------|---------------------|
| common | ★ | 60% | ~30 |
| uncommon | ★★ | 25% | ~72 |
| rare | ★★★ | 10% | ~180 |
| epic | ★★★★ | 4% | ~450 |
| legendary | ★★★★★ | 1% | ~1800 |

## Invocation

This skill can be invoked with or without arguments:

- **No args** (`/webup-buddy-reroll`): Prompts the user to choose species and rarity interactively via `AskUserQuestion` before running.
- **With args** (`/webup-buddy-reroll dragon legendary`): Skips the prompt and locks the choice to the given species and rarity directly.

## Workflow

0. **Detect account type**: Run the check script to see if `accountUuid` exists in `~/.claude.json`:
   ```bash
   npx -y bun ${SKILL_DIR}/scripts/oauth-setup.mjs --check
   ```
   - **Exit 0** (no `accountUuid`): API user or OAuth already set up. Skip to step 1.
   - **Exit 1** (`accountUuid` found): Pro/Max subscriber. Run **OAuth Setup** below, then continue to step 1.

### OAuth Setup (Pro/Max only)

**Principle**: When logging in via `CLAUDE_CODE_OAUTH_TOKEN` env var, Claude Code does NOT write `accountUuid` to `~/.claude.json`. This makes `/buddy` fall back to `userID`, which can be freely replaced.

   a. Tell user to open a **separate terminal** and run `claude setup-token` to get their OAuth token. Ask them to paste the token back here.

   b. Once token is received, prepare the config (backup + reset):
      ```bash
      npx -y bun ${SKILL_DIR}/scripts/oauth-setup.mjs --prepare
      ```

   c. Tell user to run in a **separate terminal** (replace `<TOKEN>` with actual token):
      ```bash
      CLAUDE_CODE_OAUTH_TOKEN=<TOKEN> claude
      ```
      Wait for Claude to fully load, then **exit immediately** — do NOT use `/buddy`.

   d. After user confirms they've done this, verify the config:
      ```bash
      npx -y bun ${SKILL_DIR}/scripts/oauth-setup.mjs --verify
      ```
      If verification fails, run `--restore` to restore backup and retry from step (a).

   e. Continue to step 1.

---

1. **If no args provided**: Use `AskUserQuestion` to ask the user to pick a species AND a rarity in a single prompt (two questions):
   - **Species question**: Present 4 popular options (dragon, cat, axolotl, capybara) as choices. Each option's `description` should list the remaining species so the user knows what's available via "Other", e.g. the first option's description: "Or type any of: duck, goose, blob, octopus, owl, penguin, turtle, snail, ghost, cactus, robot, rabbit, mushroom, chonk".
   - **Rarity question**: Present all 5 tiers (legendary as first/recommended, then epic, rare, uncommon, common).
   - Do NOT skip this step. Always ask even if the user mentioned a species — confirm their choice.

   **If args provided**: Parse `<species>` and `<rarity>` from the args. Skip the prompt and proceed directly.
2. Run the script with `--apply`:
   ```bash
   npx -y bun ${SKILL_DIR}/scripts/reroll.mjs --species <choice> --rarity <choice> --apply
   ```
3. Tell user to restart Claude Code and run `/buddy` to hatch the new companion.
   - **If OAuth was used**: Remind user to start Claude with `CLAUDE_CODE_OAUTH_TOKEN=<TOKEN> claude` (not plain `claude`) to prevent `accountUuid` from being written back.

## Manual Apply

If `--apply` was not used:
1. Copy the output userID
2. Edit `~/.claude.json`: replace `"userID"` value, set `"companion": null`
3. Restart Claude Code → `/buddy`

## Notes

- `userID` only affects telemetry bucketing and buddy seed — no impact on conversations, API keys, or local config
- SALT is `friend-2026-401` (Claude Code 2.1.89). Update the script if a future version changes it
- 1M iterations finds legendary in seconds on modern hardware
