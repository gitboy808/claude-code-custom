#!/usr/bin/env bun
// Generate a custom Claude Code status line shell script.
// Usage: bun generate.mjs [--elements <list>] [--theme <name>] [--effort-icon <preset|char>] [--install | --restore-default]

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync, copyFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { parseArgs } from 'util'

// ── Metadata: single source of truth for columns, presets, themes, icons ──

const DEFAULT_ELEMENTS = 'model,context,cost,effort,style,git,dir'

const COLUMNS = [
  { id: 'model',    name: 'Model',     desc: 'Active model name',                       source: 'model.display_name',                              hidden: null },
  { id: 'context',  name: 'Context',   desc: 'Progress bar + percentage (auto-compact window)', source: 'total_input_tokens ÷ CLAUDE_CODE_AUTO_COMPACT_WINDOW → settings → context_window_size', hidden: null, note: 'No prefix icon' },
  { id: 'cost',     name: 'Cost',      desc: 'Session API spend formatted as $X.XX',    source: 'cost.total_cost_usd',                             hidden: '< $0.005' },
  { id: 'effort',   name: 'Effort',    desc: 'Reasoning effort level',                  source: 'effort.level → effortLevel in ~/.claude/settings.json',   hidden: 'unset' },
  { id: 'style',    name: 'Style',     desc: 'Output style name',                       source: 'output_style.name',                               hidden: '"default"' },
  { id: 'git',      name: 'Git',       desc: 'Git branch name',                         source: 'worktree.branch → git CLI',                       hidden: null },
  { id: 'dir',      name: 'Directory', desc: 'Repo basename (main repo in worktrees)', source: 'git --git-common-dir → workspace.current_dir',   hidden: null },
  { id: 'worktree', name: 'Worktree',  desc: 'Bold worktree:<id> label',                source: 'worktree.name → workspace.git_worktree',          hidden: 'outside a worktree' },
  { id: 'vim',      name: 'Vim',       desc: 'Vim mode indicator',                      source: 'vim.mode',                                        hidden: 'inactive' },
]

const COLUMN_PRESETS = [
  { id: 'everything', label: 'Everything (Recommended)', desc: 'All useful columns; vim excluded', elements: ['model','context','cost','effort','style','git','dir','worktree'] },
  { id: 'default',    label: 'Default',                  desc: 'Balanced',                         elements: ['model','context','effort','style','git','dir'] },
  { id: 'essentials', label: 'Essentials',               desc: 'Lean',                             elements: ['model','context','git','dir'] },
]

const THEME_DEFAULTS = {
  name: 'Minimal',
  colors: {
    model:     '\\033[0m',
    ctx_ok:    '\\033[32m',
    ctx_warn:  '\\033[33m',
    ctx_low:   '\\033[31m',
    bar_empty: '\\033[2m',
    pct:       '\\033[0m',
    dir:       '\\033[2m',
    git:       '\\033[0m',
    git_dirty: '\\033[33m',
    vim:       '\\033[0m',
    worktree:  '\\033[2m',
    style:     '\\033[0m',
    cost:      '\\033[33m',
    effort_high: '\\033[1;31m',
    effort_med:  '\\033[33m',
    effort_low:  '\\033[32m',
    effort_off:  '\\033[2m',
    sep:       '\\033[2m',
  },
  separator: ' · ',
  barChars: ['▰', '▱'],
  icons: { model: '', context: '', cost: '', dir: '', git: '', vim: '', worktree: '', effort: '', style: '' },
}

