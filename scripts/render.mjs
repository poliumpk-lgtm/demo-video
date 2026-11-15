#!/usr/bin/env node
// Render a project: the video, or stills at chosen frames.
//
//   node scripts/render.mjs <projectDir>                    -> <projectDir>/out/demo.mp4
//   node scripts/render.mjs <projectDir> --stills 0,90,240  -> <projectDir>/qa/stills/f0090.png ...
//   node scripts/render.mjs <projectDir> --beats            -> stills at every beat of the timeline
//   node scripts/render.mjs <projectDir> --concept B       -> render concepts/B.json instead of the plain flow
//   options: --out out/name.mp4  --into qa/stills  --scale 0.5 (stills)  --crf 18
import fs from "node:fs";
import path from "node:path";
import { ENGINE, engineRequire, fromRoot, projectProps } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const project = path.resolve(args[0] || "");
if (!fs.existsSync(path.join(project, "flow.json"))) {
  console.error("usage: node scripts/render.mjs <projectDir> [--stills 0,90] [--beats] [--out out/demo.mp4]");
  process.exit(2);
}

const concept = flag("concept", null);
fromRoot();
const { bundle } = engineRequire("@remotion/bundler");
const { selectComposition, renderMedia, renderStill } = engineRequire("@remotion/renderer");
const inputProps = projectProps(project, concept);
const serveUrl = await bundle({ entryPoint: path.join(ENGINE, "src", "index.ts"), publicDir: project, onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: "Demo", inputProps });
const tl = composition.props._timeline;
console.log(`Demo: ${composition.width}×${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(2)}s)`);

const stillList = args.includes("--beats") ? tl.beats.map((b) => b.frame) : flag("stills", null)?.split(",").map(Number);
if (stillList) {
  const dir = path.resolve(project, flag("into", concept ? `qa/stills-${concept}` : "qa/stills"));
  if (args.includes("--beats")) fs.rmSync(dir, { recursive: true, force: true }); // a fresh set, never mixed with an older run
  fs.mkdirSync(dir, { recursive: true });
  const scale = Number(flag("scale", 1));
  for (const f of stillList) {
    const out = path.join(dir, `f${String(f).padStart(4, "0")}.png`);
    await renderStill({ composition, serveUrl, frame: Math.min(f, composition.durationInFrames - 1), output: out, inputProps, scale, imageFormat: "png" });
    const beat = tl.beats.find((b) => b.frame === f);
    console.log(`still f${f}${beat ? ` (${beat.name}: ${beat.mustSee})` : ""} → ${out}`);
  }
} else {
  const out = path.resolve(project, flag("out", concept ? `out/demo-${concept}.mp4` : "out/demo.mp4"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let last = -1;
  await renderMedia({
    composition, serveUrl, inputProps, codec: "h264", crf: Number(flag("crf", 18)), pixelFormat: "yuv420p", outputLocation: out,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) process.stdout.write(`${p * 10}% `), (last = p);
    },
  });
  console.log(`\nvideo → ${out}`);
}
