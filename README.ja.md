# webup-skills-cc

Claude Code ユーティリティスキル —— カスタマイズとハック集。

[English](README.md) | [中文](README.zh.md)

## スキル一覧

### buddy-reroll

`/buddy` コンパニオンを好きな種族・レアリティに引き直す —— レジェンダリーも可能。

Claude Code のバディシステムは決定的：`hash(userID + SALT)` は常に同じペットを生成します。このスキルは目的の組み合わせにマッピングされる userID をブルートフォースで探します。

**使い方：**

```bash
npx -y bun skills/buddy-reroll/scripts/reroll.mjs --species dragon --rarity legendary --apply
```

**18 種族：**

| | | | | | |
|---|---|---|---|---|---|
| duck アヒル | goose ガチョウ | blob ブロブ | cat ネコ | dragon ドラゴン | octopus タコ |
| owl フクロウ | penguin ペンギン | turtle カメ | snail カタツムリ | ghost ゴースト | axolotl ウーパールーパー |
| capybara カピバラ | cactus サボテン | robot ロボット | rabbit ウサギ | mushroom キノコ | chonk ぽっちゃり |

**5 段階レアリティ：** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

**オプション：**

| フラグ | デフォルト | 説明 |
|--------|-----------|------|
| `--species` | dragon | 目標種族 |
| `--rarity` | legendary | 最低レアリティ |
| `--max` | 1000000 | 最大イテレーション数 |
| `--apply` | オフ | `~/.claude.json` に自動書き込み |

`--apply` 付きで実行後、Claude Code を再起動して `/buddy` で新しいコンパニオンを迎えましょう。

> **注意：** Bun ランタイムが必要です（`Bun.hash()` が Claude Code 内部のハッシュと一致）。Node.js では正しい結果が得られません。

## Claude Code プラグインとしてインストール

```bash
# ローカルパスからインストール
/plugin install /path/to/skills-cc
```

## 仕組み

1. **Bones（骨格）**：外観は `hash(userID + SALT)` で決定的に生成、保存されずリアルタイム計算
2. **Soul（魂）**：名前と性格はモデルが生成、`~/.claude.json` の `companion` フィールドに保存
3. **重要な注意点**：Claude Code は Bun でバンドルされており、内部で `Bun.hash()`（xxHash64）を使用。Node.js の FNV-1a では全く異なる結果になる

`userID` を変更しても会話履歴、API キー、ローカル設定には影響しません —— テレメトリのバケッティングとバディシードにのみ使用されます。

## ライセンス

MIT