const THEMES = {
  gruvbox: {
    name: 'Gruvbox Dark',
    colors: {
      model:     '\\033[38;2;86;182;194m',
      ctx_ok:    '\\033[38;2;142;192;124m',
      ctx_warn:  '\\033[38;2;250;189;47m',
      ctx_low:   '\\033[38;2;251;73;52m',
      bar_empty: '\\033[38;2;80;73;69m',
      pct:       '\\033[38;2;251;241;199m',
      dir:       '\\033[38;2;152;195;121m',
      git:       '\\033[38;2;143;175;209m',
      git_dirty: '\\033[38;2;224;175;104m',
      vim:       '\\033[38;2;214;93;14m',
      worktree:  '\\033[38;2;211;134;155m',
      style:     '\\033[38;2;177;98;134m',
      cost:      '\\033[38;2;215;153;33m',
      effort_high: '\\033[1;38;2;251;73;52m',
      effort_med:  '\\033[38;2;250;189;47m',
      effort_low:  '\\033[38;2;142;192;124m',
      effort_off:  '\\033[2;38;2;168;153;132m',
      sep:       '\\033[38;2;102;92;84m',
    },
    separator: ' | ',
    barChars: ['■', '□'],
    icons: { model: '✦', dir: '⌂', git: '⎇', vim: '⌨', worktree: '⊕', effort: '↯', style: '❋' },
  },
  robbyrussell: {
    name: 'Robbyrussell',
    colors: {
      model:     '\\033[38;5;45m',
      ctx_ok:    '\\033[38;5;32m',
      ctx_warn:  '\\033[38;5;220m',
      ctx_low:   '\\033[38;5;196m',
      bar_empty: '\\033[2m',
      pct:       '\\033[38;5;220m',
      dir:       '\\033[38;5;39m',
      git:       '\\033[38;5;32m',
      git_dirty: '\\033[38;5;220m',
      vim:       '\\033[38;5;45m',
      worktree:  '\\033[38;5;170m',
      style:     '\\033[38;5;135m',
      cost:      '\\033[38;5;172m',
      effort_high: '\\033[1;38;5;196m',
      effort_med:  '\\033[38;5;220m',
      effort_low:  '\\033[38;5;32m',
      effort_off:  '\\033[2m',
      sep:       '\\033[2m',
    },
    separator: ' · ',
    barChars: ['━', '─'],
  },
  dracula: {
    name: 'Dracula',
    colors: {
      model:     '\\033[38;2;189;147;249m',
      ctx_ok:    '\\033[38;2;80;250;123m',
      ctx_warn:  '\\033[38;2;241;250;140m',
      ctx_low:   '\\033[38;2;255;85;85m',
      bar_empty: '\\033[38;2;68;71;90m',
      pct:       '\\033[38;2;248;248;242m',
      dir:       '\\033[38;2;139;233;253m',
      git:       '\\033[38;2;255;184;108m',
      git_dirty: '\\033[38;2;241;250;140m',
      vim:       '\\033[38;2;241;250;140m',
      worktree:  '\\033[38;2;255;121;198m',
      style:     '\\033[38;2;189;147;249m',
      cost:      '\\033[38;2;255;215;0m',
      effort_high: '\\033[1;38;2;255;85;85m',
      effort_med:  '\\033[38;2;241;250;140m',
      effort_low:  '\\033[38;2;80;250;123m',
      effort_off:  '\\033[2;38;2;98;114;164m',
      sep:       '\\033[38;2;98;114;164m',
    },
    separator: ' | ',
    barChars: ['■', '□'],
    icons: { model: '◈', dir: '⌂', git: '⎇', vim: '⌨', worktree: '⊕', effort: '↯', style: '❋' },
  },
  minimal: {
    name: 'Minimal',
  },
}

const EFFORT_ICON_PRESETS = {
  arrow:  { glyph: '↯', desc: 'Electric arrow — default for iconic themes, narrow' },
  bolt:   { glyph: 'ϟ', desc: 'Greek koppa — narrow lightning' },
  flash:  { glyph: '⚡', desc: 'Classic lightning — wide in emoji-presentation fonts' },
  reason: { glyph: '∴', desc: 'Therefore' },
  dot:    { glyph: '◉', desc: 'Filled circle' },
  none:   { glyph: '',  desc: 'Drop the icon entirely' },
}

// Official effort.level values: low | medium | high | xhigh | max
// (ultracode is not a distinct level — Claude Code reports it as xhigh)
const EFFORT_LEVELS = [
  { tier: 'high',   aliases: ['max','xhigh','high'],             color: 'effort_high' },
  { tier: 'medium', aliases: ['medium'],                         color: 'effort_med' },
  { tier: 'low',    aliases: ['low'],                            color: 'effort_low' },
  { tier: 'off',    aliases: [],                                 color: 'effort_off' },
]

const CONTEXT_THRESHOLDS = [
  { maxRemaining: 20,  color: 'ctx_low',  label: 'low' },
  { maxRemaining: 50,  color: 'ctx_warn', label: 'warn' },
  { maxRemaining: 100, color: 'ctx_ok',   label: 'ok' },
]

const COST_THRESHOLD = 0.005

const COLUMN_IDS = COLUMNS.map(c => c.id)
const THEME_NAMES = Object.keys(THEMES)

// ── Helpers ───────────────────────────────────────────────────────────────

