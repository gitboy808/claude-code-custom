# 🛠️ claude-code-custom

Claude Code 实用技能插件 —— 定制与黑科技合集。

## 📦 安装

通过 Claude Code 官方插件市场安装:

```bash
# 添加 marketplace
/plugin marketplace add gitboy808/claude-code-custom

# 安装 custom 插件
/plugin install custom@gitboy808-claude-code-custom

# 加载插件
/reload-plugins
```

> 💡 安装时 Claude Code 会询问作用域:user(全局)/ project(随仓库共享)/ local(本仓库私有)。由 `claude plugin install --scope {user|project|local}` 或 `/plugin` UI 交互式选择。

## 🔄 同步本地修改到已安装插件

改了本仓库里的 `SKILL.md` / 脚本后,**已经安装的插件不会自动更新** —— 因为 Claude Code 用的是 **plugin cache**(按 git commit hash 打包的快照),路径是 `~/.claude/plugins/cache/<marketplace>/<plugin>/<commit>/`。working tree 和 cache 是两个独立目录,改 working tree 不会影响 cache。

要让本地修改立即生效,选其一:

| 场景 | 操作 |
|------|------|
| 调试中、想立刻验证 | `cp skills/<skill>/SKILL.md ~/.claude/plugins/marketplaces/gitboy808-claude-code-custom/skills/<skill>/SKILL.md` 然后 `rm -rf ~/.claude/plugins/cache/gitboy808-claude-code-custom`(下次启动自动重打包) |
| 正式发布 | `git add . && git commit && git push` → marketplace 自动 `git pull` → 重新 `/plugin install` / `/reload-plugins` 让 cache 重建 |

> 💡 验证插件加载到的是哪一份:`md5 ~/.claude/plugins/marketplaces/gitboy808-claude-code-custom/skills/<skill>/SKILL.md ~/.claude/plugins/cache/gitboy808-claude-code-custom/custom/*/skills/<skill>/SKILL.md`。两者不一致 → cache 滞后。

## 🎮 技能列表

### 📊 /custom:statusline

生成并安装自定义 Claude Code 状态栏。选择 **字段** 和 **主题**,仅此而已。其中两个字段(`context` 和 `effort`)会 **随级别动态换色**,一眼看清当前状态。

#### 效果预览

完整字段,剩余 49%,累计消费 $0.42,`effortLevel: high`,输出样式 `Explanatory`,工作树内:

<img src="./docs/examples/dracula-full.svg" alt="Dracula 主题全字段示例" />

*Dracula 主题 —— 黄色进度条(留意)、金色 `$0.42`(会话消费)、加粗红色 `↯ high`(压力)、紫色 `❋ Explanatory`(输出样式)、粉色 worktree 标签。*

<details><summary>纯文本</summary>

```
◈ Opus 4.7 | [■■■■■□□□□□] 49% | $0.42 | ↯ high | ❋ Explanatory | ⌂ clawmaster | ⊕ worktree:46a6 | ⎇ feat/xyz
```

</details>

轻松状态 —— 剩余 88%,`effortLevel: medium`,输出样式 default(隐藏):

<img src="./docs/examples/gruvbox-healthy.svg" alt="Gruvbox 主题轻松状态" />

*Gruvbox Dark —— 绿色进度条(轻松)、黄色 effort;输出样式字段隐藏,因为值是 `default`。*

<details><summary>纯文本</summary>

```
✦ Opus 4.7 | [■□□□□□□□□□] 12% | ↯ medium | ⌂ claude-code-custom | ⎇ main
```

</details>

#### 在 Claude Code 中调用

```
# 交互式 — 依次选择字段和主题
/custom:statusline

# 快速选择主题
/custom:statusline dracula

# 自然语言
/custom:statusline 极简主题 加上git分支和进度条

# 还原 Claude Code 默认(空白)状态栏
/custom:statusline restore-default
```

#### 可显示字段(多选)

