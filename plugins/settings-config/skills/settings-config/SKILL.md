---
name: settings-config
description: 当用户想要 install 设置 preset、调整核心字段，或 restore 默认 settings.json 时触发。
---

# Settings Config

Install 一个设置 preset，或调整 `~/.claude/settings.json` 的核心字段，也可以 restore 到默认状态。

## Workflow

1. **解析意图**
   - **restore 分支**：用户提到 `还原`、`恢复默认`、`reset`、`restore`、`default` → 运行 `configure.mjs --restore-default`。
   - **full 分支**：用户提到 `全部`、`一键`、`完整`、`full`、`all` → 运行 `configure.mjs --full --install`。
   - **partial 分支**：从自然语言参数中提取字段值，按 [Managed Fields](#managed-fields) 表映射为 `--<key> <value>`，再拼接 `--elements <keys> --install`。
   - **无参数分支**：用 `AskUserQuestion` 让用户选择 preset（`complete` / `recommended` / `minimal` / Other），再逐字段提问。
   - **完成标准**：用户意图已完全转换为确定性的脚本 flag，无自由文本传入脚本。

2. **校验取值**
   - 每个字段值必须落在 [Managed Fields](#managed-fields) 表的“合法值”范围内。
   - **完成标准**：所有字段值校验通过；非法时停止并提示合法取值。

3. **执行脚本**
   - install / adjust：
     ```bash
     npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs --elements <keys> --<key1> <v1> --<key2> <v2> ... --install
     ```
   - restore：
     ```bash
     npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs --restore-default
     ```
   - **完成标准**：脚本退出码为 0。

4. **报告结果**
   - 总结被写入/删除的字段、备份是否创建、提醒用户重启 Claude Code 生效。
   - **完成标准**：用户明确看到变更摘要和重启生效提示。

## Managed Fields

单一字段表：key、settings.json 路径、合法值、默认值，以及自然语言识别关键词。

| key | settings.json 路径 | 合法值 | 默认 | NLP 关键词 |
|-----|-------------------|--------|------|-----------|
| `language` | `language` | `中文`, `English` | `中文` | 中文, 英语, English, 语言, language, lang |
| `effortLevel` | `effortLevel` | `low`, `medium`, `high`, `xhigh`, `max` | `xhigh` | low, medium, high, xhigh, max, 推理, 努力度, effort |
| `permissions.mode` | `permissions.defaultMode` | `auto`, `acceptEdits`, `plan`, `bypassPermissions` | `auto` | auto, acceptEdits, plan, bypassPermissions, 权限, permission |
| `env.traffic` | `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `0`, `1` | `1` | 流量, telemetry, disable traffic, 禁用流量, disable non-essential |

## Presets

| Preset | 说明 | 映射 flag |
|--------|------|----------|
| `complete` | 安装全部 Managed Fields | `--full --install` |
| `recommended` | 语言 + 推理强度 + 权限模式 | `--elements language,effortLevel,permissions.mode --install` |
| `minimal` | 语言 + 推理强度 | `--elements language,effortLevel --install` |

## Usage

```bash
# 预览（不写文件）
npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs

# 安装 complete preset
npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs --full --install

# 安装 recommended 并把语言改成 English
npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs --elements language,effortLevel,permissions.mode --language English --install

# 还原默认
npx -y bun ${CLAUDE_SKILL_DIR}/scripts/configure.mjs --restore-default
```

## Notes

- 需要 **Bun**；未安装时用 `npx -y bun`。
- `${CLAUDE_SKILL_DIR}` 由 Claude Code 自动展开为本 skill 所在目录。
- 备份命名、空父对象清理、幂等还原、防御解析与加字段方式见 [IMPLEMENTATION.md](IMPLEMENTATION.md)。
