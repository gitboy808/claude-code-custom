# webup-skills-cc

Claude Code 实用技能插件 —— 定制与黑科技合集。

[English](README.md) | [日本語](README.ja.md)

## 技能列表

### buddy-reroll

重新抽取 `/buddy` 宠物伙伴，指定物种和稀有度 —— 包括传说级。

Claude Code 的宠物系统是确定性的：`hash(userID + SALT)` 始终生成同一只宠物。本技能通过暴力搜索，找到一个能映射到目标组合的 userID。

**使用方法：**

```bash
npx -y bun skills/buddy-reroll/scripts/reroll.mjs --species dragon --rarity legendary --apply
```

**18 个物种：**

| | | | | | |
|---|---|---|---|---|---|
| duck 鸭子 | goose 鹅 | blob 果冻 | cat 猫 | dragon 龙 | octopus 章鱼 |
| owl 猫头鹰 | penguin 企鹅 | turtle 乌龟 | snail 蜗牛 | ghost 幽灵 | axolotl 六角恐龙 |
| capybara 水豚 | cactus 仙人掌 | robot 机器人 | rabbit 兔子 | mushroom 蘑菇 | chonk 胖墩 |

**5 个稀有度：** ★ common 普通 (60%) · ★★ uncommon 稀有 (25%) · ★★★ rare 精良 (10%) · ★★★★ epic 史诗 (4%) · ★★★★★ legendary 传说 (1%)

**参数说明：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--species` | dragon | 目标物种 |
| `--rarity` | legendary | 最低稀有度 |
| `--max` | 1000000 | 最大迭代次数 |
| `--apply` | 关闭 | 自动写入 `~/.claude.json` |

运行带 `--apply` 后，重启 Claude Code 并执行 `/buddy` 即可领取新宠物。

> **注意：** 需要 Bun 运行时（`Bun.hash()` 与 Claude Code 内部哈希一致）。Node.js 会产生错误结果。

## 作为 Claude Code 插件安装

```bash
# 从本地路径安装
/plugin install /path/to/skills-cc
```

## 原理简述

1. **Bones（骨架）**：外观由 `hash(userID + SALT)` 确定性生成，不存储，实时计算
2. **Soul（灵魂）**：名字和性格由模型生成，存储在 `~/.claude.json` 的 `companion` 字段
3. **关键坑**：Claude Code 用 Bun 打包，内部使用 `Bun.hash()`（xxHash64）。用 Node.js 的 FNV-1a 跑出来的结果完全不对

换掉 `userID` 不影响对话历史、API key 或本地配置 —— 它只用于遥测分桶和宠物种子。

## 许可证

MIT