| 字段 | 显示内容 | 何时可见 |
|------|----------|----------|
| `model` | 活跃模型名 | 始终显示 |
| `context` | 上下文进度条 + 百分比 —— **颜色随剩余容量变化** | 始终显示 |
| `cost` | 会话累计消费 `$X.XX`(金色,例如 `$0.42`) | 当 `cost.total_cost_usd` 四舍五入后 ≥ $0.01 |
| `effort` | 推理努力度 —— **按强度着色**(支持 `low`/`medium`/`high`/`xhigh`/`max`) | 当 `~/.claude/settings.json` 中设置了 `effortLevel` |
| `style` | 输出样式名(例如 `Explanatory`、`Learning`)—— 紫色呼应 Claude 品牌色 | 当 `output_style.name` 不是 `default` 时 |
| `dir` | 仓库目录名(在工作树中显示原仓库名) | 始终显示 |
| `worktree` | 加粗的 **`worktree:<id>`** 标签 | 仅在 git 工作树中(通过输入 JSON 或 `git` CLI 检测) |
| `git` | Git 分支名(工作目录脏时变黄) | 仅在 git 仓库中 |
| `vim` | Vim 模式 | 仅在启用 vim 键位时 |

#### 会动态变色的字段(统一配色策略)

`context` 和 `effort` 共用同一套红绿灯配色 —— 绿=轻松、黄=留意、红=压力。扫一眼就知道状态。

| 强度 | 颜色 | `context`(剩余) | `effort`(级别) |
|------|------|-------------------|------------------|
| 🟢 轻松 | 绿色 | **> 50%** —— 容量充足 | `low`(含 `xlow`、`minimal`) |
| 🟡 留意 | 黄色 | **20–50%** —— 需注意 | `medium` |
| 🔴 压力 | 红色(effort 加粗) | **< 20%** —— 即将用满,准备压缩 | `high`(含 `xhigh`、`max`) |

每个主题从自己的调色板里取绿/黄/红的具体色值,策略统一、视觉贴合主题。

#### 主题

| 主题 | 风格 | 实际渲染的前缀图标 |
|------|------|--------------------|
| `gruvbox` | 暖色复古,柔和 | `✦` model · `↯` effort · `❋` style · `⌂` dir · `⊕` worktree · `⎇` git · `⌨` vim |
| `dracula` | 现代暗色,饱和度高 | `◈` model · `↯` effort · `❋` style · `⌂` dir · `⊕` worktree · `⎇` git · `⌨` vim |
| `robbyrussell` | 经典 oh-my-zsh | 无前缀图标 —— 仅靠颜色和文本 |
| `minimal` | 终端默认色 | 无前缀图标 —— 纯文本 |

`context` 字段刻意不带前缀图标 —— 彩色进度条本身已经足够醒目。

**替换 effort 图标** 用 `--effort-icon`。预设值:`arrow`(`↯`,默认)、`bolt`(`ϟ`)、`flash`(`⚡`)、`reason`(`∴`)、`dot`(`◉`)、`none`(隐藏)。也可直接传入任意字符。

> ⚠️ **注意:** 生成的脚本需要 `jq` 解析 JSON。在 Windows 下,脚本会自动检测 WinGet 和 scoop 安装的 jq 路径;若仍无法找到 jq,请手动将其目录添加到 PATH。本技能会自动写入 `~/.claude/scripts/statusline.sh` 并更新 `~/.claude/settings.json` —— 重启 Claude Code 即可生效。

> 💡 **还原默认:** 如需回到 Claude Code 原生空白状态栏,运行 `/custom:statusline restore-default` —— 会把生成的脚本备份到 `~/.claude/backups/statusline-<timestamp>.sh`、清除 `settings.json` 中的 `statusLine` 字段、删除生成的脚本,其余设置原样保留。已在默认状态时直接退出 0,不创建空备份。

### ⚙️ /custom:settings-config

一次性配置 `~/.claude/settings.json` 的 4 个核心字段,基于 `elements` 配置表驱动,以后加字段只需在 `ELEMENTS` 数组里加一行。