function deepMerge(base, override) {
  const out = structuredClone(base)
  for (const key of Object.keys(override)) {
    const val = override[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = deepMerge(out[key] ?? {}, val)
    } else {
      out[key] = val
    }
  }
  return out
}

function buildTheme(name) {
  const override = THEMES[name]
  if (!override) return null
  return deepMerge(THEME_DEFAULTS, override)
}

function loadSettings(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Warning: could not parse ${path}: ${err.message}`)
    }
    return {}
  }
}

// Escape a string so it can safely appear inside a bash single-quoted '...' string.
function shellQuote(str) {
  return str.replace(/'/g, "'\\'\\''")
}

// Return an icon string with a trailing space, or empty string if no icon.
function iconWithSpace(icon) {
  return icon ? `${icon} ` : ''
}

// Return the three common case variants for a bash case pattern: lower, UPPER, Capitalized.
function caseVariants(str) {
  return [str, str.toUpperCase(), str.charAt(0).toUpperCase() + str.slice(1)]
}

// ── CLI parsing ───────────────────────────────────────────────────────────

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    elements:            { type: 'string',  default: DEFAULT_ELEMENTS },
    theme:               { type: 'string',  default: 'gruvbox' },
    'effort-icon':       { type: 'string' },
    install:             { type: 'boolean' },
    'restore-default':   { type: 'boolean' },
    help:                { type: 'boolean' },
    'list-columns':      { type: 'boolean' },
    'list-effort-icons': { type: 'boolean' },
    'list-presets':      { type: 'boolean' },
  },
  strict: true,
  allowPositionals: false,
})

const themeName = values.theme
const elements = values.elements.split(',').map(s => s.trim()).filter(Boolean)
const effortIconFlag = values['effort-icon'] ?? ''
const install = values.install
const restoreDefault = values['restore-default']

// Validation
if (!THEME_NAMES.includes(themeName)) {
  console.error(`Unknown theme: ${themeName}. Available: ${THEME_NAMES.join(', ')}`)
  process.exit(1)
}

const unknownElements = elements.filter(e => !COLUMN_IDS.includes(e))
if (unknownElements.length > 0) {
  console.error(`Unknown element(s): ${unknownElements.join(', ')}. Available: ${COLUMN_IDS.join(', ')}`)
  process.exit(1)
}

// ── Self-documenting output ───────────────────────────────────────────────

function printHelp() {
  console.log(`Generate and install a custom Claude Code status line script.

Usage:
  bun generate.mjs [flags]

Flags:
  --elements <list>      Columns to display (default: ${DEFAULT_ELEMENTS})
  --theme <name>         Color theme: ${THEME_NAMES.join(', ')}
  --effort-icon <preset|char>
                         Effort prefix icon preset or raw character
  --install              Write script and update ~/.claude/settings.json
  --restore-default      Remove statusLine and backup/delete script
  --help                 Show this help

Self-describing commands (use these to query capability data):
  --list-columns         List supported columns
  --list-effort-icons    List effort icon presets
  --list-presets         List AskUserQuestion column presets`)
}

function printColumns() {
  for (const c of COLUMNS) {
    const hidden = c.hidden ? ` [hidden: ${c.hidden}]` : ''
    const note = c.note ? ` (${c.note})` : ''
    console.log(`${c.id.padEnd(10)} ${c.name.padEnd(10)} ${c.desc}${hidden}${note}`)
    console.log(`           source: ${c.source}`)
  }
}

function printEffortIcons() {
  for (const [id, { glyph, desc }] of Object.entries(EFFORT_ICON_PRESETS)) {
    console.log(`${id.padEnd(8)} ${glyph.padEnd(4)} ${desc}`)
  }
}

function printPresets() {
  for (const p of COLUMN_PRESETS) {
    console.log(`${p.id.padEnd(12)} ${p.label.padEnd(26)} ${p.elements.join(',')}`)
  }
}

if (values.help)            { printHelp(); process.exit(0) }
if (values['list-columns']) { printColumns(); process.exit(0) }
if (values['list-effort-icons']) { printEffortIcons(); process.exit(0) }
if (values['list-presets']){ printPresets(); process.exit(0) }

// ── Theme resolution ──────────────────────────────────────────────────────

const theme = buildTheme(themeName)
const icons = theme.icons

function resolveEffortIcon(themeIcon) {
  if (!effortIconFlag) return themeIcon
  if (effortIconFlag === 'none') return ''
  if (EFFORT_ICON_PRESETS[effortIconFlag] !== undefined) return EFFORT_ICON_PRESETS[effortIconFlag].glyph
  return effortIconFlag  // allow a raw character
}

// ── Build shell script ────────────────────────────────────────────────────

function buildScript() {
  const lines = []
  const p = (s) => lines.push(s)

  p('#!/bin/bash')
  p(`# Claude Code status line — ${theme.name} theme`)
  p(`# Generated by custom:statusline skill`)
  p('')

  const jqPathBlock = [
    '# Ensure jq is available (Windows: WinGet/scoop installs may not be on PATH)',
    'if ! command -v jq >/dev/null 2>&1; then',
    '  for _jq_dir in \\',
    '    "/c/Users/$USERNAME/AppData/Local/Microsoft/WinGet/Links" \\',
    '    "/c/Users/$USERNAME/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe" \\',
    '    "$HOME/scoop/shims" \\',
    '  ; do',
    '    if [ -d "$_jq_dir" ] && { [ -x "$_jq_dir/jq" ] || [ -x "$_jq_dir/jq.exe" ]; }; then',
    '      export PATH="$PATH:$_jq_dir"',
    '      break',
    '    fi',
    '  done',
    '  if ! command -v jq >/dev/null 2>&1; then',
    '    echo "claude-status: jq is required but not installed." >&2',
    '    echo "  Install via: winget install jqlang.jq  OR  scoop install jq" >&2',
    '    exit 1',
    '  fi',
    'fi',
  ]
  for (const line of jqPathBlock) p(line)

  p('# Colors')
  p("readonly RST='\\033[0m'")
  const colorVars = [
    ['C_MODEL',      'model'],
    ['C_CTX_OK',     'ctx_ok'],
    ['C_CTX_WARN',   'ctx_warn'],
    ['C_CTX_LOW',    'ctx_low'],
    ['C_BAR_EMPTY',  'bar_empty'],
    ['C_PCT',        'pct'],
    ['C_DIR',        'dir'],
    ['C_GIT',        'git'],
    ['C_GIT_DIRTY',  'git_dirty'],
    ['C_VIM',        'vim'],
    ['C_WORKTREE',   'worktree'],
    ['C_STYLE',      'style'],
    ['C_COST',       'cost'],
    ['C_EFFORT_HIGH','effort_high'],
    ['C_EFFORT_MED', 'effort_med'],
    ['C_EFFORT_LOW', 'effort_low'],
    ['C_EFFORT_OFF', 'effort_off'],
    ['C_SEP',        'sep'],
  ]
  for (const [varName, key] of colorVars) {
    p(`readonly ${varName}='${theme.colors[key]}'`)
  }
  p('')
  p(`readonly SEP="${theme.separator}"`)
  p('')

  p('# Prefix icons')
  const iconVars = {
    ICON_MODEL:    iconWithSpace(icons.model),
    ICON_CONTEXT:  iconWithSpace(icons.context),
    ICON_COST:     iconWithSpace(icons.cost),
    ICON_DIR:      iconWithSpace(icons.dir),
    ICON_GIT:      iconWithSpace(icons.git),
    ICON_VIM:      iconWithSpace(icons.vim),
    ICON_WORKTREE: iconWithSpace(icons.worktree),
    ICON_STYLE:    iconWithSpace(icons.style),
    ICON_EFFORT:   iconWithSpace(resolveEffortIcon(icons.effort)),
  }
  for (const [varName, val] of Object.entries(iconVars)) {
    p(`readonly ${varName}='${shellQuote(val)}'`)
  }
  p('')

  p('# Read JSON from stdin')
  p('input=$(cat)')
  p('')

  if (elements.includes('model')) {
    p("model=$(echo \"$input\" | jq -r '.model.display_name // \"\"' | sed -E 's/ context//g; s/ *\\([^)]*\\)//g')")
  }
  if (elements.includes('context')) {
    p("ctx_used_tokens=$(echo \"$input\" | jq -r '.context_window.total_input_tokens // empty')")
    p("ctx_window_size=$(echo \"$input\" | jq -r '.context_window.context_window_size // empty')")
    p("ctx_project_dir=$(echo \"$input\" | jq -r '.workspace.project_dir // empty')")
  }
  if (elements.includes('effort')) {
    p('# Read effort level: stdin effort.level reflects the live session value;')
    p('# fall back to persisted effortLevel in user settings (older Claude Code versions)')
    p('effort=$(echo "$input" | jq -r \'.effort.level // empty\')')
    p('if [ -z "$effort" ] && [ -f "$HOME/.claude/settings.json" ]; then')
    p('  effort=$(jq -r \'.effortLevel // empty\' "$HOME/.claude/settings.json" 2>/dev/null)')
    p('fi')
  }
  if (elements.includes('dir') || elements.includes('git')) {
    p("current_dir=$(echo \"$input\" | jq -r '.workspace.current_dir // \"\"')")
  }
  if (elements.includes('vim')) {
    p("vim_mode=$(echo \"$input\" | jq -r '.vim.mode // empty')")
  }
  if (elements.includes('style')) {
    p("output_style=$(echo \"$input\" | jq -r '.output_style.name // empty')")
  }
  if (elements.includes('cost')) {
    p("cost_usd=$(echo \"$input\" | jq -r '.cost.total_cost_usd // empty')")
  }
  if (elements.includes('worktree')) {
    p("worktree_name=$(echo \"$input\" | jq -r '.worktree.name // empty')")
    p("git_worktree_name=$(echo \"$input\" | jq -r '.workspace.git_worktree // empty')")
  }
  if (elements.includes('git')) {
    p("worktree_branch=$(echo \"$input\" | jq -r '.worktree.branch // empty')")
  }
  p('')

  if (elements.includes('worktree')) {
    p('# Worktree detection (official stdin fields: worktree.name for --worktree sessions,')
    p('# workspace.git_worktree for any linked git worktree created with `git worktree add`)')
    p('is_worktree=0')
    p('if [ -n "$worktree_name" ]; then')
    p('  is_worktree=1')
    p('elif [ -n "$git_worktree_name" ]; then')
    p('  is_worktree=1')
    p('  worktree_name="$git_worktree_name"')
    p('fi')
    p('')
  }

  if (elements.includes('git')) {
    p('# Git branch (prefer worktree.branch from input, fall back to git CLI)')
    p('git_branch="$worktree_branch"')
    p('git_dirty=0')
    p('if [ -n "$current_dir" ] && git -C "$current_dir" --no-optional-locks rev-parse --git-dir > /dev/null 2>&1; then')
    p('  if [ -z "$git_branch" ]; then')
    p('    git_branch=$(git -C "$current_dir" --no-optional-locks branch --show-current 2>/dev/null)')
    p('  fi')
    p('  if [ -n "$git_branch" ]; then')
    p('    if ! git -C "$current_dir" --no-optional-locks diff --quiet 2>/dev/null || \\')
    p('       ! git -C "$current_dir" --no-optional-locks diff --cached --quiet 2>/dev/null; then')
    p('      git_dirty=1')
    p('    fi')
    p('  fi')
    p('fi')
    p('')
  }

  if (elements.includes('dir')) {
    p('# Shorten directory. In a linked worktree, resolve the main repo name via')
    p('# --git-common-dir (a worktree\'s common dir is <main-repo>/.git) so the repo')
    p('# identity stays stable across worktrees; otherwise use the current dir basename.')
    p('# --path-format=absolute (git >= 2.31) normalizes the relative ".git" printed at')
    p('# a repo root; on older git the rev-parse fails and we fall back to the basename.')
    p('short_dir=""')
    p('if [ -n "$current_dir" ]; then')
    p('  _gd=$(git -C "$current_dir" --no-optional-locks rev-parse --path-format=absolute --git-dir 2>/dev/null)')
    p('  _gcd=$(git -C "$current_dir" --no-optional-locks rev-parse --path-format=absolute --git-common-dir 2>/dev/null)')
    p('  if [ -n "$_gd" ] && [ -n "$_gcd" ] && [ "$_gd" != "$_gcd" ]; then')
    p('    short_dir=$(basename "$(dirname "$_gcd")")')
    p('  else')
    p("    short_dir=$(basename \"$current_dir\")")
    p('  fi')
    p('fi')
    p('')
  }

  if (elements.includes('context')) {
    p('# Effective context window (mirrors /context and the product precedence):')
    p('#   CLAUDE_CODE_AUTO_COMPACT_WINDOW env > autoCompactWindow in settings')
    p('#   (project local > project > user) > context_window_size, capped at context_window_size.')
    p('# The JSON used_percentage/remaining_percentage use the advertised model window (e.g.')
    p('# 1M) as denominator, NOT the auto-compact threshold, so we compute our own percentage.')
    p('ctx_window=""')
    p('case "$CLAUDE_CODE_AUTO_COMPACT_WINDOW" in')
    p("  ''|*[!0-9]*) ;;")
    p('  *) [ "$CLAUDE_CODE_AUTO_COMPACT_WINDOW" -gt 0 ] && ctx_window="$CLAUDE_CODE_AUTO_COMPACT_WINDOW" ;;')
    p('esac')
    p('if [ -z "$ctx_window" ]; then')
    p('  for f in ${ctx_project_dir:+"$ctx_project_dir/.claude/settings.local.json" "$ctx_project_dir/.claude/settings.json"} "$HOME/.claude/settings.json"; do')
    p('    [ -f "$f" ] || continue')
    p("    _v=$(jq -r '.autoCompactWindow // empty' \"$f\" 2>/dev/null)")
    p('    case "$_v" in')
    p("      ''|*[!0-9]*) ;;")
    p('      *) ctx_window="$_v"; break ;;')
    p('    esac')
    p('  done')
    p('fi')
    p('if [ -z "$ctx_window" ]; then')
    p('  ctx_window="$ctx_window_size"')
    p('elif [ -n "$ctx_window_size" ] && [ "$ctx_window" -gt "$ctx_window_size" ]; then')
    p('  ctx_window="$ctx_window_size"')
    p('fi')
    p('')
    p('# Progress bar (color scales with remaining context)')
    p('bar=""')
    p('if [ -n "$ctx_used_tokens" ] && [ -n "$ctx_window" ] && [ "$ctx_window" -gt 0 ]; then')
    p('  used=$(awk -v u="$ctx_used_tokens" -v t="$ctx_window" \'BEGIN { p = u * 100 / t; if (p > 100) p = 100; printf "%.0f", p }\')')
    p('  remaining=$((100 - used))')
    p('  filled=$((used / 10))')
    p('  empty=$((10 - filled))')
    CONTEXT_THRESHOLDS.forEach((threshold, i) => {
      const colorVar = `C_${threshold.color.toUpperCase()}`
      if (i === 0) {
        p(`  if [ "$remaining" -lt ${threshold.maxRemaining} ]; then`)
      } else if (i === CONTEXT_THRESHOLDS.length - 1) {
        p('  else')
      } else {
        p(`  elif [ "$remaining" -lt ${threshold.maxRemaining} ]; then`)
      }
      p(`    ctx_color="$${colorVar}"`)
    })
    p('  fi')
    p(`  bar="\${C_SEP}[\${RST}"`)
    p(`  for ((i=0; i<filled; i++)); do bar+="\${ctx_color}${theme.barChars[0]}\${RST}"; done`)
    p(`  for ((i=0; i<empty; i++)); do bar+="\${C_BAR_EMPTY}${theme.barChars[1]}\${RST}"; done`)
    p(`  bar+="\${C_SEP}]\${RST} \${ctx_color}\${used}%\${RST}"`)
    p('  ctx_used_k=$(awk -v v="$ctx_used_tokens" \'BEGIN { printf "%.0fk", v/1000 }\')')
    p('  ctx_total_k=$(awk -v v="$ctx_window" \'BEGIN { printf "%.0fk", v/1000 }\')')
    p(`  bar+="\${C_SEP} (\${RST}\${ctx_color}\${ctx_used_k}\${RST}\${C_SEP}/\${RST}\${ctx_color}\${ctx_total_k}\${RST}\${C_SEP})\${RST}"`)
    p('fi')
    p('')
  }

  // Build output
  p('# Assemble')
  p('parts=()')
  p('')

  if (elements.includes('model')) {
    p('if [ -n "$model" ]; then')
    p('  parts+=("${C_MODEL}${ICON_MODEL}${model}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('context')) {
    p('if [ -n "$bar" ]; then')
    p('  parts+=("${ICON_CONTEXT}${bar}")')
    p('fi')
    p('')
  }

  if (elements.includes('cost')) {
    p('if [ -n "$cost_usd" ]; then')
    p(`  cost_formatted=$(awk -v v="$cost_usd" 'BEGIN { if (v+0 >= ${COST_THRESHOLD}) printf "$%.2f", v+0 }')`)
    p('  if [ -n "$cost_formatted" ]; then')
    p('    parts+=("${C_COST}${ICON_COST}${cost_formatted}${RST}")')
    p('  fi')
    p('fi')
    p('')
  }

  if (elements.includes('effort')) {
    p('# Color effort by level (max/xhigh/high share the bold-red pressure tier)')
    p('if [ -n "$effort" ]; then')
    p('  case "$effort" in')
    for (const level of EFFORT_LEVELS) {
      const colorVar = `C_${level.color.toUpperCase()}`
      if (level.aliases.length === 0) {
        p(`    *)  effort_color="$${colorVar}" ;;`)
      } else {
        const pattern = level.aliases.flatMap(caseVariants).join('|')
        p(`    ${pattern})  effort_color="$${colorVar}" ;;`)
      }
    }
    p('  esac')
    p('  parts+=("${effort_color}${ICON_EFFORT}${effort}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('style')) {
    p('if [ -n "$output_style" ] && [ "$output_style" != "default" ]; then')
    p('  parts+=("${C_STYLE}${ICON_STYLE}${output_style}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('vim')) {
    p('if [ -n "$vim_mode" ]; then')
    p('  parts+=("${C_VIM}${ICON_VIM}${vim_mode}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('dir')) {
    p('if [ -n "$short_dir" ]; then')
    p('  parts+=("${C_DIR}${ICON_DIR}${short_dir}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('worktree')) {
    p('if [ "$is_worktree" -eq 1 ] && [ -n "$worktree_name" ]; then')
    p('  parts+=("\\033[1m${C_WORKTREE}${ICON_WORKTREE}worktree:${worktree_name}${RST}")')
    p('fi')
    p('')
  }

  if (elements.includes('git')) {
    p('if [ -n "$git_branch" ]; then')
    p('  if [ "$git_dirty" -eq 1 ]; then')
    p('    parts+=("${C_GIT_DIRTY}${ICON_GIT}${git_branch}${RST}")')
    p('  else')
    p('    parts+=("${C_GIT}${ICON_GIT}${git_branch}${RST}")')
    p('  fi')
    p('fi')
    p('')
  }

  // Join and print
  p('# Output')
  p('output=""')
  p('for i in "${!parts[@]}"; do')
  p('  if [ "$i" -gt 0 ]; then')
  p('    output+="${C_SEP}${SEP}${RST}"')
  p('  fi')
  p('  output+="${parts[$i]}"')
  p('done')
  p('')
  p('printf "%b" "$output"')

  return lines.join('\n') + '\n'
}

const script = buildScript()

// ── Restore-default mode ──────────────────────────────────────────────────

if (restoreDefault) {
  const scriptsDir = join(homedir(), '.claude', 'scripts')
  const scriptPath = join(scriptsDir, 'statusline.sh')
  const settingsPath = join(homedir(), '.claude', 'settings.json')

  const settings = loadSettings(settingsPath)

  if (!settings.statusLine) {
    console.log('已是默认状态,无需还原。')
    process.exit(0)
  }

  const backupsDir = join(homedir(), '.claude', 'backups')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupsDir, `statusline-${timestamp}.sh`)

  mkdirSync(backupsDir, { recursive: true })

  if (existsSync(scriptPath)) {
    copyFileSync(scriptPath, backupPath)
    console.log(`Backed up ${scriptPath} -> ${backupPath}`)
  } else {
    console.log(`Warning: ${scriptPath} not present on disk; nothing backed up.`)
  }

  delete settings.statusLine
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  console.log(`Removed statusLine from ${settingsPath}`)

  if (existsSync(scriptPath)) {
    unlinkSync(scriptPath)
    console.log(`Deleted ${scriptPath}`)
  }

  console.log('已还原 Claude Code 原生空白状态栏。')
  process.exit(0)
}

if (!install) {
  // Preview mode
  process.stdout.write(script)
  process.exit(0)
}

// ── Install mode ──────────────────────────────────────────────────────────

const scriptsDir = join(homedir(), '.claude', 'scripts')
const scriptPath = join(scriptsDir, 'statusline.sh')
const settingsPath = join(homedir(), '.claude', 'settings.json')

mkdirSync(scriptsDir, { recursive: true })
writeFileSync(scriptPath, script)
chmodSync(scriptPath, 0o755)
console.log(`Wrote ${scriptPath}`)

const settings = loadSettings(settingsPath)
settings.statusLine = {
  type: 'command',
  command: scriptPath,
}
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
console.log(`Updated ${settingsPath} → statusLine.command = ${scriptPath}`)
