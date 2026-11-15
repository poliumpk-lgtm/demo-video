#!/usr/bin/env node
// Demo QA. Checks that a still, a measurement or a file can prove.
//
//   node scripts/qa.mjs <projectDir> [--video out/demo.mp4] [--only frame0,seek,hex,sheet,file]
//
// Beats and cuts come from the project's own timeline, so nothing needs writing by hand.
// Optional <projectDir>/checks.json adds probes ({name, frame, x, y, hex, tol}) or
// expectations ({expect: {durationSec, audio}}).
//
// Checks
//   frame0  frame 0 is not black or blank (it is the thumbnail on X)
//   seek    each checked frame renders identically twice, and identically when
//           reached by playing the frames before it (catches hidden state / Math.random)
//   hex     the brand accent is really on screen (auto), plus any probe points in checks.json
//   sheet   contact sheet: every beat + the frame before/at/after every transition
//   file    the exported MP4: size, fps, duration, pixel format, audio vs video length
//
// Exit code 1 if any check fails. Needs ffmpeg/ffprobe on PATH (scripts/doctor.mjs checks).

import { spawnSync } from 'node:child_process';
import { ENGINE, engineRequire, fromRoot, projectProps } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [projectArg] = positional;
const compId = 'Demo';
if (!projectArg) {
  console.error('usage: node scripts/qa.mjs <projectDir> [--video out/demo.mp4] [--only frame0,seek,hex,sheet,file]');
  process.exit(2);
}

const projectDir = path.resolve(projectArg);
const concept = flag('concept', null);
const outDir = path.resolve(projectDir, flag('out', 'qa'));
const only = new Set((flag('only', 'frame0,seek,hex,sheet,file')).split(','));
const specPath = path.resolve(projectDir, 'checks.json');
const spec = fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : {};
const videoPath = flag('video', null) ? path.resolve(projectDir, flag('video')) : null;

const show = (p) => {
  const r = path.relative(process.cwd(), p);
  return r.startsWith('..') ? p : r;
};
const results = [];
const report = (check, ok, detail) => {
  results.push({ check, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.padEnd(7)} ${detail}`);
};

// ---------- pixel helpers (ffmpeg decodes PNG to raw RGB, no npm deps) ----------
function decodePng(buf) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
    input: buf,
    maxBuffer: 1 << 30,
  });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr}`);
  return r.stdout;
}

function compare(a, b) {
  // fraction of pixels where any channel differs by more than 8 levels
  let bad = 0;
  let maxDiff = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > maxDiff) maxDiff = d;
    if (d > 8) bad++;
  }
  return { badFraction: bad / (a.length / 3), maxDiff };
}

// Blank = flat (no contrast) or dark with almost nothing on it.
// White text on a near-black brand bg (mean ~0.05, std ~0.1) is a readable thumbnail, not blank.
function isBlank(mean, std) {
  return std < 0.02 || (mean < 0.03 && std < 0.06);
}

function lumaStats(raw) {
  let sum = 0;
  let sq = 0;
  const n = raw.length / 3;
  for (let i = 0; i < raw.length; i += 3) {
    const y = (0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2]) / 255;
    sum += y;
    sq += y * y;
  }
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
}

const hexToRgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const rgbToHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
function rgbToLab([r, g, b]) {
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a, b) => {
  const [x, y] = [rgbToLab(a), rgbToLab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

function regionMean(raw, width, x, y, w, h) {
  const acc = [0, 0, 0];
  let n = 0;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const i = (yy * width + xx) * 3;
      acc[0] += raw[i];
      acc[1] += raw[i + 1];
      acc[2] += raw[i + 2];
      n++;
    }
  }
  return acc.map((v) => v / n);
}

// ---------- file check (no rendering needed) ----------
function checkFile(compo) {
  if (!videoPath) return;
  if (!fs.existsSync(videoPath)) return report('file', false, `not found: ${videoPath}`);
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,duration', '-of', 'json', videoPath]);
  const streams = JSON.parse(r.stdout).streams;
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  const exp = { width: compo?.width, height: compo?.height, fps: compo?.fps, ...(spec.expect || {}) };
  const [fn, fd] = v.r_frame_rate.split('/').map(Number);
  const fps = fn / fd;
  const problems = [];
  if (exp.width && v.width !== exp.width) problems.push(`width ${v.width} ≠ ${exp.width}`);
  if (exp.height && v.height !== exp.height) problems.push(`height ${v.height} ≠ ${exp.height}`);
  if (exp.fps && Math.abs(fps - exp.fps) > 0.01) problems.push(`fps ${fps} ≠ ${exp.fps}`);
  if (v.pix_fmt !== 'yuv420p') problems.push(`pix_fmt ${v.pix_fmt} (yuv420p plays everywhere)`);
  const vd = Number(v.duration);
  if (exp.durationSec && Math.abs(vd - exp.durationSec) > 1 / fps) problems.push(`duration ${vd}s ≠ ${exp.durationSec}s`);
  if (a) {
    const ad = Number(a.duration);
    if (Math.abs(ad - vd) > 1 / fps) problems.push(`audio ${ad.toFixed(3)}s vs video ${vd.toFixed(3)}s`);
  } else if (spec.expect?.audio === true) {
    problems.push('no audio stream, but checks.json expects audio');
  }
  const first = spawnSync('ffmpeg', ['-v', 'error', '-i', videoPath, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 30 });
  const { mean, std } = lumaStats(first.stdout);
  if (isBlank(mean, std)) problems.push(`exported first frame is black/blank (luma ${mean.toFixed(3)}, std ${std.toFixed(3)})`);
  report('file', problems.length === 0, problems.length ? problems.join('; ') : `${v.width}×${v.height} ${fps}fps ${vd.toFixed(2)}s ${v.codec_name}/${v.pix_fmt}${a ? `, audio ${Number(a.duration).toFixed(2)}s` : ''}`);
}

