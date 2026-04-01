# webup-skills-cc

Claude Code utility skills for customization and hacks.

[中文](README.zh.md) | [日本語](README.ja.md)

## Install

```bash
npx skills find webup/skills-cc
```
```bash
npx skills add webup/skills-cc -g
```
```bash
npx skills add webup/skills-cc -s webup-buddy-reroll -g
```

## Skills

### webup-buddy-reroll

Reroll your `/buddy` companion to any species and rarity — including legendary.

Claude Code's buddy system is deterministic: `hash(userID + SALT)` always produces the same pet. This skill brute-forces a userID that maps to your desired combination.

> **Note:** Only works for API users. Pro/Max Plan subscribers have a locked `userID` and cannot reroll.

**Invoke in Claude Code:**

```
# No args — interactive prompt to choose species and rarity
/webup-buddy-reroll

# With args — skip prompt, lock choice directly
/webup-buddy-reroll dragon legendary
```

**18 Species:**

| | | | | | |
|---|---|---|---|---|---|
| duck | goose | blob | cat | dragon | octopus |
| owl | penguin | turtle | snail | ghost | axolotl |
| capybara | cactus | robot | rabbit | mushroom | chonk |

**5 Rarities:** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

After reroll, restart Claude Code and run `/buddy` to meet your new companion.

> **Note:** Requires Bun runtime (`Bun.hash()` matches Claude Code's internal hashing). Node.js will produce wrong results.

## License

MIT
