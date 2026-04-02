# 🛠️ webup-skills-cc

Claude Code 实用技能插件 —— 定制与黑科技合集。

[English](README.md) | [日本語](README.ja.md)

## 📦 安装

🔍 交互式浏览和选择技能：
```bash
npx skills find webup/skills-cc
```
🌐 全局安装全部技能：
```bash
npx skills add webup/skills-cc -g
```
🎯 全局仅安装 buddy-reroll：
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## 🎮 技能列表

### 🎰 webup-buddy-reroll

重新抽取 `/buddy` 宠物伙伴，指定物种和稀有度 —— 包括 ✨ 传说级。还能给宠物改名、自定义个性描述。

Claude Code 的宠物系统是确定性的：`hash(userID + SALT)` 始终生成同一只宠物。本技能通过暴力搜索，找到一个能映射到目标组合的 userID。

> **API 用户**：直接可用。**Pro/Max 订阅用户**：技能会自动检测 `accountUuid` 并引导你完成 OAuth 设置以绕过锁定 —— 无需手动操作。

**在 Claude Code 中调用：**

```
# 交互式 — 选择物种、稀有度、名字、个性
/webup-buddy-reroll

# 仅 reroll
/webup-buddy-reroll dragon legendary

# reroll + 改名一步到位
/webup-buddy-reroll dragon legendary 沧海九粟 爱打盹的小龙

# 仅改名/改个性（自然语言）
/webup-buddy-reroll 改名叫沧海九粟，个性是爱打盹的小龙
```

**🐾 18 个物种：**

| | | | | | |
|---|---|---|---|---|---|
| 🦆 duck 鸭子 | 🪿 goose 鹅 | 🫧 blob 果冻 | 🐱 cat 猫 | 🐉 dragon 龙 | 🐙 octopus 章鱼 |
| 🦉 owl 猫头鹰 | 🐧 penguin 企鹅 | 🐢 turtle 乌龟 | 🐌 snail 蜗牛 | 👻 ghost 幽灵 | 🦎 axolotl 六角恐龙 |
| 🦫 capybara 水豚 | 🌵 cactus 仙人掌 | 🤖 robot 机器人 | 🐰 rabbit 兔子 | 🍄 mushroom 蘑菇 | 🐷 chonk 胖墩 |

**💎 5 个稀有度：** ★ common 普通 (60%) · ★★ uncommon 稀有 (25%) · ★★★ rare 精良 (10%) · ★★★★ epic 史诗 (4%) · ★★★★★ legendary 传说 (1%)

重新抽取后，重启 Claude Code 并执行 `/buddy` 即可领取新宠物！🎉

> ⚠️ **注意：** 需要 Bun 运行时（`Bun.hash()` 与 Claude Code 内部哈希一致）。Node.js 会产生错误结果。

### 📊 webup-statusline

生成并安装自定义 Claude Code 状态栏 —— 选择显示元素、配色主题和前缀图标。

可选显示内容（模型名、上下文进度条、输出样式、Git 分支、目录、Vim 模式），选择主题（Gruvbox Dark、Dracula、Robbyrussell、Minimal），并为输出样式指示器选一个前缀图标。

**在 Claude Code 中调用：**

```
# 交互式 — 选择元素、主题、图标
/webup-statusline

# 快速选择主题
/webup-statusline dracula

# 自然语言
/webup-statusline 极简主题 加上git分支和进度条
```

**🎨 4 个主题：**

| 主题 | 风格 |
|------|------|
| 🌾 Gruvbox Dark | 暖色复古 — 青绿、水绿、暖黄、柔绿 |
| 🧛 Dracula | 现代暗色 — 紫、粉、青 |
| 💎 Robbyrussell | 经典 oh-my-zsh — 红色目录、绿色箭头 |
| 🪶 Minimal | 极简 — 无装饰，仅暗色分隔符 |

**输出示例**（Gruvbox Dark）：
```
✦ Opus 4.6 | [■■■■■■■■■■□□□□□□□□□□] 49% | ✦thinking | ◆ my-project | ⎇ main
```

> ⚠️ **注意：** 生成的状态栏脚本需要 `jq` 来解析 JSON 输入。

## 📄 许可证

MIT
