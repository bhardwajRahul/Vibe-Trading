#!/usr/bin/env node
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
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

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    console.error("Playwright is not installed. Run: npm --prefix demo install");
    throw error;
  }
}

const scenarioPath = path.resolve(root, arg("scenario", "demo/scenarios/natural_language_backtest.example.json"));
const frontendUrl = arg("frontend", process.env.VIBE_FRONTEND_URL || "http://127.0.0.1:5899/agent");
const holdSeconds = Number(arg("hold-seconds", process.env.VIBE_CAPTURE_HOLD_SECONDS || "20"));
const headed = process.argv.includes("--headed");

const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
const runId = `${stamp()}-${scenario.id || "scenario"}`;
const recordingDir = path.join(demoRoot, "recordings", runId);
const screenshotDir = path.join(demoRoot, "screenshots", runId);
const stateDir = path.join(demoRoot, "state", "captures");
mkdirSync(recordingDir, {recursive: true});
mkdirSync(screenshotDir, {recursive: true});
mkdirSync(stateDir, {recursive: true});

const {chromium} = await loadPlaywright();
const browser = await chromium.launch({headless: !headed});
const context = await browser.newContext({
  viewport: {width: 1440, height: 900},
  recordVideo: {dir: recordingDir, size: {width: 1440, height: 900}},
});
const page = await context.newPage();

const manifest = {
  run_id: runId,
  scenario: path.relative(root, scenarioPath),
  frontend_url: frontendUrl,
  prompt: scenario.prompt,
  started_at: new Date().toISOString(),
  screenshots: [],
  video_dir: path.relative(root, recordingDir),
  notes: [],
};

async function screenshot(name) {
  const file = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({path: file, fullPage: true});
  manifest.screenshots.push(path.relative(root, file));
}

try {
  await page.goto(frontendUrl, {waitUntil: "networkidle", timeout: 60_000});
  await screenshot("01-home");

  const input = page.locator("textarea").first();
  if (await input.count() === 0) {
    const agentUrl = new URL("/agent", frontendUrl).toString();
    await page.goto(agentUrl, {waitUntil: "networkidle", timeout: 60_000});
    await screenshot("01-agent");
  }
  await input.waitFor({state: "visible", timeout: 30_000});
  await input.fill(scenario.prompt);
  await screenshot("02-prompt-filled");
  await input.press("Enter");

  await page.waitForTimeout(1500);
  await screenshot("03-submitted");
  await page.waitForTimeout(Math.max(0, holdSeconds) * 1000);
  await screenshot("04-final");
} catch (error) {
  manifest.error = error instanceof Error ? error.message : String(error);
  await screenshot("error").catch(() => {});
  throw error;
} finally {
  manifest.finished_at = new Date().toISOString();
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    try {
      manifest.video = path.relative(root, await video.path());
    } catch (error) {
      manifest.notes.push(`video path unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const manifestPath = path.join(stateDir, `${runId}.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Capture manifest: ${path.relative(root, manifestPath)}`);
  if (manifest.video) {
    console.log(`Raw video: ${manifest.video}`);
  }
}
