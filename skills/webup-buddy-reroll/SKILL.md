---
name: webup-buddy-reroll
description: Reroll Claude Code /buddy companion to a target species and rarity. Use when the user wants to change their buddy pet, get a legendary companion, reroll their buddy, or is unhappy with their current /buddy result. Triggers on "reroll buddy", "change buddy", "legendary buddy", "new companion", "buddy hack", "换宠物", "重新抽", "传说宠物", "バディ変更", "伝説バディ", or similar.
---

# Buddy Reroll

Brute-force a new `/buddy` companion by finding a userID that hashes to the desired species and rarity.

通过暴力搜索 userID 来获取指定物种和稀有度的 `/buddy` 伙伴。

ブルートフォースで userID を探索し、指定した種族とレアリティの `/buddy` コンパニオンを取得します。

## How It Works / 原理 / 仕組み

Claude Code generates companions deterministically: `hash(userID + SALT)` → `mulberry32` PRNG → rarity, species, eyes, hat, shiny. Same userID = same companion, always.

Claude Code 通过确定性算法生成伙伴：`hash(userID + SALT)` → `mulberry32` PRNG → 稀有度、物种、眼睛、帽子、闪光。相同 userID 始终生成相同伙伴。

Claude Code はコンパニオンを決定論的に生成します：`hash(userID + SALT)` → `mulberry32` PRNG → レアリティ、種族、目、帽子、シャイニー。同じ userID は常に同じコンパニオンになります。

To reroll: replace `userID` in `~/.claude.json`, clear `companion` field, restart.

重新抽取：替换 `~/.claude.json` 中的 `userID`，清除 `companion` 字段，重启即可。

リロール方法：`~/.claude.json` の `userID` を置換し、`companion` フィールドをクリアして再起動。

**Critical**: Claude Code is Bun-bundled, so `Bun.hash()` (xxHash64) is the correct hash function. Node.js FNV-1a produces wrong results — the script MUST run under Bun.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.mjs`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/reroll.mjs` | Brute-force target species+rarity, optionally apply to config |

## Prerequisites / 前提条件 / 前提条件

- **Claude Code >= 2.1.89** — the `/buddy` system was introduced in this version. The script auto-checks and exits if the version is too old.
- **Bun** — required for correct hashing. Use `npx -y bun` if not installed globally.
- **API users only** — This skill does NOT work for Pro/Max Plan subscribers whose `userID` is locked to their account. It only works for API users whose `userID` in `~/.claude.json` can be freely replaced.

- **Claude Code >= 2.1.89** — `/buddy` 系统从此版本引入。脚本会自动检测版本，过低则退出。
- **Bun** — 正确哈希所需。未全局安装时可用 `npx -y bun`。
- **仅限 API 用户** — 本技能不适用于 Pro/Max 订阅用户（其 `userID` 绑定账户，无法替换）。仅适用于 API 用户，其 `~/.claude.json` 中的 `userID` 可自由替换。

- **Claude Code >= 2.1.89** — `/buddy` システムはこのバージョンで導入。スクリプトが自動でバージョンチェックします。
- **Bun** — 正しいハッシュに必要。グローバル未インストールなら `npx -y bun` を使用。
- **API ユーザー限定** — Pro/Max プランのサブスクライバーは `userID` がアカウントに紐付けられているため、このスキルは動作しません。`~/.claude.json` の `userID` を自由に変更できる API ユーザーのみ対象です。

## Usage

```bash
# Direct (if bun is installed globally)
bun ${SKILL_DIR}/scripts/reroll.mjs --species dragon --rarity legendary --apply

# Via npx (works even without global bun install)
npx -y bun ${SKILL_DIR}/scripts/reroll.mjs --species dragon --rarity legendary --apply
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--species <name>` | `dragon` | Target species (see list below) |
| `--rarity <level>` | `legendary` | Minimum rarity: common / uncommon / rare / epic / legendary |
| `--max <n>` | `1000000` | Max brute-force iterations |
| `--apply` | off | Auto-write result to `~/.claude.json` and clear companion |

### Species (18)

