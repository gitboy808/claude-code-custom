# webup-skills-cc

Claude Code utility skills for customization and hacks.

[中文](README.zh.md) | [日本語](README.ja.md)

## Skills

### buddy-reroll

Reroll your `/buddy` companion to any species and rarity — including legendary.

Claude Code's buddy system is deterministic: `hash(userID + SALT)` always produces the same pet. This skill brute-forces a userID that maps to your desired combination.

**Usage:**

```bash
npx -y bun skills/buddy-reroll/scripts/reroll.mjs --species dragon --rarity legendary --apply
```

**18 Species:**

| | | | | | |
|---|---|---|---|---|---|
| duck | goose | blob | cat | dragon | octopus |
| owl | penguin | turtle | snail | ghost | axolotl |
| capybara | cactus | robot | rabbit | mushroom | chonk |

**5 Rarities:** ★ common (60%) · ★★ uncommon (25%) · ★★★ rare (10%) · ★★★★ epic (4%) · ★★★★★ legendary (1%)

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--species` | dragon | Target species |
| `--rarity` | legendary | Minimum rarity threshold |
| `--max` | 1000000 | Max iterations |
| `--apply` | off | Auto-write to `~/.claude.json` |

After running with `--apply`, restart Claude Code and run `/buddy` to meet your new companion.

> **Note:** Requires Bun runtime (`Bun.hash()` matches Claude Code's internal hashing). Node.js will produce wrong results.

## Install as Claude Code Plugin

```bash
# From local path
/plugin install /path/to/skills-cc

# Or add the marketplace and install
/plugin marketplace add <repo-url>
/plugin install skills-cc
```

## License

MIT
