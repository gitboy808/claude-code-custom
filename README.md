# 🛠️ webup-skills-cc

Claude Code utility skills for customization and hacks.

[中文](README.zh.md) | [日本語](README.ja.md)

## 📦 Install

🔍 Browse & pick skills interactively:
```bash
npx skills find webup/skills-cc
```
🌐 Install all skills globally:
```bash
npx skills add webup/skills-cc -g
```
🎯 Install only buddy-reroll globally:
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## 🎮 Skills

### 🎰 webup-buddy-reroll

Reroll your `/buddy` companion to any species and rarity — including ✨ legendary. Also rename your companion and give it a custom personality.

Claude Code's buddy system is deterministic: `hash(userID + SALT)` always produces the same pet. This skill brute-forces a userID that maps to your desired combination.

> **API users**: works directly. **Pro/Max subscribers**: the skill auto-detects `accountUuid` and walks you through an OAuth setup that bypasses the lock — no manual steps needed.

**Invoke in Claude Code:**

```
# Interactive — choose species, rarity, name, personality
/webup-buddy-reroll

# Reroll only
/webup-buddy-reroll dragon legendary

# Reroll + rename in one shot
/webup-buddy-reroll dragon legendary 沧海九粟 爱打盹的小龙

# Rename only (natural language)
/webup-buddy-reroll rename to Nimbus, personality: sarcastic robot
```

**🐾 18 Species:**

| | | | | | |
|---|---|---|---|---|---|
| 🦆 duck | 🪿 goose | 🫧 blob | 🐱 cat | 🐉 dragon | 🐙 octopus |
| 🦉 owl | 🐧 penguin | 🐢 turtle | 🐌 snail | 👻 ghost | 🦎 axolotl |
| 🦫 capybara | 🌵 cactus | 🤖 robot | 🐰 rabbit | 🍄 mushroom | 🐷 chonk |

**💎 5 Rarities:** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

After reroll, restart Claude Code and run `/buddy` to meet your new companion! 🎉

> ⚠️ **Note:** Requires Bun runtime (`Bun.hash()` matches Claude Code's internal hashing). Node.js will produce wrong results.

## 📄 License

MIT
