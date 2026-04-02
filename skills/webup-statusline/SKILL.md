---
name: webup-statusline
description: Generate and install a custom Claude Code status line with selectable elements, color themes, and prefix icons. Triggers on "status line", "statusline", "customize status", "status bar", "状态栏", "ステータスライン", or similar.
---

# Status Line Generator

Generate a custom Claude Code status line script with your choice of elements, color theme, and prefix icon. Installs directly to `~/.claude/settings.json`.

## How It Works

Claude Code supports custom status lines via a shell script configured in `~/.claude/settings.json`. The script receives session JSON on stdin (model, context window, output style, workspace, etc.) and prints formatted text to stdout.

This skill generates a bash script tailored to your preferences and installs it automatically.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.mjs`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/generate.mjs` | Generate and install status line script from chosen options |

## Prerequisites

- **jq** — required by the generated status line script to parse JSON input from Claude Code
- **Bun** — required to run the generator. Use `npx -y bun` if not installed globally.

## Usage

```bash
# Preview generated script
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements model,context,style,git,dir --theme gruvbox --icon ✦

# Generate and install
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements model,context,style,git,dir --theme gruvbox --icon ✦ --install
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--elements <list>` | `model,context,style,git,dir` | Comma-separated elements to display |
| `--theme <name>` | `gruvbox` | Color theme |
| `--icon <char>` | `✦` | Prefix icon shown before output style name |
| `--install` | off | Write script to `~/.claude/scripts/statusline.sh` and update `settings.json` |

### Elements

| Element | Description | Data source |
|---------|-------------|-------------|
| `model` | Active model name (e.g. "Opus 4.6") | `model.display_name` |
| `context` | Context window usage — progress bar + percentage | `context_window.remaining_percentage` |
| `style` | Output style with prefix icon (hidden when "default") | `output_style.name` |
| `git` | Git branch name (yellow when dirty) | `git` CLI |
| `dir` | Current directory basename | `workspace.current_dir` |
| `vim` | Vim mode indicator | `vim.mode` |

### Themes

| Theme | Style | Colors |
|-------|-------|--------|
| `gruvbox` | Warm retro | Teal model, aqua bar, yellow tokens, green dir, blue git |
| `robbyrussell` | Classic oh-my-zsh | Cyan model, red dir, green git, magenta style |
| `minimal` | Clean, no decoration | Default terminal colors, dim separators |
| `dracula` | Dark modern | Purple model, green bar, pink style, cyan dir, orange git |

### Prefix Icons

| Icon | Name |
|------|------|
| `✦` | Claude sparkle (default) |
| `➜` | Robbyrussell arrow |
| `❯` | Pure/Starship prompt |
| `⚡` | Lightning bolt |
| `◉` | Filled circle |

## Invocation

This skill can be invoked with or without arguments:

- **No args** (`/webup-statusline`): Interactive prompt via `AskUserQuestion` to pick elements, theme, and icon.
- **With args** (`/webup-statusline dracula`): NLP parse for theme, elements, and icon preferences.

### Arg parsing (natural language)

The args string is free-form text. Use NLP to extract:

1. **theme** — match against: gruvbox, robbyrussell, minimal, dracula. Also recognize aliases (暗黑=dracula, 极简=minimal, 复古=gruvbox, レトロ=gruvbox).
2. **elements** — look for mentions of: model, context/进度/コンテキスト, style/样式/スタイル, git/分支/ブランチ, dir/目录/ディレクトリ, vim.
3. **icon** — match against the 5 prefix icons or descriptions like "dragon icon", "龙图标", "闪电".

Unspecified fields use defaults: all elements except vim, gruvbox theme, ✦ icon.

## Workflow

1. **If no args provided**: Use `AskUserQuestion` to ask 3 questions in a single prompt:

   **Q1 — Elements** (multiSelect): Which info to show in the status line?
   - "Model name" — active Claude model
   - "Context usage" — progress bar + percentage (Recommended)
   - "Output style" — with prefix icon, hidden when default
   - "Git branch" — current branch, yellow when dirty (Recommended)
   - "Working directory" — folder name (Recommended)
   - "Vim mode" — vim keybinding mode indicator

   **Q2 — Theme** (single): Color theme?
   - "Gruvbox Dark (Recommended)" — warm retro palette, 24-bit true color
   - "Dracula" — modern dark theme, purple/pink/cyan
   - "Robbyrussell" — classic oh-my-zsh style
   - "Minimal" — no decoration, dim separators only

   **Q3 — Output style prefix icon** (single): Icon shown before output style name?
   - "✦ sparkle (Recommended)" — Claude default
   - "❯ prompt" — pure/starship style
   - "➜ arrow" — robbyrussell style
   - "◉ circle" — filled circle

   **If args provided**: Parse theme, elements, and icon from args. Skip the prompt.

2. Map user selections to script flags:
   - Elements → comma-separated list for `--elements`
   - Theme → `--theme` value
   - Icon → `--icon` value

3. Run the generator with `--install`:
   ```bash
   npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements <list> --theme <theme> --icon "<icon>" --install
   ```

4. Tell user to restart Claude Code to see the new status line.

## Output Examples

**Gruvbox Dark** (model + context + style + dir + git):
```
✦ Opus 4.6 | [■■■■■■■■■■□□□□□□□□□□] 49% | ✦thinking | ◆ my-project | ⎇ main
```

**Minimal** (model + dir + git):
```
Claude Opus 4.6 · skills-cc · main
```

**Dracula** (all elements):
```
◈ Opus 4.6 | ↯ [■■■■■■■■■■□□□□□□□□□□] 49% | ⚡thinking | ⌨ normal | ◇ my-project | ⎇ main
```

## Notes

- Generated script is saved to `~/.claude/scripts/statusline.sh`
- Running the skill again overwrites the existing script (no backup needed — just re-run to change)
- The script uses `jq` to parse JSON input — make sure it's installed
- Git dirty detection uses `--no-optional-locks` to avoid interfering with other git operations
