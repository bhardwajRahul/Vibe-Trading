#!/usr/bin/env node
import {existsSync, readFileSync, statSync} from "node:fs";
import {readdir} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const demoRoot = path.join(root, "demo");

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const frontendUrl = arg("frontend", process.env.VIBE_FRONTEND_URL || "http://127.0.0.1:5899");
const backendUrl = arg("backend", process.env.VIBE_BACKEND_URL || "http://127.0.0.1:8899");
const scenarioPath = path.resolve(root, arg("scenario", "demo/scenarios/natural_language_backtest.example.json"));

const checks = [];

function pass(name, detail = "") {
  checks.push({ok: true, name, detail});
}

function fail(name, detail) {
  checks.push({ok: false, name, detail});
}

async function checkFetch(name, url, validate) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      fail(name, `${url} returned ${response.status}`);
      return;
    }
    const message = validate ? validate(text, response) : "";
    if (message) {
      fail(name, message);
    } else {
      pass(name, url);
    }
  } catch (error) {
    fail(name, `${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkScenario() {
  try {
    const raw = readFileSync(scenarioPath, "utf8");
    const scenario = JSON.parse(raw);
    const missing = ["id", "title", "flow", "prompt"].filter((key) => !scenario[key]);
    if (missing.length > 0) {
      fail("scenario schema", `missing keys: ${missing.join(", ")}`);
      return;
    }
    if (/sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=]/i.test(raw)) {
      fail("scenario secrecy", "scenario appears to contain a secret-like token");
      return;
    }
    pass("scenario schema", path.relative(root, scenarioPath));
  } catch (error) {
    fail("scenario schema", error instanceof Error ? error.message : String(error));
  }
}

async function checkGeneratedFolders() {
  const folders = ["recordings", "exports", "screenshots", "state"];
  for (const folder of folders) {
    const dir = path.join(demoRoot, folder);
    if (!existsSync(dir)) {
      fail(`demo/${folder}`, "missing folder");
      continue;
    }
    pass(`demo/${folder}`, "exists");
  }
}

async function checkLargeCommittedCandidates() {
  const scanRoots = ["fixtures", "scenarios", "storyboards"].map((folder) => path.join(demoRoot, folder));
  const large = [];
  for (const scanRoot of scanRoots) {
    if (!existsSync(scanRoot)) continue;
    const entries = await walk(scanRoot);
    for (const file of entries) {
      const size = statSync(file).size;
      if (size > 2 * 1024 * 1024) {
        large.push(`${path.relative(root, file)} (${Math.round(size / 1024)} KB)`);
      }
    }
  }
  if (large.length > 0) {
    fail("committed demo asset size", large.join(", "));
  } else {
    pass("committed demo asset size", "no committed candidate over 2 MB");
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function checkLogs() {
  const candidates = [
    process.env.VIBE_DEV_STATE_DIR ? path.join(process.env.VIBE_DEV_STATE_DIR, "logs") : "",
    path.join(root, ".vibe-record", "logs"),
    path.join(root, ".vibe-dev", "logs"),
  ].filter(Boolean);
  const logDirs = [...new Set(candidates)].filter((dir) => existsSync(dir));

  if (logDirs.length === 0) {
    pass("dev logs", "no local dev logs yet");
    return;
  }
  const offenders = [];
  for (const logDir of logDirs) {
    for (const name of ["backend.log", "frontend.log"]) {
      const file = path.join(logDir, name);
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      if (/traceback|uncaught|failed to compile|syntaxerror/i.test(text)) {
        offenders.push(path.relative(root, file));
      }
    }
  }
  if (offenders.length > 0) {
    fail("dev logs", `error markers in ${offenders.join(", ")}`);
  } else {
    pass("dev logs", "no obvious error markers");
  }
}

checkScenario();
await checkFetch("backend health", `${backendUrl}/health`, (text) => {
  try {
    const body = JSON.parse(text);
    return body.status === "healthy" ? "" : `unexpected health payload: ${text.slice(0, 120)}`;
  } catch {
    return `health did not return JSON: ${text.slice(0, 120)}`;
  }
});
await checkFetch("frontend shell", frontendUrl, (text) => {
  return /<html|<!doctype html/i.test(text) ? "" : "frontend response did not look like HTML";
});
await checkGeneratedFolders();
await checkLargeCommittedCandidates();
checkLogs();

for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  console.log(`${mark} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exit(1);
}
