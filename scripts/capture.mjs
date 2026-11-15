#!/usr/bin/env node
// Capture a real product, step by step, from the project's flow.json.
//
//   node scripts/capture.mjs <projectDir>
//
// For every step it opens the real app, does the real action and screenshots each
// state (before, after each click / chunk of typing, at rest with the mouse away),
// at high resolution so the camera can zoom without blur. It also records where
// every target sits, so the cursor in the video lands on the real button.
//
// Output: <projectDir>/cap/*.png and cap/rects.json. Re-run after any change to the
// app, the flow or the uploaded file: the video rebuilds from these.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { engineRequire, readJson } from "./lib.mjs";

const project = path.resolve(process.argv[2] || "");
const flow = readJson(path.join(project, "flow.json"), null);
if (!flow) {
  console.error("usage: node scripts/capture.mjs <projectDir>   (needs <projectDir>/flow.json)");
  process.exit(2);
}
const app = flow.app || {};
if (!app.url) {
  console.error('flow.json needs app.url (e.g. "http://localhost:3000")');
  process.exit(2);
}
const [vw, vh] = app.viewport || [1280, 720];
const outW = flow.format?.width || 1920;
const scale = app.scale || Math.min(4, Math.max(2, Math.ceil((outW * 2.2) / vw))); // room to zoom ~2.2x sharp
const capDir = path.join(project, "cap");
fs.rmSync(capDir, { recursive: true, force: true });
fs.mkdirSync(capDir, { recursive: true });

const { chromium } = engineRequire("playwright");
const browser = await chromium.launch();
const auth = path.join(project, "auth.json"); // saved by scripts/login.mjs for apps behind a login
const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale, colorScheme: app.colorScheme || "light", ...(fs.existsSync(auth) ? { storageState: auth } : {}) });
const page = await context.newPage();
await page.goto(app.url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => page.goto(app.url, { waitUntil: "load" }));
if (app.waitFor) {
  await page.locator(app.waitFor).first().waitFor({ timeout: 20000 }).catch(() => {
    throw new Error(`app.waitFor "${app.waitFor}" never became visible. It must be a visible element (hidden inputs never count). Run scripts/explore.mjs ${app.url} to see the page's visible controls.`);
  });
}
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(app.settle ?? 400);

// Track the mouse so clearing a toast does not move the cursor in the shot.
let mouse = { x: 1, y: 1 };
const moveTo = async (x, y, steps = 1) => {
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
};
const away = async () => {
  await moveTo(1, 1);
  await page.waitForTimeout(120);
};
// app.dismiss: selectors for cookie banners, toasts, popups. Clicked away before every shot.
const dismiss = async () => {
  for (const sel of app.dismiss || []) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click().catch(() => {});
      await page.waitForTimeout(250);
      await page.mouse.move(mouse.x, mouse.y);
    }
  }
};
const settle = (s) => page.waitForTimeout(s?.wait ?? 250);
const shot = async (name) => {
  await dismiss();
  await page.screenshot({ path: path.join(capDir, `${name}.png`) });
};
const box = async (sel, label) => {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(`${label}: "${sel}" is not visible on the page (missing, hidden or zero-size). Targets must be visible: for an upload, "input" can be a hidden file input but "target" must be something you can see, like the drop zone's text. Run scripts/explore.mjs to list visible controls.`);
  });
  const b = await loc.boundingBox();
  if (!b || b.y + b.height > vh || b.x + b.width > vw || b.y < 0) {
    throw new Error(`${label}: "${sel}" is outside the ${vw}×${vh} viewport. Make app.viewport taller/wider so the whole flow fits on one screen.`);
  }
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};
const imageSize = (file) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file]);
  try {
    const s = JSON.parse(r.stdout).streams[0];
    return { w: s.width, h: s.height };
  } catch {
    return null;
  }
};

await away();
await shot("start");
const steps = [];