// ---------- main ----------
const needsRender = ['frame0', 'seek', 'hex', 'sheet'].some((c) => only.has(c));
fs.mkdirSync(outDir, { recursive: true });

if (!needsRender) {
  checkFile(null);
} else {
  fromRoot();
  const { bundle } = engineRequire('@remotion/bundler');
  const { selectComposition, renderStill, renderFrames, openBrowser } = engineRequire('@remotion/renderer');

  console.log(`bundling the engine with ${show(projectDir)} …`);
  const serveUrl = await bundle({ entryPoint: path.join(ENGINE, 'src', 'index.ts'), publicDir: projectDir, onProgress: () => {} });
  const browser = await openBrowser('chrome');
  const inputProps = projectProps(projectDir, concept);
  const composition = await selectComposition({ serveUrl, id: compId, inputProps, puppeteerInstance: browser });
  const tl = composition.props._timeline;
  spec.beats = [...tl.beats, ...(spec.beats || [])];
  spec.transitions = [...tl.cuts, ...(spec.transitions || [])];
  spec.expect = { durationSec: composition.durationInFrames / composition.fps, ...(spec.expect || {}) };
  const { width, height, fps, durationInFrames } = composition;
  const last = durationInFrames - 1;
  console.log(`${compId}: ${width}×${height} @ ${fps}fps, ${durationInFrames} frames (${(durationInFrames / fps).toFixed(2)}s)\n`);

  const cache = new Map();
  const still = async (frame, { fresh = false } = {}) => {
    if (!fresh && cache.has(frame)) return cache.get(frame);
    const { buffer } = await renderStill({ composition, serveUrl, frame, output: null, imageFormat: 'png', inputProps, puppeteerInstance: browser });
    if (!fresh) cache.set(frame, buffer);
    return buffer;
  };

  const clamp = (f) => Math.max(0, Math.min(last, Math.round(f)));
  const beats = (spec.beats || []).map((b) => ({ ...b, frame: clamp(b.frame) }));
  const defaultFrames = beats.length ? beats.map((b) => b.frame) : Array.from({ length: 8 }, (_, i) => clamp((i * last) / 7));

  // frame0
  if (only.has('frame0')) {
    const { mean, std } = lumaStats(decodePng(await still(0)));
    const ok = !isBlank(mean, std);
    report('frame0', ok, ok ? `luma ${mean.toFixed(3)}, contrast ${std.toFixed(3)}` : `frame 0 is ${std < 0.02 ? 'a flat colour' : 'nearly black'} (luma ${mean.toFixed(3)}, std ${std.toFixed(3)}). It is the thumbnail: start on a lit, readable frame`);
  }

  // seek
  if (only.has('seek')) {
    const frames = (spec.seekFrames || defaultFrames.filter((f) => f > 0)).slice(0, 6);
    const run = Number(spec.seekRun || 20);
    const fails = [];
    for (const f of frames) {
      const a = decodePng(await still(f, { fresh: true }));
      const b = decodePng(await still(f, { fresh: true }));
      const twice = compare(a, b);
      let seq = null;
      await renderFrames({
        composition, serveUrl, inputProps, outputDir: null, imageFormat: 'png', concurrency: 1,
        frameRange: [Math.max(0, f - run), f], puppeteerInstance: browser,
        onStart: () => {}, onFrameUpdate: () => {},
        onFrameBuffer: (buf, frame) => { if (frame === f) seq = buf; },
      });
      const played = seq ? compare(a, decodePng(seq)) : { badFraction: 1, maxDiff: 255 };
      if (twice.badFraction > 0.001) fails.push(`f${f}: two renders differ on ${(twice.badFraction * 100).toFixed(2)}% of pixels (random without a seed?)`);
      if (played.badFraction > 0.001) fails.push(`f${f}: differs when played from f${Math.max(0, f - run)} on ${(played.badFraction * 100).toFixed(2)}% of pixels (hidden state: a value that remembers earlier frames)`);
    }
    report('seek', fails.length === 0, fails.length ? fails.join('; ') : `frames ${frames.join(', ')} identical twice and when played into`);
  }

  // hex
  if (only.has('hex')) {
    const probes = spec.probes || [];
    const fails = [];
    const lines = [];
    // Auto: the brand accent must really be on screen where the video uses it.
    const accent = inputProps.brand.colors.accent;
    if (accent) {
      const where = [tl.hook && tl.hook[1] - 4, tl.payoff && tl.payoff[0] + 40, tl.close && tl.close[1] - 10].filter((f) => f != null).map(clamp);
      let found = null;
      for (const f of where) {
        const raw = decodePng(await still(f));
        const target = hexToRgb(accent);
        for (let y = 2; y < height - 2 && !(found && found.d <= 2); y += 3) {
          for (let x = 2; x < width - 2; x += 3) {
            const got = regionMean(raw, width, x - 2, y - 2, 5, 5);
            const d = deltaE(got, target);
            if (d <= 6 && (!found || d < found.d)) found = { f, x, y, got, d };
            if (found && found.d <= 2) break;
          }
        }
        if (found) break;
      }
      if (found) lines.push(`accent ${accent.toUpperCase()} on screen at f${found.f} (${found.x},${found.y}) ΔE ${deltaE(found.got, hexToRgb(accent)).toFixed(1)}`);
      else if (where.length) fails.push(`brand accent ${accent} not found at f${where.join(', f')}: check the hook / caption / close colours`);
    }
    {
      for (const p of probes) {
        const raw = decodePng(await still(clamp(p.frame)));
        const s = p.size || 6;
        const got = regionMean(raw, width, Math.max(0, p.x - (s >> 1)), Math.max(0, p.y - (s >> 1)), s, s);
        const dE = deltaE(got, hexToRgb(p.hex));
        const tol = p.tol ?? 6;
        const line = `${p.name || 'probe'} f${p.frame} (${p.x},${p.y}): ${rgbToHex(got)} vs ${p.hex.toUpperCase()} ΔE ${dE.toFixed(1)}`;
        (dE > tol ? fails : lines).push(line);
      }
      report('hex', fails.length === 0, fails.length ? fails.join('; ') : lines.join('; ') || 'no accent colour in brand.json and no probes');
    }
  }

  // sheet
  if (only.has('sheet')) {
    const items = new Map();
    const add = (frame, label) => {
      const f = clamp(frame);
      items.set(f, items.has(f) ? `${items.get(f)} / ${label}` : label);
    };
    if (beats.length) beats.forEach((b) => add(b.frame, `${b.name}${b.mustSee ? ' — must see: ' + b.mustSee : ''}`));
    else defaultFrames.forEach((f) => add(f, 'sample'));
    (spec.transitions || []).forEach((t) => {
      add(t - 1, `cut ${t} −1`);
      add(t, `cut ${t}`);
      add(t + 1, `cut ${t} +1`);
    });
    add(0, 'frame 0 (thumbnail)');
    add(last, 'last frame');
    const sorted = [...items.entries()].sort((a, b) => a[0] - b[0]);
    const framesDir = path.join(outDir, 'frames');
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });
    for (const [i, [f]] of sorted.entries()) {
      fs.writeFileSync(path.join(framesDir, `${String(i).padStart(3, '0')}_f${String(f).padStart(5, '0')}.png`), await still(f));
    }
    const cols = Math.min(4, sorted.length);
    const rows = Math.ceil(sorted.length / cols);
    const tileW = width >= height ? 480 : 270;
    const sheetPng = path.join(outDir, 'sheet.png');
    const t = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-pattern_type', 'glob', '-i', path.join(framesDir, '*.png'), '-vf', `scale=${tileW}:-2,pad=iw+8:ih+8:4:4:white,tile=${cols}x${rows}:color=white`, '-frames:v', '1', sheetPng]);
    if (t.status !== 0) console.error(String(t.stderr));
    const html = `<!doctype html><meta charset="utf-8"><title>${compId} contact sheet</title>
<style>body{font:13px system-ui;margin:16px;background:#f4f4f4}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(${tileW}px,1fr));gap:12px}
figure{margin:0;background:#fff;padding:6px;border-radius:6px}img{width:100%;display:block}figcaption{padding-top:6px}b{font-variant-numeric:tabular-nums}</style>
<h3>${compId} · ${width}×${height} · ${fps}fps · ${durationInFrames} frames</h3><div class="g">
${sorted.map(([f, label], i) => `<figure><img src="frames/${String(i).padStart(3, '0')}_f${String(f).padStart(5, '0')}.png"><figcaption><b>f${f}</b> · ${(f / fps).toFixed(2)}s · ${label}</figcaption></figure>`).join('\n')}
</div>`;
    fs.writeFileSync(path.join(outDir, 'sheet.html'), html);
    report('sheet', true, `${sorted.length} frames → ${show(sheetPng)} (labels in sheet.html; tiles run left→right in frame order: ${sorted.map(([f]) => f).join(', ')})`);
  }

  await browser.close({ silent: true });
  if (only.has('file')) checkFile(composition);
}

fs.writeFileSync(path.join(outDir, 'qa.json'), JSON.stringify({ composition: compId, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${failed ? `${failed} check(s) failed` : 'all checks passed'} · ${show(path.join(outDir, "qa.json"))}`);
process.exit(failed ? 1 : 0);
