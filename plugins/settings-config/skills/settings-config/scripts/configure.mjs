#!/usr/bin/env bun
// Configure ~/.claude/settings.json — manage 4 fields with one command.
//
// Usage:
//   bun configure.mjs                                                  # dry-run, prints summary
//   bun configure.mjs --install                                       # apply ELEMENTS defaults for all 4
//   bun configure.mjs --elements language,effortLevel --install       # subset
//   bun configure.mjs --restore-default                               # backup + delete managed keys
//
// Pattern modeled after the statusline plugin generator (elements.includes,
// delete + writeFileSync, ISO-timestamped backup, idempotent exit).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// ── CLI parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2)
function getArg(name, def) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const hasFlag = (name) => args.includes(`--${name}`)

const elements = getArg('elements', 'language,effortLevel,permissions.mode,env.traffic').split(',').map(s => s.trim())
const fullMode = hasFlag('full') || args.includes('full')
const install = hasFlag('install')
const restoreDefault = hasFlag('restore-default')

// ── Element schema ──────────────────────────────────────────────────
//   key        — CLI flag and identity (matches ELEMENTS[].key = --${key})
//   path       — JSON path inside settings.json
//   label      — human-readable name (for logs)
//   default    — value used when user passes nothing
//   apply      — coerce raw string from CLI into the JS value to write
//   choices    — optional enum list (for validation + display)
//   prompt     — for AskUserQuestion workflow; not used by the script directly
//
// Adding a new field = append one entry below + update SKILL.md field table. Nothing else.
const ELEMENTS = [
  {
    key: 'language',
    path: ['language'],
    label: '输出语言',
    default: '中文',
    apply: (v) => v.trim() || '中文',
    choices: ['中文', 'English'],
  },
  {
    key: 'effortLevel',
    path: ['effortLevel'],
    label: '推理努力度',
    default: 'xhigh',
    apply: (v) => v,
    choices: ['low', 'medium', 'high', 'xhigh', 'max'],
  },
  {
    key: 'permissions.mode',
    path: ['permissions', 'defaultMode'],
    label: '权限默认模式',
    default: 'auto',
    apply: (v) => v,
    choices: ['auto', 'acceptEdits', 'plan', 'bypassPermissions'],
  },
  {
    key: 'env.traffic',
    path: ['env', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'],
    label: '禁用非必要流量',
    default: '1',
    apply: (v) => v,
    choices: ['0', '1'],
  },
]

const ELEMENT_BY_KEY = Object.fromEntries(ELEMENTS.map((e) => [e.key, e]))

// ── JSON path helpers ───────────────────────────────────────────────
function getPath(obj, path) {
  let cur = obj
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[seg]
  }
  return cur
}

function setPath(obj, path, value) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]
    if (cur[seg] == null || typeof cur[seg] !== 'object') cur[seg] = {}
    cur = cur[seg]
  }
  cur[path[path.length - 1]] = value
}

function deletePath(obj, path) {
  if (obj == null || typeof obj !== 'object') return false
  const last = path[path.length - 1]
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]
    if (cur[seg] == null || typeof cur[seg] !== 'object') return false
    cur = cur[seg]
  }
  if (!(last in cur)) return false
  delete cur[last]
  return true
}

// ── Settings I/O ────────────────────────────────────────────────────
function readSettings(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

function writeSettings(path, settings) {
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n')
}

function backupSettings(settingsPath) {
  if (!existsSync(settingsPath)) return null
  const backupsDir = join(homedir(), '.claude', 'backups')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupsDir, `settings-${timestamp}.json`)
  mkdirSync(backupsDir, { recursive: true })
  copyFileSync(settingsPath, backupPath)
  return backupPath
}

// ── Validation ──────────────────────────────────────────────────────
function validateValue(el, raw) {
  if (!el.choices) return null
  if (el.choices.includes(raw)) return null
  return `${el.key}: "${raw}" 不在合法值 [${el.choices.join(', ')}]`
}

// ── Restore-default ─────────────────────────────────────────────────
if (restoreDefault) {
  const settingsPath = join(homedir(), '.claude', 'settings.json')
  const settings = readSettings(settingsPath)

  // Idempotent: nothing to restore when none of the managed keys are present.
  const hasAny = ELEMENTS.some((el) => getPath(settings, el.path) !== undefined)
  if (!hasAny) {
    console.log('已是默认状态,无需还原。')
    process.exit(0)
  }

  const backupPath = backupSettings(settingsPath)
  if (backupPath) console.log(`备份 ${settingsPath} -> ${backupPath}`)

  // Delete each managed key; collapse empty parent objects.
  for (const el of ELEMENTS) {
    if (deletePath(settings, el.path)) {
      console.log(`  - 删除 ${el.path.join('.')}`)
    }
  }
  if (settings.permissions && Object.keys(settings.permissions).length === 0) {
    delete settings.permissions
  }
  if (settings.env && Object.keys(settings.env).length === 0) {
    delete settings.env
  }

  writeSettings(settingsPath, settings)
  console.log(`已还原 ${settingsPath}。重启 Claude Code 生效。`)
  process.exit(0)
}

// ── Install ─────────────────────────────────────────────────────────
if (install || fullMode) {
  // --full is a synonym for --install with all ELEMENTS (and ignoring any --elements override)
  const fields = fullMode ? ELEMENTS.map((e) => e.key) : elements
  const unknown = fields.filter((k) => !ELEMENT_BY_KEY[k])
  if (unknown.length) {
    console.error(`未知字段: ${unknown.join(', ')}`)
    console.error(`可用: ${ELEMENTS.map((e) => e.key).join(', ')}`)
    process.exit(1)
  }

  // Validate every value before touching the filesystem.
  const errors = []
  const resolved = fields.map((k) => {
    const el = ELEMENT_BY_KEY[k]
    const raw = getArg(el.key, el.default)
    const err = validateValue(el, raw)
    if (err) errors.push(err)
    return [el, raw]
  })
  if (errors.length) {
    for (const e of errors) console.error(e)
    process.exit(1)
  }

  const settingsPath = join(homedir(), '.claude', 'settings.json')
  const settings = readSettings(settingsPath)

  const backupPath = backupSettings(settingsPath)
  if (backupPath) console.log(`备份 ${settingsPath} -> ${backupPath}`)

  for (const [el, raw] of resolved) {
    const value = el.apply(raw)
    setPath(settings, el.path, value)
    console.log(`  + ${el.path.join('.')} = ${JSON.stringify(value)}`)
  }

  writeSettings(settingsPath, settings)
  console.log(`已更新 ${settingsPath}`)
  console.log('重启 Claude Code 生效。')
  process.exit(0)
}

// ── Dry-run (no --install and no --restore-default) ─────────────────
console.log('预览模式 — 不会写入文件。传 --install 真正应用,或传 --restore-default 还原。')
console.log(`字段: ${elements.join(', ')}`)
for (const k of elements) {
  const el = ELEMENT_BY_KEY[k]
  if (!el) {
    console.log(`  ? ${k} (未知, 传 --install 时会报错)`)
    continue
  }
  const raw = getArg(el.key, el.default)
  const value = el.apply(raw)
  console.log(`  ${el.path.join('.')} = ${JSON.stringify(value)} (默认: ${JSON.stringify(el.default)})`)
}
