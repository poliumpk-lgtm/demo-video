#!/usr/bin/env node
// For apps behind a login. Opens a real browser window; the user signs in themselves
// (use a test account), then closes the window. The session is saved to
// <projectDir>/auth.json and capture.mjs uses it. No password passes through chat.
//
//   node scripts/login.mjs <projectDir> [url]
import fs from "node:fs";
import path from "node:path";
import { engineRequire, readJson } from "./lib.mjs";

const project = path.resolve(process.argv[2] || "");
const flow = readJson(path.join(project, "flow.json"), {});
const url = process.argv[3] || flow.app?.url;
if (!url) {
  console.error("usage: node scripts/login.mjs <projectDir> [url]");
  process.exit(2);
}
const { chromium } = engineRequire("playwright");
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();
await page.goto(url);
console.log("Sign in in the browser window, then close the window.");
await new Promise((done) => page.on("close", done));
const out = path.join(project, "auth.json");
await context.storageState({ path: out });
await browser.close();
fs.chmodSync(out, 0o600);
console.log(`session saved → ${out} (keep it out of git: it is a login)`);
