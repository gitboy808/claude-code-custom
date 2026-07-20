## Project Overview

Agent Skills repository with an optional Claude Code marketplace. The same skill
sources support short `/skill-name` installs and namespaced plugin installs.

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
```

Each plugin is versioned independently. Bump only the changed plugin's semver in
its `.claude-plugin/plugin.json` for every release.

Keep each skill under `plugins/<plugin>/skills/<skill>` as the single source of
truth. The Agent Skills CLI discovers these nested skills directly; do not add a
second top-level copy.
