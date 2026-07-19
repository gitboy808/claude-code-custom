# Status Line Generator — Implementation Notes

本文件是 `SKILL.md` 的 disclosed reference，记录 `generate.mjs` 的行为细节与示例。日常执行只需遵循 `SKILL.md` 的 Workflow；调试、扩展或处理边界情况时再阅读此处。

能力清单（列、预设、主题、effort 图标）由脚本自描述，避免文档与代码重复。查询命令：

```bash
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --help
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --list-columns
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --list-presets
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --list-effort-icons
```

## CLI Flags

运行 `--help` 查看完整参数列表、默认值和自描述命令。常用参数：

```bash
# Preview generated script
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements model,context,effort,git,dir --theme gruvbox

# Generate and install
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements model,context,effort,git,dir --theme dracula --install

# Restore Claude Code's default (empty) status line
npx -y bun ${SKILL_DIR}/scripts/generate.mjs --restore-default
```

`--install` 写入 `settings.json` 的 `statusLine.command` 为绝对路径。

## Color-changing Elements

### context

进度条、百分比和 token 计数全部与 `/context` 的口径一致：`used% = round(total_input_tokens / 有效窗口)`。有效窗口按产品优先级解析（已对照 v2.1.215 源码确认）：

1. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 环境变量（最高优先级，状态栏脚本作为 Claude Code 子进程可直接继承）
2. settings 中的 `autoCompactWindow`（项目 `.claude/settings.local.json` > 项目 `.claude/settings.json` > 用户 `~/.claude/settings.json`，非数值如 `"auto"` 视为未设置）
3. `context_window.context_window_size`（模型标称窗口），且最终取值不超过标称窗口

**为什么不用 JSON 的 `used_percentage` / `remaining_percentage`**：它们的分母是模型标称窗口（如 1M），而不是 auto-compact 实际生效的窗口。当两者不同（如设置了 `CLAUDE_CODE_AUTO_COMPACT_WINDOW=262144`）时偏差巨大——真实使用率 48% 会显示成 13%。token 计数 `(used/total)` 中 used 为 `total_input_tokens`，total 为上述有效窗口（如 `(125k/262k)`）。

| Remaining | Color | Meaning |
|-----------|-------|---------|
| > 50% | green | plenty of context |
| 20–50% | yellow | watch out |
| < 20% | red | nearly full — compact soon |

### effort

effort 值和可选前缀图标按级别变色：

| Level | Color |
|-------|-------|
| `max`, `xhigh`, `high` | bold red |
| `medium` | yellow |
| `low` | green |
| other / unset | dim |

数据源：stdin 的 `effort.level`（实时会话值，官方取值为 `low` / `medium` / `high` / `xhigh` / `max`）；缺失时回退到 `~/.claude/settings.json` 的 `effortLevel`。ultracode 不是独立 effort 级别，Claude Code 上报为 `xhigh`，无需单独处理。

## Effort Icons

运行 `--list-effort-icons` 查看预设和字符。也支持传入任意原始字符。

## Worktree, Git, and Directory Behavior

- `worktree` 列显示粗体 `worktree:<id>` 标签，检测只依赖官方 stdin 字段：`--worktree` 会话提供 `worktree.name`；`workspace.git_worktree` 在任何 `git worktree add` 创建的 linked worktree 中都会出现。两者都缺失时（如旧版本 Claude Code 的外部 worktree）该列隐藏。
- `dir` 在 linked worktree 中通过 `git rev-parse --git-common-dir` 推导主 repo 名（worktree 的 common dir 指向主 repo 的 `.git`），保证跨 worktree 时 repo 身份稳定；其他情况显示当前目录 basename。
- `git` 优先使用输入 JSON 的 `worktree.branch`，回退到 `git branch --show-current`。
- Git dirty 检测使用 `--no-optional-locks`，避免干扰其他 git 操作。

## Restore-default Behavior

1. 若 `~/.claude/settings.json` 没有 `statusLine` 字段，打印 `已是默认状态,无需还原。` 并退出 0。
2. 若 `~/.claude/scripts/statusline.sh` 存在，备份到 `~/.claude/backups/statusline-<timestamp>.sh`。
3. 从 `~/.claude/settings.json` 移除 `statusLine`，保留其他字段。
4. 若存在则删除 `~/.claude/scripts/statusline.sh`。
5. 打印 `已还原 Claude Code 原生空白状态栏。`

同时传入 `--install` 与 `--restore-default` 时，先执行还原并退出。

## Output Examples

**Dracula**（所有列），remaining=49%，cost=$0.42，effort=high，output style=Explanatory，在 worktree 中：

```
◈ Opus 4.8 | [■■■■■□□□□□] 51% (102k/200k) | $0.42 | ↯ high | ❋ Explanatory | ⌂ clawmaster | ⊕ worktree:46a6 | ⎇ feat/xyz
```

（进度条黄色；`$0.42` 金色会话花费；effort "high" 粗体红色）

**Gruvbox Dark**（model + context + effort + dir + git），remaining=88%，effort=medium：

```
✦ Opus 4.8 | [■□□□□□□□□□] 12% (24k/200k) | ↯ medium | ⌂ claude-code-custom | ⎇ main
```

（进度条绿色；effort "medium" 黄色）

**Minimal**（model + effort + dir + git），effort=low：

```
Claude Opus 4.8 · low · claude-code · main
```

（无 prefix icon；effort "low" 绿色）

## Notes

- Windows 上，生成的脚本会自动检测 WinGet 和 scoop 的 jq 路径；若仍找不到，需手动将 jq 目录加入 PATH。
