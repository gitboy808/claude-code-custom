---
name: settings-config
description: Configure ~/.claude/settings.json with one command — set language, effortLevel, permissions.defaultMode, and CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC. Restore default settings with --restore-default. Triggers on "配置 claude code", "设置 settings.json", "改 effort", "改权限模式", "改输出语言", "禁用流量", "还原 settings", "settings config", "restore settings", "default settings", or similar.
---

# Settings Config

一次性配置 `~/.claude/settings.json` 的核心字段。基于 `elements` 配置表模式 —— 未来扩展新字段只需在 `ELEMENTS` 数组里加一行,无需改动主流程。

## How It Works

Claude Code 的全局配置存在 `~/.claude/settings.json`。日常调优最常改的 4 个键是:
- `language` —— Claude 输出语言
- `effortLevel` —— 推理强度(low/medium/high/xhigh/max)
- `permissions.defaultMode` —— 权限默认模式(auto/acceptEdits/plan/bypassPermissions)
- `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` —— 是否禁用非必要流量(1 禁用,0 启用)

手工改 JSON 容易拼错、漏字段、丢备份。本 skill 把这 4 个键的写入、还原、备份打包成一个命令。

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.mjs`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/configure.mjs` | Read/write settings.json, manage 4 fields, restore default. Supports `--install`, `--full`, `--restore-default`, dry-run (no flag). |

## Prerequisites

- **Bun** — required to run the generator. Use `npx -y bun` if not installed globally.

## Usage

```bash
# 预览(不写文件)
npx -y bun ${SKILL_DIR}/scripts/configure.mjs

# 一次性配置全部 4 个字段(用 ELEMENTS 默认值:中文/xhigh/auto/1)
npx -y bun ${SKILL_DIR}/scripts/configure.mjs --full --install

# 仅配置语言 + effort,传入具体值
npx -y bun ${SKILL_DIR}/scripts/configure.mjs --elements language,effortLevel --language 中文 --effortLevel xhigh --install

# 还原默认状态(备份 settings.json 到 ~/.claude/backups/,删除 4 个本 skill 管理的字段)
npx -y bun ${SKILL_DIR}/scripts/configure.mjs --restore-default
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--elements <list>` | `language,effortLevel,permissions.mode,env.traffic` | 逗号分隔要配置的字段 key |
| `--full` | off | 一次性配置全部 4 个字段(用 ELEMENTS 中的默认值)。与 `--install` 组合生效 |
| `--install` | off | 真正写入 `~/.claude/settings.json`(无此标志时仅预览) |
| `--restore-default` | off | 备份当前 settings.json 到 `~/.claude/backups/settings-<ISO-ts>.json`,然后删除本 skill 管理的 4 个字段 |
| `--language <v>` | `"中文"` | language 字段值 |
| `--effortLevel <v>` | `"xhigh"` | effortLevel 字段值 |
| `--permissions.mode <v>` | `"auto"` | permissions.defaultMode 字段值 |
| `--env.traffic <v>` | `"1"` | CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC 字段值 |

### 字段表

