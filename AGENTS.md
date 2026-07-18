## Project Overview

Claude Code marketplace plugin providing utility skills for customization and hacks.

## Architecture

```
skills/
└── [custom]                  # Claude Code customization skills (plugin name: custom)
```

Each skill contains:
- `SKILL.md` - YAML front matter (name, description) + workflow instructions

## Running Skills

All scripts run via Bun:

```bash
bun skills/<skill>/scripts/main.js [options]
```

## Adding New Skills

1. Create `skills/<name>/SKILL.md` with YAML front matter
2. Add scripts in `skills/<name>/scripts/` only if the skill needs executable helpers
3. Register in `marketplace.json` under appropriate category
