#!/usr/bin/env node
import {spawn} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
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

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}

const scenarioPath = path.resolve(root, arg("scenario", "demo/scenarios/natural_language_backtest.example.json"));
const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
const runId = `${stamp()}-${scenario.id || "cli"}`;
const outputDir = path.join(demoRoot, "recordings", "cli");
const stateDir = path.join(demoRoot, "state", "cli");
mkdirSync(outputDir, {recursive: true});
mkdirSync(stateDir, {recursive: true});

const rawPath = path.join(outputDir, `${runId}.ansi`);
const txtPath = path.join(outputDir, `${runId}.txt`);
const manifestPath = path.join(stateDir, `${runId}.json`);

const command = process.env.VIBE_CLI_CAPTURE_COMMAND || defaultPython();
const args = process.env.VIBE_CLI_CAPTURE_COMMAND
  ? []
  : ["agent/cli.py", "-p", scenario.prompt];
const timeoutSeconds = Number(arg("timeout-seconds", process.env.VIBE_CLI_CAPTURE_TIMEOUT_SECONDS || "180"));

const env = {
  ...process.env,
  PYTHONPATH: [path.join(root, "agent"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  VIBE_DEMO_MODE: "1",
  VIBE_RECORD_MODE: "1",
};

const child = spawn(command, args, {
  cwd: root,
  env,
  shell: Boolean(process.env.VIBE_CLI_CAPTURE_COMMAND),
});

let raw = "";
let timedOut = false;
const timeout = setTimeout(() => {
  timedOut = true;
  child.kill("SIGTERM");
}, Math.max(1, timeoutSeconds) * 1000);

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  raw += chunk.toString("utf8");
});
child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  raw += chunk.toString("utf8");
});

const result = await new Promise((resolve) => {
  child.on("close", (code, signal) => resolve({code, signal}));
});
clearTimeout(timeout);
writeFileSync(rawPath, raw);
writeFileSync(txtPath, stripAnsi(raw));
writeFileSync(manifestPath, `${JSON.stringify({
  run_id: runId,
  scenario: path.relative(root, scenarioPath),
  command: process.env.VIBE_CLI_CAPTURE_COMMAND || "python agent/cli.py -p <scenario.prompt>",
  prompt: scenario.prompt,
  raw_capture: path.relative(root, rawPath),
  text_capture: path.relative(root, txtPath),
  exit_code: result.code,
  signal: result.signal,
  timed_out: timedOut,
  timeout_seconds: timeoutSeconds,
  captured_at: new Date().toISOString(),
}, null, 2)}\n`);

console.log(`CLI capture: ${path.relative(root, txtPath)}`);
console.log(`CLI manifest: ${path.relative(root, manifestPath)}`);
process.exitCode = timedOut ? 124 : Number(result.code) || 0;

function defaultPython() {
  for (const candidate of [
    path.join(root, ".venv", "bin", "python"),
    path.join(root, "agent", ".venv", "bin", "python"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return "python3";
}

function stripAnsi(text) {
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