| | | | | | |
|---|---|---|---|---|---|
| duck | goose | blob | cat | dragon | octopus |
| owl | penguin | turtle | snail | ghost | axolotl |
| capybara | cactus | robot | rabbit | mushroom | chonk |

### Rarity Tiers

| Rarity | Stars | Chance | ~Iterations to find |
|--------|-------|--------|---------------------|
| common | ★ | 60% | ~30 |
| uncommon | ★★ | 25% | ~72 |
| rare | ★★★ | 10% | ~180 |
| epic | ★★★★ | 4% | ~450 |
| legendary | ★★★★★ | 1% | ~1800 |

## Invocation / 调用方式 / 呼び出し方法

This skill can be invoked with or without arguments:

- **No args** (`/webup-buddy-reroll`): Prompts the user to choose species and rarity interactively via `AskUserQuestion` before running.
- **With args** (`/webup-buddy-reroll dragon legendary`): Skips the prompt and locks the choice to the given species and rarity directly.

本技能支持有参数和无参数两种调用方式：

- **无参数** (`/webup-buddy-reroll`)：运行前通过 `AskUserQuestion` 交互式提示用户选择物种和稀有度。
- **有参数** (`/webup-buddy-reroll dragon legendary`)：跳过提示，直接使用指定的物种和稀有度。

引数あり・なし両方で呼び出せます：

- **引数なし** (`/webup-buddy-reroll`)：実行前に `AskUserQuestion` で種族とレアリティを対話的に選択。
- **引数あり** (`/webup-buddy-reroll dragon legendary`)：プロンプトをスキップし、指定した種族とレアリティで直接実行。

## Workflow

1. **If no args provided**: Use `AskUserQuestion` to ask the user to pick a species AND a rarity in a single prompt (two questions):
   - **Species question**: Present 4 popular options (dragon, cat, duck, axolotl) as choices. The user can type any of the 18 species via "Other".
   - **Rarity question**: Present all 5 tiers (legendary as first/recommended, then epic, rare, uncommon, common).
   - Do NOT skip this step. Always ask even if the user mentioned a species — confirm their choice.

   **If args provided**: Parse `<species>` and `<rarity>` from the args. Skip the prompt and proceed directly.
2. Run the script with `--apply`:
   ```bash
   npx -y bun ${SKILL_DIR}/scripts/reroll.mjs --species <choice> --rarity <choice> --apply
   ```
3. Tell user to restart Claude Code and run `/buddy` to hatch the new companion.
   告知用户重启 Claude Code 并运行 `/buddy` 来孵化新伙伴。
   ユーザーに Claude Code を再起動して `/buddy` で新しいコンパニオンを孵化するよう伝える。

## Manual Apply / 手动应用 / 手動適用

If `--apply` was not used:
1. Copy the output userID
2. Edit `~/.claude.json`: replace `"userID"` value, set `"companion": null`
3. Restart Claude Code → `/buddy`

未使用 `--apply` 时：
1. 复制输出的 userID
2. 编辑 `~/.claude.json`：替换 `"userID"` 值，设置 `"companion": null`
3. 重启 Claude Code → `/buddy`

`--apply` を使わなかった場合：
1. 出力された userID をコピー
2. `~/.claude.json` を編集：`"userID"` の値を置換、`"companion": null` に設定
3. Claude Code を再起動 → `/buddy`

## Notes / 备注 / 注意事項

- `userID` only affects telemetry bucketing and buddy seed — no impact on conversations, API keys, or local config
- SALT is `friend-2026-401` (Claude Code 2.1.89). Update the script if a future version changes it
- 1M iterations finds legendary in seconds on modern hardware

- `userID` 仅影响遥测分组和伙伴种子 — 不影响对话、API 密钥或本地配置
- SALT 为 `friend-2026-401`（Claude Code 2.1.89）。若未来版本更改，需更新脚本
- 100 万次迭代在现代硬件上几秒即可找到传说级

- `userID` はテレメトリのバケット分けとバディシードにのみ影響 — 会話、APIキー、ローカル設定には無関係
- SALT は `friend-2026-401`（Claude Code 2.1.89）。将来バージョンで変更された場合はスクリプトを更新
- 100万回の反復でもレジェンダリーは数秒で見つかります
