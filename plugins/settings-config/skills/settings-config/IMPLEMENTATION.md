# Settings Config — Implementation Notes

本文件是 `SKILL.md` 的 disclosed reference，记录 `configure.mjs` 的实现细节。日常执行只需遵循 `SKILL.md` 的 Workflow；调试、维护或扩展字段时再阅读此处。

## 备份与手动恢复

- 备份位置：`~/.claude/backups/settings-<ISO-timestamp>.json`
- 时间戳格式：`new Date().toISOString().replace(/[:.]/g, '-')`（文件名安全）
- 手动恢复：
  ```bash
  cp ~/.claude/backups/settings-<timestamp>.json ~/.claude/settings.json
  ```

## settings.json 写回规则

`--install` 和 `--restore-default` 都使用 `JSON.stringify(settings, null, 2) + '\n'` 写回文件。其余字段（`enabledPlugins`、`hooks`、`mcpServers`、`permissions` 的其他键、`env` 的其他键等）保持不变。

## 空父对象清理

`--restore-default` 删除 managed keys 后，如果 `permissions` 或 `env` 变为空对象，会一并删除，避免留下 `{permissions: {}}`。

## 幂等还原

如果 `settings.json` 中不存在任何 managed key，`--restore-default` 直接打印 `已是默认状态,无需还原。` 并以 exit code 0 退出，不会创建空备份文件。

## 防御性解析

读取 `settings.json` 时，若 `JSON.parse` 失败则返回 `{}`，不会让损坏的 JSON 阻塞用户。

## 添加新字段

1. 在 `configure.mjs` 的 `ELEMENTS` 数组中追加一条记录。
2. 在 `SKILL.md` 的 [Managed Fields](SKILL.md#managed-fields) 表中追加一行。

不需要改动主流程。
