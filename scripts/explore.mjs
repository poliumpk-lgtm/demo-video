#!/usr/bin/env node
// Look at an app the way capture will see it: a screenshot plus a list of the
// visible controls with selectors you can paste into flow.json.
//
//   node scripts/explore.mjs <url> [--out dir] [--viewport 1280x720] [--upload file] [--click selector ...]
//
// --upload sets the page's first file input (to see the state after a drop);
// --click (repeatable) clicks selectors in order first. Writes <out>/explore.png
// and prints the controls. Uses <project>/auth.json if --auth is given.
import fs from "node:fs";
import path from "node:path";
import { engineRequire } from "./lib.mjs";

const args = process.argv.slice(2);
const url = args[0];
if (!url) {
  console.error("usage: node scripts/explore.mjs <url> [--out dir] [--viewport 1280x720] [--upload file] [--click selector]... [--auth auth.json]");
  process.exit(2);
}
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : null);
const clicks = args.flatMap((a, i) => (a === "--click" ? [args[i + 1]] : []));
const out = path.resolve(opt("out") || ".");
const [vw, vh] = (opt("viewport") || "1280x720").split("x").map(Number);
fs.mkdirSync(out, { recursive: true });

const { chromium } = engineRequire("playwright");
const browser = await chromium.launch();
const auth = opt("auth");
const page = await (await browser.newContext({ viewport: { width: vw, height: vh }, ...(auth ? { storageState: path.resolve(auth) } : {}) })).newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => page.goto(url, { waitUntil: "load" }));
await page.waitForTimeout(600);
if (opt("upload")) {
  await page.setInputFiles("input[type=file]", path.resolve(opt("upload")));
  await page.waitForTimeout(2500);
}
for (const sel of clicks) {
  await page.locator(sel).first().click();
  await page.waitForTimeout(600);
}
await page.screenshot({ path: path.join(out, "explore.png") });

const controls = await page.evaluate(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
  };
  const sel = (e) => {
    if (e.id) return `#${CSS.escape(e.id)}`;
    const t = (e.innerText || e.value || "").trim().replace(/\s+/g, " ");
    if (t && t.length < 40 && document.evaluate(`count(//*[normalize-space(text())=${JSON.stringify(t)}])`, document, null, 1, null).numberValue === 1) return `text=${t}`;
    for (const a of ["aria-label", "title", "name", "placeholder", "data-testid"]) if (e.getAttribute(a)) return `${e.tagName.toLowerCase()}[${a}=${JSON.stringify(e.getAttribute(a))}]`;
    const cls = [...e.classList].find((c) => !/^(_|css-|sc-)/.test(c) || c.length > 4);
    return cls ? `${e.tagName.toLowerCase()}.${CSS.escape(cls)}` : e.tagName.toLowerCase();
  };
  const items = [...document.querySelectorAll("button, a, input, select, textarea, label, [role=button], [contenteditable=true]")];
  return items.map((e) => {
    const r = e.getBoundingClientRect();
    return { selector: sel(e), tag: e.tagName.toLowerCase(), type: e.getAttribute("type"), text: (e.innerText || e.value || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40), visible: vis(e), box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
  });
});
await browser.close();
for (const c of controls.filter((c) => c.visible)) console.log(`${c.selector.padEnd(42)} ${c.tag}${c.type ? `[${c.type}]` : ""}  "${c.text}"  @${c.box.join(",")}`);
const hiddenFiles = controls.filter((c) => !c.visible && c.type === "file");
if (hiddenFiles.length) console.log(`\nhidden file input(s): ${hiddenFiles.map((c) => c.selector).join(", ")}  → use as "input" of an upload step; pick a VISIBLE element (e.g. the drop zone's text) as "target"`);
console.log(`\nscreenshot → ${path.join(out, "explore.png")}`);