#### 在 Claude Code 中调用

```
# 交互式 — 选 preset 然后逐字段提示
/custom:settings-config

# 一键配全部 4 个字段(用默认值:中文/xhigh/auto/1)
/custom:settings-config full

# 自然语言参数 — 解析后直接 install
/custom:settings-config effort high language 中文

# 还原默认状态(备份 settings.json 后删除本 skill 管理的 4 个字段)
/custom:settings-config restore-default
```

#### 可配置字段

| 字段 | settings.json 路径 | 合法值 | 默认 |
|------|--------------------|--------|------|
| `language` | `language` | `中文`, `English` | `"中文"` |
| `effortLevel` | `effortLevel` | `low`, `xlow`, `minimal`, `medium`, `high`, `xhigh`, `max` | `"xhigh"` |
| `permissions.mode` | `permissions.defaultMode` | `auto`, `acceptEdits`, `plan`, `bypassPermissions` | `"auto"` |
| `env.traffic` | `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `0`, `1` | `"1"` |

> 💡 **扩展性:** 未来添加 `outputStyle`、`theme`、`CleanupPeriodDays` 等字段,只需在 `skills/settings-config/scripts/configure.mjs` 的 `ELEMENTS` 数组追加一项 + 在 SKILL.md 字段表加一行,主流程完全不需要改动。

> 💡 **还原默认:** 运行 `/custom:settings-config restore-default` —— 备份当前 `settings.json` 到 `~/.claude/backups/settings-<timestamp>.json`,删除 `language` / `effortLevel` / `permissions.defaultMode` / `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 四个字段,**其它字段(env 其它键、plugins、hooks、statusLine 等)全部原样保留**。已处于默认状态时直接退出 0,不创建空备份。

### 📝 /custom:git-commit

分析 Git 改动并生成分子化的 [Conventional Commits](https://www.conventionalcommits.org/) 提交信息,确认后再执行暂存和提交。支持拆分提交、`--amend`、`--signoff`、emoji、指定 type/scope。

#### 在 Claude Code 中调用

```
# 交互式分析已暂存改动
/custom:git-commit

# 暂存区为空时自动 git add -A(仍需二次确认)
/custom:git-commit --all

# 修补上一次提交
/custom:git-commit --amend

# 使用 emoji 前缀
/custom:git-commit --emoji
```

> ⚠️ **安全边界:** 该 skill **强制用户手动调用**,且每次执行 `git commit` 前都会通过 `AskUserQuestion` 二次确认。不会擅自运行构建、测试或改写未授权的改动。

### 🧩 /custom:coding-spec

编码实施阶段的自动触发规范:优先最小可行方案,先问需求是否真实存在(YAGNI),复用仓库已有代码,优先标准库与平台原生特性,只在必要时写刚好够用的代码。

#### 触发场景

- 用户说"用最简单的方案"、"不要过度设计"、"YAGNI"
- 用户抱怨代码臃肿、样板代码过多
- 编写、重构、修复、审查代码时

> 💡 不用于业务分析、方案设计或纯文档请求。

### 🧹 /custom:purge-session

彻底清理单个 Claude Code 历史会话在本地留下的所有痕迹:transcripts、file history、tasks、telemetry、jobs、history entries 以及 dangling 的 `lastSessionId` 引用。

#### 在 Claude Code 中调用

```
# 交互式列出并选择要清理的会话
/custom:purge-session

# 直接指定会话 ID 或显示名
/custom:purge-session <session-id-or-name>
```

#### 安全边界

- **必须手动调用**(`disable-model-invocation: true`),模型不会自动触发。
- 拒绝清理当前正在运行的活动会话。
- 操作前显示 dry-run 清单,并要求用户输入 `delete <session-id>` 精确确认。
- 所有删除路径限制在配置的 Claude 数据目录内。
- 可传入 `--backup` 在改写 `.claude.json` 和 `history.jsonl` 前自动备份。
