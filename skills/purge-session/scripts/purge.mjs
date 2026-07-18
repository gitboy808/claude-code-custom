#!/usr/bin/env bun
/**
 * Purge all local traces of a single Claude Code session.
 */
import { parseArgs } from "util";
import { readFile, writeFile, unlink, readdir, stat, rm, mkdir, copyFile, rename } from "fs/promises";
import { existsSync } from "fs";
import { resolve, join, basename } from "path";
import { homedir } from "os";

function die(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function normalizeSessionId(sessionId) {
  const sid = sessionId.trim().toLowerCase();
  const parts = sid.split("-");
  const expected = [8, 4, 4, 4, 12];
  if (parts.length !== 5 || !parts.every((p, i) => p.length === expected[i])) {
    throw new Error(`'${sessionId}' does not look like a session ID (UUID expected)`);
  }
  try {
    BigInt(`0x${sid.replace(/-/g, "")}`);
  } catch {
    throw new Error(`'${sessionId}' does not look like a session ID (UUID expected)`);
  }
  return sid;
}

async function loadJsonFile(path) {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function claudeJsonPath(args) {
  if (args.claudeJson) return resolve(args.claudeJson);
  return resolve(homedir(), ".claude.json");
}

function projectDirPath(args) {
  if (args.projectDir) return resolve(args.projectDir);
  return resolve(process.cwd());
}

function expandTilde(path) {
  if (path === "~" || path.startsWith("~/")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

async function resolveProjectPath(claudeJson, projectDir) {
  const data = await loadJsonFile(claudeJson);
  if (!data) return null;
  const projects = data.projects || {};
  const resolved = resolve(projectDir);
  for (const pathStr of Object.keys(projects)) {
    try {
      if (resolve(expandTilde(pathStr)) === resolved) return pathStr;
    } catch {
      continue;
    }
  }
  return null;
}

async function readHistorySessions(claudeDir) {
  const historyFile = join(claudeDir, "history.jsonl");
  const sessions = {};
  if (!existsSync(historyFile)) return sessions;
  try {
    const text = await readFile(historyFile, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry;
      try {
        entry = JSON.parse(trimmed);
      } catch {
        continue;
      }
      const sid = entry.sessionId;
      if (!sid) continue;
      const ts = entry.timestamp;
      const display = entry.display || "";
      let rename = null;
      let stripped = "";
      if (typeof display === "string") {
        stripped = display.trim();
        if (stripped.startsWith("/rename")) {
          const parts = stripped.split(/\s+/);
          if (parts.length === 2) rename = parts[1].trim();
        }
      }
      const existing = sessions[sid];
      if (!existing) {
        sessions[sid] = {
          sessionId: sid,
          project: entry.project,
          firstDisplay: display,
          lastDisplay: display,
          firstTimestamp: ts,
          lastTimestamp: ts,
          lastRename: rename,
          hasExit: stripped === "/exit",
          displays: ts && display ? [[ts, display]] : [],
        };
      } else {
        if (ts && display) {
          existing.displays.push([ts, display]);
          if (existing.firstTimestamp == null || ts < existing.firstTimestamp) {
            existing.firstDisplay = display;
            existing.firstTimestamp = ts;
          }
          if (existing.lastTimestamp == null || ts > existing.lastTimestamp) {
            existing.lastDisplay = display;
            existing.lastTimestamp = ts;
          }
        }
        if (rename) existing.lastRename = rename;
        if (typeof display === "string" && display.trim() === "/exit") existing.hasExit = true;
        if (!existing.project) existing.project = entry.project;
      }
    }
  } catch {
    // ignore
  }
  return sessions;
}

async function firstUserMessageFromTranscript(transcript) {
  if (!existsSync(transcript)) return null;
  try {
    const text = await readFile(transcript, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry;
      try {
        entry = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (entry.type === "user" && entry.message?.role === "user") {
        const content = entry.message?.content || "";
        if (typeof content === "string" && content.trim()) return content.trim();
      }
      if (entry.type === "queue-operation" && entry.operation === "enqueue") {
        const content = entry.content || "";
        if (typeof content === "string" && content.trim()) return content.trim();
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function deriveDisplayName(sessionId, meta, history, transcriptPaths) {
  if (meta && meta.kind === "bg") {
    const name = meta.name;
    if (name) return name;
  }
  if (history?.lastRename) return history.lastRename;
  if (meta) {
    const name = meta.name;
    const nameSource = meta.nameSource;
    if (name && nameSource !== "derived") return name;
  }
  if (history) {
    const displays = [...(history.displays || [])];
    displays.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    let lastExitIndex = -1;
    for (let i = 0; i < displays.length; i++) {
      const [, disp] = displays[i];
      if (typeof disp === "string" && disp.trim() === "/exit") lastExitIndex = i;
    }
    const turnDisplays = displays.slice(lastExitIndex + 1);
    for (let i = turnDisplays.length - 1; i >= 0; i--) {
      const [, disp] = turnDisplays[i];
      if (typeof disp === "string" && disp.trim() && disp.trim() !== "/exit") return disp.trim();
    }
    for (let i = displays.length - 1; i >= 0; i--) {
      const [, disp] = displays[i];
      if (typeof disp === "string" && disp.trim() && disp.trim() !== "/exit") return disp.trim();
    }
  }
  for (const transcript of transcriptPaths) {
    const first = await firstUserMessageFromTranscript(transcript);
    if (first) return first;
  }
  if (meta?.name) return meta.name;
  return "(unnamed)";
}

async function readActiveSessions(claudeDir) {
  const sessions = {};
  const sessionsDir = join(claudeDir, "sessions");
  if (!existsSync(sessionsDir)) return sessions;
  const entries = await readdir(sessionsDir).catch(() => []);
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const file = join(sessionsDir, name);
    const data = await loadJsonFile(file);
    if (!data?.sessionId) continue;
    data._metaFile = file;
    sessions[data.sessionId] = data;
  }
  return sessions;
}

function lastActivityMs(meta, history) {
  const candidates = [];
  if (meta) {
    for (const key of ["updatedAt", "statusUpdatedAt", "startedAt"]) {
      const val = meta[key];
      if (val) candidates.push(val);
    }
  }
  if (history) {
    for (const key of ["lastTimestamp", "firstTimestamp"]) {
      const val = history[key];
      if (val) candidates.push(val);
    }
  }
  return candidates.length ? Math.max(...candidates) : null;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(msSinceEpoch) {
  if (msSinceEpoch == null) return null;
  const now = Date.now();
  const seconds = Math.floor((now - msSinceEpoch) / 1000);
  if (seconds < 0) return "in the future";
  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return rtf.format(-weeks, "week");
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  const years = Math.floor(days / 365);
  return rtf.format(-years, "year");
}

async function listProjectSessions(claudeDir, claudeJson, projectDir, limit = 20) {
  const projectPath = await resolveProjectPath(claudeJson, projectDir);
  const active = await readActiveSessions(claudeDir);
  const history = await readHistorySessions(claudeDir);
  const bySid = {};
  function ensureSid(sid) {
    if (!bySid[sid]) {
      bySid[sid] = { meta: active[sid], history: history[sid], transcripts: [] };
    }
    return bySid[sid];
  }
  for (const [sid, meta] of Object.entries(active)) {
    const cwdPath = meta.cwd;
    try {
      if (cwdPath && resolve(expandTilde(cwdPath)) === resolve(projectDir)) ensureSid(sid);
    } catch {
      // ignore
    }
  }
  for (const [sid, hist] of Object.entries(history)) {
    const histProject = hist.project;
    if (!histProject) continue;
    try {
      if (resolve(expandTilde(histProject)) === resolve(projectDir)) ensureSid(sid);
    } catch {
      // ignore
    }
  }
  const escapedName = "-" + projectDir.replace(/^\//, "").replace(/\//g, "-");
  const projectTranscriptsDir = join(claudeDir, "projects", escapedName);
  const candidates = [];
  if (existsSync(projectTranscriptsDir)) candidates.push(projectTranscriptsDir);
  const projectsDir = join(claudeDir, "projects");
  if (!existsSync(projectTranscriptsDir) && existsSync(projectsDir)) {
    const dirs = await readdir(projectsDir).catch(() => []);
    for (const d of dirs) candidates.push(join(projectsDir, d));
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const files = await readdir(candidate).catch(() => []);
    for (const name of files) {
      if (!name.endsWith(".jsonl")) continue;
      const sid = name.slice(0, -".jsonl".length);
      try {
        normalizeSessionId(sid);
      } catch {
        continue;
      }
      const info = ensureSid(sid);
      const transcript = join(candidate, name);
      if (!info.transcripts.includes(transcript)) info.transcripts.push(transcript);
    }
  }
  const results = [];
  for (const [sid, info] of Object.entries(bySid)) {
    const meta = info.meta;
    const hist = info.history;
    const transcripts = info.transcripts || [];
    let display = await deriveDisplayName(sid, meta, hist, transcripts);
    if (display.length > 80) display = display.slice(0, 77) + "...";
    const isActive = meta != null && meta.status !== "ended";
    const activity = lastActivityMs(meta, hist);
    results.push({
      sessionId: sid,
      displayName: display,
      active: isActive,
      lastActivityMs: activity,
      lastActivityRelative: formatRelativeTime(activity),
    });
  }
  results.sort((a, b) => (b.lastActivityMs || 0) - (a.lastActivityMs || 0));
  return {
    projectDir: projectDir,
    projectPathKey: projectPath,
    claudeDir: claudeDir,
    claudeJson: claudeJson,
    sessions: results.slice(0, limit),
  };
}

async function collectRelatedPaths(claudeDir, claudeJson, sessionId) {
  const shortId = sessionId.slice(0, 8);
  const toDelete = [];
  const toRewrite = [];
  const skipped = [];
  const projectsDir = join(claudeDir, "projects");
  if (existsSync(projectsDir)) {
    const dirs = await readdir(projectsDir).catch(() => []);
    for (const d of dirs) {
      const projectDir = join(projectsDir, d);
      const transcript = join(projectDir, `${sessionId}.jsonl`);
      if (existsSync(transcript)) toDelete.push(transcript);
      const subagentDir = join(projectDir, sessionId);
      if (existsSync(subagentDir)) toDelete.push(subagentDir);
    }
  }
  const fileHistoryDir = join(claudeDir, "file-history", sessionId);
  if (existsSync(fileHistoryDir)) toDelete.push(fileHistoryDir);
  const tasksDir = join(claudeDir, "tasks", sessionId);
  if (existsSync(tasksDir)) toDelete.push(tasksDir);
  const sessionEnvDir = join(claudeDir, "session-env", sessionId);
  if (existsSync(sessionEnvDir)) toDelete.push(sessionEnvDir);
  const jobsDir = join(claudeDir, "jobs", shortId);
  if (existsSync(jobsDir)) {
    const stateFile = join(jobsDir, "state.json");
    if (existsSync(stateFile)) {
      try {
        const data = await loadJsonFile(stateFile);
        if (data?.sessionId === sessionId || data?.resumeSessionId === sessionId) {
          toDelete.push(jobsDir);
        } else {
          skipped.push(`${jobsDir} (state.json does not match session)`);
        }
      } catch (e) {
        skipped.push(`${jobsDir} (could not verify state.json: ${e.message})`);
      }
    } else {
      skipped.push(`${jobsDir} (unverified, no state.json)`);
    }
  }
  const telemetryDir = join(claudeDir, "telemetry");
  if (existsSync(telemetryDir)) {
    const files = await readdir(telemetryDir).catch(() => []);
    for (const name of files) {
      if (name.startsWith(`1p_failed_events.${sessionId}.`) && name.endsWith(".json")) {
        toDelete.push(join(telemetryDir, name));
      }
    }
  }
  const sessionsDir = join(claudeDir, "sessions");
  if (existsSync(sessionsDir)) {
    const files = await readdir(sessionsDir).catch(() => []);
    for (const name of files) {
      if (!name.endsWith(".json")) continue;
      const file = join(sessionsDir, name);
      try {
        const data = await loadJsonFile(file);
        if (data?.sessionId === sessionId) toDelete.push(file);
      } catch {
        // ignore
      }
    }
  }
  const historyFile = join(claudeDir, "history.jsonl");
  if (existsSync(historyFile)) {
    let count = 0;
    try {
      const text = await readFile(historyFile, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          if (JSON.parse(trimmed).sessionId === sessionId) count++;
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    if (count > 0) toRewrite.push(historyFile);
  }
  if (existsSync(claudeJson)) {
    try {
      const data = await loadJsonFile(claudeJson);
      for (const project of Object.values(data?.projects || {})) {
        if (project?.lastSessionId === sessionId) {
          toRewrite.push(claudeJson);
          break;
        }
      }
    } catch {
      // ignore
    }
  }
  return [toDelete, toRewrite, skipped];
}

async function makeBackup(path, backupDir) {
  if (!existsSync(path)) return null;
  await mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const backup = join(backupDir, `${basename(path)}.${timestamp}.bak`);
  await copyFile(path, backup);
  return backup;
}

async function deletePaths(paths) {
  const deleted = [];
  const errors = [];
  for (const p of paths) {
    try {
      const s = await stat(p).catch(() => null);
      if (s?.isDirectory()) {
        await rm(p, { recursive: true, force: true });
      } else {
        await unlink(p);
      }
      deleted.push(p);
    } catch (e) {
      errors.push(`failed to delete ${p}: ${e.message}`);
    }
  }
  return [deleted, errors];
}

async function rewriteHistory(claudeDir, sessionId) {
  const historyFile = join(claudeDir, "history.jsonl");
  if (!existsSync(historyFile)) return [0, null];
  const tmp = `${historyFile}.tmp`;
  let removed = 0;
  try {
    const text = await readFile(historyFile, "utf8");
    const out = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        if (JSON.parse(trimmed).sessionId === sessionId) {
          removed++;
          continue;
        }
      } catch {
        // keep line
      }
      out.push(line);
    }
    await writeFile(tmp, out.join("\n"), "utf8");
    await rename(tmp, historyFile);
    return [removed, null];
  } catch (e) {
    try {
      await unlink(tmp);
    } catch {
      // ignore
    }
    return [0, `failed to rewrite history.jsonl: ${e.message}`];
  }
}

async function rewriteClaudeJson(claudeJson, sessionId) {
  if (!existsSync(claudeJson)) return [0, null];
  const tmp = `${claudeJson}.tmp`;
  let cleared = 0;
  try {
    const data = await loadJsonFile(claudeJson);
    for (const project of Object.values(data?.projects || {})) {
      if (project?.lastSessionId === sessionId) {
        project.lastSessionId = "";
        cleared++;
      }
    }
    await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
    await rename(tmp, claudeJson);
    return [cleared, null];
  } catch (e) {
    try {
      await unlink(tmp);
    } catch {
      // ignore
    }
    return [0, `failed to rewrite .claude.json: ${e.message}`];
  }
}

async function isSessionActive(claudeDir, sessionId) {
  const sessionsDir = join(claudeDir, "sessions");
  if (!existsSync(sessionsDir)) return false;
  const files = await readdir(sessionsDir).catch(() => []);
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    try {
      const data = await loadJsonFile(join(sessionsDir, name));
      if (data?.sessionId === sessionId && data?.status !== "ended") return true;
    } catch {
      // ignore
    }
  }
  return false;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      list: { type: "boolean" },
      "dry-run": { type: "boolean" },
      execute: { type: "boolean" },
      backup: { type: "boolean" },
      "claude-dir": { type: "string" },
      "claude-json": { type: "string" },
      "project-dir": { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  const modeCount = [values.list, values["dry-run"], values.execute].filter(Boolean).length;
  if (modeCount !== 1) {
    die("exactly one of --list, --dry-run, --execute is required");
  }

  const claudeDir = values["claude-dir"]
    ? resolve(values["claude-dir"])
    : resolve(homedir(), ".claude");
  const claudeJson = values["claude-json"]
    ? resolve(values["claude-json"])
    : claudeJsonPath(values);
  const projectDir = values["project-dir"]
    ? resolve(values["project-dir"])
    : projectDirPath(values);

  if (!existsSync(claudeDir)) {
    die(`Claude config directory does not exist: ${claudeDir}`);
  }

  if (values.list) {
    const result = await listProjectSessions(claudeDir, claudeJson, projectDir);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const sessionIdRaw = positionals[0];
  if (!sessionIdRaw) {
    die("session_id is required for --dry-run and --execute");
  }

  let sessionId;
  try {
    sessionId = normalizeSessionId(sessionIdRaw);
  } catch (e) {
    die(e.message);
  }

  const [toDelete, toRewrite, skipped] = await collectRelatedPaths(claudeDir, claudeJson, sessionId);
  const active = await isSessionActive(claudeDir, sessionId);

  if (values["dry-run"]) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          sessionId,
          claudeDir,
          claudeJson,
          active,
          toDelete,
          toRewrite,
          skipped,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (active) {
    die(`Session ${sessionId} is still active. Exit it before purging.`);
  }

  if (toDelete.length === 0 && toRewrite.length === 0) {
    console.log(
      JSON.stringify(
        {
          mode: "execute",
          sessionId,
          status: "no-op",
          message: "No local traces found for this session.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const backupDir = join(claudeDir, "backups");
  const backups = {};
  const historyFile = join(claudeDir, "history.jsonl");
  if (values.backup) {
    backups["history.jsonl"] = (await makeBackup(historyFile, backupDir)) || null;
    backups[".claude.json"] = (await makeBackup(claudeJson, backupDir)) || null;
  }

  const [deleted, errors] = await deletePaths(toDelete);

  let historyRemoved = 0;
  if (toRewrite.includes(historyFile)) {
    const [removed, err] = await rewriteHistory(claudeDir, sessionId);
    if (removed) historyRemoved = removed;
    if (err) errors.push(err);
  }

  let claudeJsonCleared = 0;
  if (toRewrite.includes(claudeJson)) {
    const [cleared, err] = await rewriteClaudeJson(claudeJson, sessionId);
    if (cleared) claudeJsonCleared = cleared;
    if (err) errors.push(err);
  }

  const result = {
    mode: "execute",
    sessionId,
    claudeDir,
    claudeJson,
    deleted,
    rewritten: {
      "history.jsonl": historyRemoved > 0 ? { removedEntries: historyRemoved } : null,
      ".claude.json": claudeJsonCleared > 0 ? { clearedLastSessionId: claudeJsonCleared } : null,
    },
    backups: values.backup ? backups : null,
    skipped,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));

  if (errors.length) process.exit(1);
}

main().catch((e) => die(e.message));
