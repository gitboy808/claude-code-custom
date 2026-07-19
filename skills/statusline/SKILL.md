---
name: statusline
description: 配置或还原自定义 Claude Code 状态栏。触发词包括 "status line"、"statusline"、"状态栏"、"customize status"、"restore default status"、"还原"、"恢复默认"。
---

# Status Line Generator

生成并安装自定义 Claude Code 状态栏脚本，或还原为内置空白状态栏。

## Script Directory

脚本位于 `${SKILL_DIR}/scripts/`。运行前将 `${SKILL_DIR}` 替换为本技能目录。生成器为 `${SKILL_DIR}/scripts/generate.mjs`。

## Workflow

1. **判断分支**
   - **restore 分支**：用户提到 restore、default、还原、恢复默认 → 运行 `--restore-default`。
   - **install 分支**：其他情况 → 收集列和主题，然后运行 `--install`。
   - **完成标准**：分支明确。若不确定，问一个澄清问题。

2. **收集偏好（仅 install 分支）**
   - **无参数**：用一次 `AskUserQuestion` 问两个问题。
     - **列**：提供三个预设：`Everything (Recommended)`、`Default`、`Essentials`。`AskUserQuestion` 会自动附加 `Other` 选项；将自由文本解析为逗号分隔的列名，或映射到自然语言描述。解析模糊时回退到 `Default`。
     - **主题**：提供 `Dracula`、`Gruvbox Dark`、`Robbyrussell`、`Minimal`，映射到 [IMPLEMENTATION.md](IMPLEMENTATION.md) 中的规范主题名。
     - 实时可用列和预设可通过 `--list-columns` / `--list-presets` 查询：
       ```bash
       npx -y bun ${SKILL_DIR}/scripts/generate.mjs --list-columns
       npx -y bun ${SKILL_DIR}/scripts/generate.mjs --list-presets
       ```
   - **有参数**：用 NLP 从自由文本中提取主题和列。识别别名（暗黑=dracula，极简=minimal，复古=gruvbox）。未指定字段使用 `--help` 中显示的默认值。
   - **完成标准**：已准备好有效的 `--elements <list>` 和 `--theme <name>`。

3. **映射为 flags**
   - 预设或解析出的列 → `--elements <规范列名>`。
   - 主题 → `--theme <规范主题名>`。
   - 仅当用户明确要求更改 effort 前缀图标时才使用 `--effort-icon`；可用预设通过 `--list-effort-icons` 查询。
   - **完成标准**：每个 flag 值都有效。

4. **执行**
   - install：
     ```bash
     npx -y bun ${SKILL_DIR}/scripts/generate.mjs --elements <list> --theme <theme> --install
     ```
   - restore：
     ```bash
     npx -y bun ${SKILL_DIR}/scripts/generate.mjs --restore-default
     ```
   - **完成标准**：生成器退出码为 0。

5. **验证**
   - install：确认 `~/.claude/scripts/statusline.sh` 存在且可执行，`~/.claude/settings.json` 中的 `statusLine.command` 指向该脚本：
     ```bash
     test -x ~/.claude/scripts/statusline.sh &&
     jq -e '.statusLine.command' ~/.claude/settings.json
     ```
   - restore：确认 `~/.claude/settings.json` 没有 `statusLine` 字段：
     ```bash
     jq -e 'has("statusLine") | not' ~/.claude/settings.json
     ```
   - **完成标准**：验证命令成功。若 `jq` 不可用，直接读取 `settings.json`。

6. **报告**
   - 总结变更，restore 时注明备份路径。变更立即生效，无需重启。
   - **完成标准**：用户看到总结。

## Notes

- 运行生成器需要 **Bun**；若未全局安装，使用 `npx -y bun`。
- 生成的状态栏脚本需要 **jq**；Windows 路径自动检测详见 [IMPLEMENTATION.md](IMPLEMENTATION.md#notes)。
- 重复安装会覆盖 `~/.claude/scripts/statusline.sh`；还原默认会先备份。
- 完整参数、列、预设、主题、effort 图标等实时数据，运行 `--help`、`--list-columns`、`--list-presets`、`--list-effort-icons` 查询；行为说明、示例和还原细节见 [IMPLEMENTATION.md](IMPLEMENTATION.md)。