| key | settings.json 路径 | 合法值 | 默认 |
|-----|--------------------|--------|------|
| `language` | `language` | `中文`, `English` | `"中文"` |
| `effortLevel` | `effortLevel` | `low`, `xlow`, `minimal`, `medium`, `high`, `xhigh`, `max` | `"xhigh"` |
| `permissions.mode` | `permissions.defaultMode` | `auto`, `acceptEdits`, `plan`, `bypassPermissions` | `"auto"` |
| `env.traffic` | `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `0`, `1` | `"1"` |

### Presets

| Preset | 包含字段 |
|--------|---------|
| `complete` | 全部 4 个字段(对应 `--full`) |
| `recommended` | `language,effortLevel,permissions.mode` |
| `minimal` | `language,effortLevel` |

## Invocation

This skill can be invoked with or without arguments:

- **No args** (`/custom:settings-config`): Use `AskUserQuestion` to pick a preset (complete/recommended/minimal + Other), then ask each field value one by one via `AskUserQuestion`.
- **With args** (`/custom:settings-config full`): Skip the preset prompt, use defaults for all 4 fields, run with `--install`.
- **With args + values** (`/custom:settings-config effort high language 中文`): NLP-parse and run with `--install`.

### Arg parsing (natural language)

Extract these fields from free-form args:

| Field | Keywords (Chinese / English) |
|-------|------------------------------|
| `language` | `中文`, `英语`, `English`, `语言`, `language`, `lang` |
| `effortLevel` | `low`, `xlow`, `minimal`, `medium`, `high`, `xhigh`, `max`, `推理`, `努力度`, `effort` |
| `permissions.mode` | `auto`, `acceptEdits`, `plan`, `bypassPermissions`, `权限`, `permission` |
| `env.traffic` | `流量`, `telemetry`, `disable traffic`, `禁用流量`, `disable non-essential` |
| `preset/full` | `全部`, `一键`, `全选`, `完整`, `full`, `all` → triggers `--full` flow |
| `restore` | `还原`, `恢复默认`, `reset`, `restore`, `default` → triggers `--restore-default` |

Unspecified fields use the ELEMENTS default value. The skill always maps args to `--<key> <value>` flags before invoking the script — there is no free-text path inside `configure.mjs`.

## Workflow

1. **Parse args**:
   - If `restore-default` keyword found → run `configure.mjs --restore-default`, done.
   - If `preset/full` keyword found → run `configure.mjs --full --install`, done.
   - If specific field values found → build `--elements <list> --<key1> <v1> --<key2> <v2> ... --install`.
   - If no args → prompt via `AskUserQuestion` (preset) → prompt per field → then build the same flags.

2. **Run the script**:
   ```bash
   npx -y bun ${SKILL_DIR}/scripts/configure.mjs [flags] --install
   ```

3. **Tell user** the script has updated `~/.claude/settings.json` (and created a backup under `~/.claude/backups/`). They must restart Claude Code for changes to take effect.

## Notes

- **Backup location**: `~/.claude/backups/settings-<ISO-timestamp>.json` — same pattern as `statusline` skill (`skills/statusline/scripts/generate.mjs:480`). Timestamp format: `new Date().toISOString().replace(/[:.]/g, '-')` (filename-safe).
- **Other fields preserved**: Both `--install` and `--restore-default` use `JSON.stringify(settings, null, 2) + '\n'` after `delete`/`setPath` so the rest of settings.json (plugins, hooks, other env keys, mcpServers, etc.) is untouched.
- **Empty-parent-object cleanup**: After `--restore-default`, if `permissions` or `env` becomes empty after removing managed keys, those parent objects are deleted too — no `{permissions: {}}` left behind.
- **Idempotent restore**: `--restore-default` exits 0 with `已是默认状态,无需还原。` when none of the 4 managed keys are present; no empty backup file is created.
- **Defensive parsing**: `JSON.parse` failures return `{}` rather than throwing — corrupt settings.json never blocks the user.
- **Adding fields**: Future fields (e.g. `outputStyle`, `theme`, `CleanupPeriodDays`) need only:
  1. Append one entry to `ELEMENTS` in `configure.mjs`.
  2. Add one row to the field table in this SKILL.md.
  No other code changes.

## Restoring the default settings

```bash
npx -y bun ${SKILL_DIR}/scripts/configure.mjs --restore-default
```

Three actions, in order:

1. Reads `~/.claude/settings.json` defensively (parse errors → empty object).
2. If none of the 4 managed keys are present → prints `已是默认状态,无需还原。` and exits 0 (no backup created).
3. Otherwise: backs up `settings.json` to `~/.claude/backups/settings-<ISO-timestamp>.json`, deletes `language`, `effortLevel`, `permissions.defaultMode`, `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, collapses empty parent objects, and writes settings.json back.

To manually restore from a backup:

```bash
cp ~/.claude/backups/settings-<timestamp>.json ~/.claude/settings.json
```