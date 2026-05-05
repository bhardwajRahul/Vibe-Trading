#!/usr/bin/env node
import {spawn} from "node:child_process";
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const demoRoot = path.join(root, "demo");
const publicRoot = path.join(demoRoot, "public");
const renderInputRoot = path.join(publicRoot, "render-input");

const compositions = {
  landscape: "VibePromoLandscape",
  portrait: "VibePromoPortrait",
  square: "VibePromoSquare",
};

const format = process.argv[2] || "landscape";
if (!compositions[format]) {
  console.error(`Unknown format: ${format}`);
  console.error("Use one of: landscape, portrait, square");
  process.exit(2);
}

const extraArgs = process.argv.slice(3);
const outPath = path.resolve(
  root,
  arg("out", path.join("demo", "exports", `vibe-promo-${format}.mp4`)),
);
const manifestPath = arg("manifest", "");
const explicitVideo = arg("video", "");
mkdirSync(path.dirname(outPath), {recursive: true});

const manifest = manifestPath ? readManifest(path.resolve(root, manifestPath)) : latestManifest();
const videoPath = explicitVideo || manifest?.video || "";
const rawVideoPath = videoPath ? publicVideoPath(path.resolve(root, videoPath)) : "";
const propsPath = path.join(demoRoot, "state", `remotion-props-${format}.json`);
mkdirSync(path.dirname(propsPath), {recursive: true});

const props = {
  title: arg("title", "Vibe-Trading"),
  subtitle: arg("subtitle", "Natural language to real quant research evidence"),
  label: arg("label", rawVideoPath ? "Real product footage" : "Promo shell"),
  rawVideoPath,
  highlight: arg("highlight", "Agentic research + deterministic validation"),
  format,
};
writeFileSync(propsPath, `${JSON.stringify(props, null, 2)}\n`);

const remotion = path.join(demoRoot, "node_modules", ".bin", "remotion");
const command = existsSync(remotion) ? remotion : "npx";
const commandArgs = existsSync(remotion)
  ? ["render"]
  : ["remotion", "render"];

commandArgs.push(
  "src/remotion/index.ts",
  compositions[format],
  path.relative(demoRoot, outPath),
  `--props=${path.relative(demoRoot, propsPath)}`,
  "--public-dir=public",
  "--overwrite",
);

const browserExecutable = await playwrightChromiumExecutable();
if (browserExecutable) {
  commandArgs.push(`--browser-executable=${browserExecutable}`);
}
commandArgs.push(...extraArgs);

console.log(`Rendering ${compositions[format]} -> ${path.relative(root, outPath)}`);
if (rawVideoPath) {
  console.log(`Using raw video: ${rawVideoPath}`);
} else {
  console.log("No capture video found; rendering the placeholder promo shell.");
}

const child = spawn(command, commandArgs, {
  cwd: demoRoot,
  stdio: "inherit",
  env: process.env,
});

const code = await new Promise((resolve) => child.on("close", resolve));
process.exitCode = Number(code) || 0;

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function latestManifest() {
  const dir = path.join(demoRoot, "state", "captures");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  for (const file of files) {
    const manifest = readManifest(file);
    if (manifest?.video) return manifest;
  }
  return files[0] ? readManifest(files[0]) : null;
}

function readManifest(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.warn(`Skipping invalid manifest ${path.relative(root, file)}: ${error.message}`);
    return null;
  }
}

function publicVideoPath(absPath) {
  let rel = path.relative(publicRoot, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    mkdirSync(renderInputRoot, {recursive: true});
    const destName = `${Date.now()}-${path.basename(absPath)}`;
    const dest = path.join(renderInputRoot, destName);
    copyFileSync(absPath, dest);
    rel = path.relative(publicRoot, dest);
  }
  return rel.split(path.sep).join("/");
}

async function playwrightChromiumExecutable() {
  try {
    const {chromium} = await import("playwright");
    const executablePath = chromium.executablePath();
    return existsSync(executablePath) ? executablePath : "";
  } catch {
    return "";
  }
}
