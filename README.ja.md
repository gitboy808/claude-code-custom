# 🛠️ webup-skills-cc

Claude Code ユーティリティスキル —— カスタマイズとハック集。

[English](README.md) | [中文](README.zh.md)

## 📦 インストール

🔍 対話的にスキルを閲覧・選択：
```bash
npx skills find webup/skills-cc
```
🌐 全スキルをグローバルインストール：
```bash
npx skills add webup/skills-cc -g
```
🎯 buddy-reroll のみグローバルインストール：
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## 🎮 スキル一覧

### 🎰 webup-buddy-reroll

`/buddy` コンパニオンを好きな種族・レアリティに引き直す —— ✨ レジェンダリーも可能。名前やパーソナリティのカスタマイズにも対応。

Claude Code のバディシステムは決定的：`hash(userID + SALT)` は常に同じペットを生成します。このスキルは目的の組み合わせにマッピングされる userID をブルートフォースで探します。

> **API ユーザー**：そのまま利用可能。**Pro/Max サブスクライバー**：スキルが `accountUuid` を自動検出し、ロックを回避する OAuth セットアップを案内します。手動操作は不要です。

**Claude Code での呼び出し方：**

```
# 対話式 — 種族・レアリティ・名前・パーソナリティを選択
/webup-buddy-reroll

# リロールのみ
/webup-buddy-reroll dragon legendary

# リロール＋リネームを一括実行
/webup-buddy-reroll dragon legendary 沧海九粟 爱打盹的小龙

# リネームのみ（自然言語）
/webup-buddy-reroll rename to Nimbus, personality: sarcastic robot
```

**🐾 18 種族：**

| | | | | | |
|---|---|---|---|---|---|
| 🦆 duck アヒル | 🪿 goose ガチョウ | 🫧 blob ブロブ | 🐱 cat ネコ | 🐉 dragon ドラゴン | 🐙 octopus タコ |
| 🦉 owl フクロウ | 🐧 penguin ペンギン | 🐢 turtle カメ | 🐌 snail カタツムリ | 👻 ghost ゴースト | 🦎 axolotl ウーパールーパー |
| 🦫 capybara カピバラ | 🌵 cactus サボテン | 🤖 robot ロボット | 🐰 rabbit ウサギ | 🍄 mushroom キノコ | 🐷 chonk ぽっちゃり |

**💎 5 段階レアリティ：** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

リロール後、Claude Code を再起動して `/buddy` で新しいコンパニオンを迎えましょう！🎉

> ⚠️ **注意：** Bun ランタイムが必要です（`Bun.hash()` が Claude Code 内部のハッシュと一致）。Node.js では正しい結果が得られません。

## 📄 ライセンス

MIT