for (const [i, s] of (flow.steps || []).entries()) {
  const label = `step ${i + 1} (${s.id || s.do})`;
  const rec = { id: s.id || `s${i}`, do: s.do, shots: 0 };
  const name = (k) => `s${i}-${k}`;

  if (s.do === "upload") {
    const file = path.resolve(project, s.file);
    if (!fs.existsSync(file)) throw new Error(`${label}: file not found: ${s.file}`);
    rec.rect = await box(s.target || s.input, label);
    rec.file = path.relative(project, file);
    rec.fileSize = imageSize(file);
    await shot(name(0));
    await page.setInputFiles(s.input, file);
    if (s.waitFor) await page.locator(s.waitFor).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(s.wait ?? 700);
    await shot(name(1));
    rec.shots = 1;
  } else if (s.do === "click") {
    rec.rect = await box(s.target, label);
    const cx = rec.rect.x + rec.rect.w / 2;
    const cy = rec.rect.y + rec.rect.h / 2;
    await moveTo(cx, cy, 4);
    await page.waitForTimeout(150);
    await shot(name(0));
    const times = s.times || 1;
    for (let k = 1; k <= times; k++) {
      await page.mouse.click(cx, cy);
      await settle(s);
      await shot(name(k));
    }
    rec.times = times;
    rec.shots = times;
  } else if (s.do === "type") {
    rec.rect = await box(s.target, label);
    await page.locator(s.target).first().click();
    await page.waitForTimeout(150);
    await shot(name(0));
    const text = String(s.text || "");
    const chunk = Math.max(1, Math.ceil(text.length / 12)); // at most 12 typing states
    let k = 0;
    for (let c = 0; c < text.length; c += chunk) {
      await page.keyboard.type(text.slice(c, c + chunk));
      await page.waitForTimeout(60);
      await shot(name(++k));
    }
    if (s.submit) {
      await page.keyboard.press("Enter");
      await settle(s);
      await shot(name(++k));
    }
    rec.text = text;
    rec.shots = k;
  } else if (s.do === "point") {
    rec.rect = await box(s.target, label);
    await moveTo(rec.rect.x + rec.rect.w / 2, rec.rect.y + rec.rect.h / 2, 4);
    await page.waitForTimeout(150);
    await shot(name(0));
    await shot(name(1));
    rec.shots = 1;
  } else {
    throw new Error(`${label}: unknown action "${s.do}" (use upload, click, type or point)`);
  }

  await away();
  await shot(name("rest"));
  steps.push(rec);
  console.log(`ok  ${label}: ${rec.shots} state(s)`);
}

const payoff = flow.payoff?.target ? await box(flow.payoff.target, "payoff") : null;
// Extra named positions a custom payoff needs (flow.payoff.rects: { name: selector }).
const payoffRects = {};
for (const [k, sel] of Object.entries(flow.payoff?.rects || {})) payoffRects[k] = await box(sel, `payoff.rects.${k}`);
const all = [...steps.map((s) => s.rect), payoff].filter(Boolean);
const pad = 28;
const content = all.length
  ? (() => {
      const x0 = Math.max(0, Math.min(...all.map((r) => r.x)) - pad);
      const y0 = Math.max(0, Math.min(...all.map((r) => r.y)) - pad);
      const x1 = Math.min(vw, Math.max(...all.map((r) => r.x + r.w)) + pad);
      const y1 = Math.min(vh, Math.max(...all.map((r) => r.y + r.h)) + pad);
      // Edges near the viewport edge snap to it, so a header is shown whole or not at all.
      const sx0 = x0 < 80 ? 0 : x0;
      const sy0 = y0 < 80 ? 0 : y0;
      const sx1 = vw - x1 < 80 ? vw : x1;
      const sy1 = vh - y1 < 80 ? vh : y1;
      return { x: sx0, y: sy0, w: sx1 - sx0, h: sy1 - sy0 };
    })()
  : { x: 0, y: 0, w: vw, h: vh };

const rects = { viewport: { w: vw, h: vh }, scale, url: app.url, capturedAt: new Date().toISOString(), steps, payoff, payoffRects, content };
fs.writeFileSync(path.join(capDir, "rects.json"), JSON.stringify(rects, null, 2));
await browser.close();
console.log(`\n${steps.length} steps captured → ${capDir}`);
