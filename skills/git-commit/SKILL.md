---
name: git-commit
description: 分析 Git 改动并生成 Conventional Commits 提交信息，确认后按需暂存和提交；支持拆分提交、amend、signoff、emoji、type 与 scope。（**强制要求**只允许用户手动调用）
disable-model-invocation: true
---

# Git 提交

仅使用 Git 检查改动、规划原子提交，并生成符合 Conventional Commits 的提交信息。除非用户明确要求，不运行包管理器、构建或测试命令，也不修改工作区文件内容。

## 调用限制

- 只能由用户通过 `/git-commit` 手动触发，禁止模型根据对话内容自动调用。
- 手动调用只表示开始分析，不代表用户已授权暂存或提交。
- 无论用户调用时使用了什么参数，执行 `git commit` 前都必须再次确认；不得把调用命令、先前消息或参数视为确认。

## 参数

| 参数 | 行为 |
| --- | --- |
| `--amend` | 修补上一次提交，不创建新提交 |
| `--no-verify` | 跳过本地 Git 钩子 |
| `--signoff` | 添加 `Signed-off-by` trailer |
| `--emoji` | 在提交标题前添加与类型匹配的 emoji |
| `--scope <scope>` | 指定提交作用域 |
| `--type <type>` | 指定提交类型，覆盖自动判断 |

未提供参数时，以已暂存改动为候选提交范围；若暂存区为空，仅分析未暂存改动并建议如何分组，不擅自暂存。

## 工作流

1. **校验仓库状态**
   - 运行 `git rev-parse --is-inside-work-tree`、`git status --short --branch`。
   - 遇到 merge、rebase、cherry-pick 冲突时停止提交，提示用户先解决冲突。
   - detached HEAD 状态下先提示风险并取得用户确认。

2. **分析改动**
   - 使用 `git diff --cached` 检查已暂存改动，使用 `git diff` 和 `git status --short` 补充了解未暂存及未跟踪文件。
   - 有已暂存内容时，以暂存区为本次提交边界，不自动加入其它改动。

3. **判断是否拆分**
   - 不同关注点、模块或提交类型应拆分。
   - 源码、测试、文档只有在表达同一项完整变更时才放入同一提交。
   - 大范围改动（例如超过 300 行或跨多个顶级目录）应重点检查能否独立回滚。
   - 需要拆分时，列出每组目的、文件和建议的 `git add <pathspec>` 命令。

4. **生成提交信息**
   - 格式为 `[emoji] <type>(<scope>)!: <subject>`，其中 emoji、scope 和 `!` 均按需使用。
   - 常用类型：`feat`、`fix`、`docs`、`refactor`、`test`、`perf`、`style`、`ci`、`chore`、`revert`。
   - 标题不超过 72 个字符，简洁描述实际变更，不使用句号结尾。
   - 根据最近约 50 条提交标题判断语言；无法判断时采用仓库文档的主要语言。
   - 简单改动只写标题。需要解释动机、实现或影响时，空一行后添加不超过 3 条正文，每条以动词开头，不使用“标签: 描述”式正文。
   - 破坏性变更使用 `!`，并在正文后添加 `BREAKING CHANGE: <说明>`；议题引用和签名使用 Git trailer。

5. **请求确认**
   - 展示本次提交包含的完整文件清单、最终提交信息，以及将执行的暂存和提交操作。
   - 使用 `AskUserQuestion` 明确询问“是否按以上方案执行提交？”，提供“确认提交”和“取消”选项。
   - 只有用户在这次询问中选择“确认提交”才算授权。用户取消、要求修改或未明确回答时，不执行任何会改变 Git 状态的命令。
   - `--amend` 必须同时展示将被改写的提交哈希和标题，并在问题中明确说明会改写历史。
   - 拆分为多个提交时，每个提交都要在展示其文件与消息后单独确认；一次确认不得授权后续提交。

6. **执行提交**
   - 获得确认后，先执行已展示的 `git add` 操作，再用 `git diff --cached --stat` 核对实际暂存范围。范围与确认内容不一致时停止并重新确认。
   - 使用 `git commit` 执行已确认的提交，并按参数追加 `--amend`、`--no-verify` 或 `--signoff`；不得改变已确认的提交信息或参数。
   - 提交完成后运行 `git status --short --branch`，报告提交哈希、标题和剩余改动。
   - Git 钩子失败时保留其输出并说明原因；不要自动使用 `--no-verify` 重试。

## Emoji 映射

仅在指定 `--emoji` 时使用：

| 类型 | Emoji |
| --- | --- |
| `feat` | ✨ |
| `fix` | 🐛 |
| `docs` | 📝 |
| `style` | 🎨 |
| `refactor` | ♻️ |
| `perf` | ⚡️ |
| `test` | ✅ |
| `chore` | 🔧 |
| `ci` | 👷 |
| `revert` | ⏪️ |
| 破坏性变更 | 💥 |

## 示例

```text
feat(auth): 添加 OAuth2 登录流程

- 接入 Google 与 GitHub 登录
- 处理用户授权回调
- 持久化登录状态

Closes #42
```

拆分建议示例：

```text
1. feat(types): 添加支付方式类型定义
   git add src/types/payment.ts
2. test(types): 补充支付类型单元测试
   git add test/payment.test.ts
3. docs: 更新支付方式文档
   git add docs/payment.md
```

## 安全边界

- 不使用 `git reset --hard`、`git checkout --` 等会丢失工作区改动的命令。
- 误暂存时只使用 `git restore --staged <pathspec>`，不改变文件内容。
- 不改写用户未明确要求纳入本次提交的改动。
- 二次确认是强制安全门槛，不因 `--amend`、`--no-verify` 或任何用户参数而跳过。

## 脚本目录

本 Skill 不包含脚本；所有操作均通过 Git CLI 完成。
