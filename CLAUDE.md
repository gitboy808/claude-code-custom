# CLAUDE.md

## Project Overview

webup-skills-cc — Claude Code marketplace plugin providing utility skills for customization and hacks.

## Architecture

```
skills/
└── [cc-hacks]                 # Claude Code customization skills
    └── buddy-reroll/          # Reroll /buddy companion to target species+rarity
```

Each skill contains:
- `SKILL.md` - YAML front matter (name, description) + workflow instructions
- `scripts/` - Bun/TypeScript implementations

## Running Skills

All scripts run via Bun:

```bash
bun skills/<skill>/scripts/main.js [options]
```

## Adding New Skills

1. Create `skills/<name>/SKILL.md` with YAML front matter
2. Add scripts in `skills/<name>/scripts/`
3. Register in `marketplace.json` under appropriate category
4. Include Script Directory section in SKILL.md

## Code Style

- TypeScript/JavaScript, minimal comments
- Bun runtime preferred (Claude Code uses Bun internally)
