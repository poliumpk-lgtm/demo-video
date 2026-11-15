#!/usr/bin/env node
// Storyboards for the concept step: every concept's beats as stills, laid out as one
// labelled board the user picks from.
//
//   node scripts/storyboard.mjs <projectDir> [A B C]   (default: every concepts/*.json)
//
// A concept is concepts/<name>.json: a partial flow merged over flow.json, plus a
// "pitch" line for the board. It can change the hook, the payoff, the close, and which
// captured steps are used and in what order ("use": ["stepId", ...]).
// Output: <projectDir>/storyboard.png (and qa/storyboard/<name>/*.png).
import fs from "node:fs";
import path from "node:path";
import { ENGINE, engineRequire, fromRoot, projectProps, readJson } from "./lib.mjs";

const args = process.argv.slice(2);
const project = path.resolve(args[0] || "");
const dir = path.join(project, "concepts");
const names = args.slice(1).length ? args.slice(1) : fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort() : [];
if (!names.length) {
  console.error("usage: node scripts/storyboard.mjs <projectDir> [A B C]   (needs <projectDir>/concepts/<name>.json)");
  process.exit(2);
}
fromRoot();
const { bundle } = engineRequire("@remotion/bundler");
const { selectComposition, renderStill, openBrowser } = engineRequire("@remotion/renderer");
const serveUrl = await bundle({ entryPoint: path.join(ENGINE, "src", "index.ts"), publicDir: project, onProgress: () => {} });
const browser = await openBrowser("chrome");

const rows = [];
for (const name of names) {
  const inputProps = projectProps(project, name);
  const composition = await selectComposition({ serveUrl, id: "Demo", inputProps, puppeteerInstance: browser });
  const tl = composition.props._timeline;
  const out = path.join(project, "qa", "storyboard", name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const frames = [];
  for (const b of tl.beats) {
    const file = path.join(out, `f${String(b.frame).padStart(4, "0")}.png`);
    await renderStill({ composition, serveUrl, frame: b.frame, output: file, inputProps, scale: 0.25, imageFormat: "png", puppeteerInstance: browser });
    frames.push({ file, beat: b });
  }
  const c = readJson(path.join(dir, `${name}.json`), {});
  rows.push({ name, pitch: c.pitch || "", seconds: (composition.durationInFrames / composition.fps).toFixed(1), frames });
  console.log(`concept ${name}: ${frames.length} beats, ${rows.at(-1).seconds}s`);
}
await browser.close({ silent: true });

const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:28px;background:#f3f3f3;font:14px system-ui;color:#111;width:max-content}
.row{background:#fff;border-radius:14px;padding:18px;margin-bottom:18px}
.head{display:flex;gap:14px;align-items:baseline;margin-bottom:12px}.tag{font:800 30px system-ui}.pitch{font-size:17px}.len{color:#777;margin-left:auto}
.strip{display:flex;gap:10px}figure{margin:0;width:240px}img{width:240px;border-radius:6px;display:block}figcaption{font-size:12px;color:#555;padding-top:5px;line-height:1.3}
</style>${rows
  .map(
    (r) => `<div class="row"><div class="head"><span class="tag">${esc(r.name)}</span><span class="pitch">${esc(r.pitch)}</span><span class="len">${r.seconds}s</span></div>
<div class="strip">${r.frames.map((f) => `<figure><img src="${uri(f.file)}"><figcaption><b>${esc(f.beat.name)}</b><br>${esc(f.beat.mustSee)}</figcaption></figure>`).join("")}</div></div>`
  )
  .join("")}`;
const { chromium } = engineRequire("playwright");
const pw = await chromium.launch();
const page = await pw.newPage({ viewport: { width: 1200, height: 800 } });
await page.setContent(html, { waitUntil: "load" });
const board = path.join(project, "storyboard.png");
await page.screenshot({ path: board, fullPage: true });
await pw.close();
console.log(`\nstoryboard → ${board}`);
