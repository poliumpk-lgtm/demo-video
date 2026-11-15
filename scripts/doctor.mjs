#!/usr/bin/env node
// One-time setup and health check. Safe to run again any time.
//
//   node scripts/doctor.mjs
//
// Checks Node and ffmpeg, installs the engine (Remotion + Playwright) and the
// browser Playwright drives. Prints the exact fix for anything it cannot do itself.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ENGINE, ROOT } from "./lib.mjs";

const ok = (m) => console.log(`ok    ${m}`);
const bad = (m) => console.log(`FIX   ${m}`);
let problems = 0;

const major = Number(process.versions.node.split(".")[0]);
if (major >= 18) ok(`node ${process.versions.node}`);
else {
  bad(`node ${process.versions.node} is too old: install Node 18+ from https://nodejs.org`);
  problems++;
}

const has = (cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0;
if (has("ffmpeg") && has("ffprobe")) ok("ffmpeg + ffprobe");
else {
  const fix = process.platform === "darwin" ? "brew install ffmpeg" : process.platform === "win32" ? "winget install Gyan.FFmpeg" : "sudo apt install ffmpeg";
  bad(`ffmpeg not found (the QA checks need it): ${fix}`);
  problems++;
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
if (!fs.existsSync(path.join(ENGINE, "node_modules", "remotion"))) {
  console.log("...   installing the engine (Remotion + Playwright), a few minutes the first time");
  const r = spawnSync(npm, ["install", "--no-audit", "--no-fund"], { cwd: ENGINE, stdio: "inherit" });
  if (r.status === 0) ok("engine installed");
  else {
    bad("npm install failed in engine/: see the log above");
    problems++;
  }
} else ok("engine installed");

if (fs.existsSync(path.join(ENGINE, "node_modules", "playwright"))) {
  const r = spawnSync(npx, ["playwright", "install", "chromium"], { cwd: ENGINE, stdio: "inherit" });
  if (r.status === 0) ok("browser for capture (Chromium)");
  else {
    bad("could not install Chromium for Playwright: run `npx playwright install chromium` inside engine/");
    problems++;
  }
}

if (fs.existsSync(path.join(ENGINE, "node_modules", "remotion"))) {
  // Run from the repo root: render.mjs and qa.mjs look for the browser there.
  const r = spawnSync(npx, ["--prefix", ENGINE, "remotion", "browser", "ensure"], { cwd: ROOT, stdio: "inherit" });
  if (r.status === 0) ok("browser for rendering (Remotion)");
  else {
    bad("could not download Remotion's browser: run `npx remotion browser ensure` inside engine/");
    problems++;
  }
}

console.log(problems ? `\n${problems} thing(s) to fix, then run this again.` : "\nReady. Next: node scripts/new.mjs demos/<name>");
process.exit(problems ? 1 : 0);
