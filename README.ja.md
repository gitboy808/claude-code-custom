# webup-skills-cc

Claude Code ユーティリティスキル —— カスタマイズとハック集。

[English](README.md) | [中文](README.zh.md)

## インストール

対話的にスキルを閲覧・選択：
```bash
npx skills find webup/skills-cc
```
全スキルをグローバルインストール：
```bash
npx skills add webup/skills-cc -g
```
buddy-reroll のみグローバルインストール：
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## スキル一覧

### webup-buddy-reroll

`/buddy` コンパニオンを好きな種族・レアリティに引き直す —— レジェンダリーも可能。

Claude Code のバディシステムは決定的：`hash(userID + SALT)` は常に同じペットを生成します。このスキルは目的の組み合わせにマッピングされる userID をブルートフォースで探します。

> **注意：** API ユーザー限定。Pro/Max プランのサブスクライバーは `userID` がアカウントに紐付けられているため使用できません。

**Claude Code での呼び出し方：**

```
# 引数なし — 対話的に種族とレアリティを選択
/webup-buddy-reroll

# 引数あり — プロンプトをスキップし直接指定
/webup-buddy-reroll dragon legendary
```

**18 種族：**

| | | | | | |
|---|---|---|---|---|---|
| duck アヒル | goose ガチョウ | blob ブロブ | cat ネコ | dragon ドラゴン | octopus タコ |
| owl フクロウ | penguin ペンギン | turtle カメ | snail カタツムリ | ghost ゴースト | axolotl ウーパールーパー |
| capybara カピバラ | cactus サボテン | robot ロボット | rabbit ウサギ | mushroom キノコ | chonk ぽっちゃり |

**5 段階レアリティ：** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

リロール後、Claude Code を再起動して `/buddy` で新しいコンパニオンを迎えましょう。

> **注意：** Bun ランタイムが必要です（`Bun.hash()` が Claude Code 内部のハッシュと一致）。Node.js では正しい結果が得られません。

## ライセンス

MIT
