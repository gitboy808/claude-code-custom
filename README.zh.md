# webup-skills-cc

Claude Code 实用技能插件 —— 定制与黑科技合集。

[English](README.md) | [日本語](README.ja.md)

## 安装

交互式浏览和选择技能：
```bash
npx skills find webup/skills-cc
```
全局安装全部技能：
```bash
npx skills add webup/skills-cc -g
```
全局仅安装 buddy-reroll：
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## 技能列表

### webup-buddy-reroll

重新抽取 `/buddy` 宠物伙伴，指定物种和稀有度 —— 包括传说级。

Claude Code 的宠物系统是确定性的：`hash(userID + SALT)` 始终生成同一只宠物。本技能通过暴力搜索，找到一个能映射到目标组合的 userID。

> **注意：** 仅适用于 API 用户。Pro/Max 订阅用户的 `userID` 绑定账户，无法替换。

**在 Claude Code 中调用：**

```
# 无参数 — 交互式提示选择物种和稀有度
/webup-buddy-reroll

# 有参数 — 跳过提示，直接锁定选择
/webup-buddy-reroll dragon legendary
```

**18 个物种：**

| | | | | | |
|---|---|---|---|---|---|
| duck 鸭子 | goose 鹅 | blob 果冻 | cat 猫 | dragon 龙 | octopus 章鱼 |
| owl 猫头鹰 | penguin 企鹅 | turtle 乌龟 | snail 蜗牛 | ghost 幽灵 | axolotl 六角恐龙 |
| capybara 水豚 | cactus 仙人掌 | robot 机器人 | rabbit 兔子 | mushroom 蘑菇 | chonk 胖墩 |

**5 个稀有度：** ★ common 普通 (60%) · ★★ uncommon 稀有 (25%) · ★★★ rare 精良 (10%) · ★★★★ epic 史诗 (4%) · ★★★★★ legendary 传说 (1%)

重新抽取后，重启 Claude Code 并执行 `/buddy` 即可领取新宠物。

> **注意：** 需要 Bun 运行时（`Bun.hash()` 与 Claude Code 内部哈希一致）。Node.js 会产生错误结果。

## 许可证

MIT
