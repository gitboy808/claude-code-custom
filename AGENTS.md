## Project Overview

Agent Skills repository with an optional Claude Code marketplace. Standalone
skills support short `/skill-name` installs; only capabilities that need plugin
distribution are listed in the marketplace.

## Architecture

```
.claude-plugin/
└── marketplace.json          # marketplace catalog only
plugins/
└── <plugin>/
    ├── .claude-plugin/
    │   └── plugin.json       # per-plugin manifest
    └── skills/
        └── <skill>/
skills/
└── <skill>/
    └── SKILL.md              # standalone skill source
```

Each plugin is versioned independently. Bump only the changed plugin's semver in
its `.claude-plugin/plugin.json` for every release.

Keep plugin skills under `plugins/<plugin>/skills/<skill>` and standalone skills
under `skills/<skill>` as their single sources of truth. Do not add duplicate
copies under `.claude/skills`; installers place standalone skills there.

The marketplace contains exactly two plugins:

- `purge-session`, with the single `purge-session` skill.
- `settings-config`, with the `settings-config` and `statusline` skills.

All other skills remain standalone and must not have `.claude-plugin/plugin.json`
manifests or marketplace entries.
