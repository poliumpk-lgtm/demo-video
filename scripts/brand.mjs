#!/usr/bin/env node
// Derive a brand kit from a live website. Facts only: what the site actually renders.
//
//   node scripts/brand.mjs <url> <projectDir>
//
// Writes into <projectDir>:
//   brand.json          colours, fonts, logo, name, voice lines (edit freely, it is the source of truth)
//   brand/logo.(svg|png) and brand/fonts/*  (files the site itself serves)
//   brand/site.png      what the page looked like when read
//   brand-card.png      one image to show the user: "is this you?"
//   DESIGN.md           draft written from brand.json, only if the project has none
//
// Nothing here is guessed: every value is read from the page. If something is
// missing (no logo found, font not downloadable), brand.json says so in "gaps".

import fs from "node:fs";
import path from "node:path";
import { engineRequire } from "./lib.mjs";

const [url, projectArg] = process.argv.slice(2);
if (!url || !projectArg) {
  console.error("usage: node scripts/brand.mjs <url> <projectDir>");
  process.exit(2);
}
const project = path.resolve(projectArg);
const brandDir = path.join(project, "brand");
fs.mkdirSync(path.join(brandDir, "fonts"), { recursive: true });

const { chromium } = engineRequire("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// Remember font files the page downloads.
const fontResponses = new Map();
page.on("response", async (res) => {
  const u = res.url();
  if (/\.(woff2?|otf|ttf)(\?|$)/i.test(u) || (res.headers()["content-type"] || "").includes("font")) {
    try {
      fontResponses.set(u, await res.body());
    } catch {}
  }
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => page.goto(url, { waitUntil: "load" }));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(brandDir, "site.png") });

const read = await page.evaluate(() => {
  const toHex = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
    if (Number(a) < 0.5) return null;
    return "#" + [r, g, b].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.1;
  };
  const area = (el) => {
    const r = el.getBoundingClientRect();
    return Math.min(r.width, 1440) * Math.min(r.height, 900);
  };

  // Background: body, else the largest top-level section.
  const bodyBg = toHex(getComputedStyle(document.body).backgroundColor) || toHex(getComputedStyle(document.documentElement).backgroundColor) || "#FFFFFF";

  // Weighted colour census: backgrounds by area, text by character count.
  const bgCount = {};
  const textCount = {};
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const bg = toHex(s.backgroundColor);
    if (bg) bgCount[bg] = (bgCount[bg] || 0) + area(el);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (own) {
      const c = toHex(s.color);
      if (c) textCount[c] = (textCount[c] || 0) + own.length;
    }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  // Accent: the most-used background on buttons / CTAs / links that is not the page bg or text.
  const accentCount = {};
  for (const el of document.querySelectorAll("button, a, [role=button], [class*=btn], [class*=button], [class*=cta]")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    for (const c of [toHex(s.backgroundColor), toHex(s.borderColor)]) if (c) accentCount[c] = (accentCount[c] || 0) + area(el);
  }

  // CSS custom properties that hold colours (design tokens).
  const tokens = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of rules) {
      if (!r.style || !/^(:root|html|body)$/.test(r.selectorText || "")) continue;
      for (const prop of r.style) {
        if (!prop.startsWith("--")) continue;
        const v = r.style.getPropertyValue(prop).trim();
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) || /^rgb/.test(v) || /^hsl/.test(v)) tokens[prop] = v;
      }
    }
  }

  // Fonts actually used by headings and body text.
  const fam = (el) => (el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null);
  const weight = (el) => (el ? getComputedStyle(el).fontWeight : null);
  // Apps often have no h1/p: fall back to the biggest visible text, and the body font.
  const texty = [...document.querySelectorAll("body *")].filter((e) => visible(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));
  const biggest = texty.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
  const h = document.querySelector("h1") || document.querySelector("h2") || biggest;
  const p = [...document.querySelectorAll("p, li")].find((e) => visible(e) && e.textContent.trim().length > 30) || document.body;
  const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => ({ family: f.family.replace(/["']/g, ""), weight: f.weight, style: f.style }));

  // Logo: header/nav image or svg whose name says logo, else the first one in the header.
  const scope = document.querySelector("header, nav, [class*=header], [class*=nav]") || document.body;
  const cands = [...scope.querySelectorAll("img, svg")].filter(visible);
  // Score candidates: named like a logo, inside the home link, big enough; icons lose.
  const home = (a) => a && (a.getAttribute("href") === "/" || a.href === location.origin + "/" || a.href === location.origin);
  const score = (e) => {
    const r = e.getBoundingClientRect();
    const words = [e.getAttribute("class"), e.getAttribute("alt"), e.getAttribute("src")?.slice(0, 200), e.getAttribute("aria-label"), e.closest("[class*=logo], [id*=logo]") ? "logo" : ""].join(" ");
    let v = 0;
    if (/logo|brand|wordmark/i.test(words)) v += 3;
    if (home(e.closest("a"))) v += 3;
    if (r.width >= 40) v += 1;
    if (r.top < 200) v += 1;
    if (/icon|lucide|chevron|arrow|menu|hamburger/i.test(words)) v -= 5;
    if (r.width < 20 || r.height < 12) v -= 5;
    return v;
  };
  const ranked = cands.map((e) => ({ e, v: score(e) })).filter((c) => c.v > 0).sort((a, b) => b.v - a.v);
  const logoEl = ranked[0]?.e;
  let logo = null;
  if (logoEl) {
    if (logoEl.tagName.toLowerCase() === "svg") {
      const clone = logoEl.cloneNode(true);
      // Inline the colour the page paints currentColor with, so the file works on its own.
      clone.setAttribute("color", getComputedStyle(logoEl).color);
      if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const r = logoEl.getBoundingClientRect();
      // Crop the viewBox to the drawn shapes so padding inside the file does not shrink the logo.
      try {
        const bb = logoEl.getBBox();
        if (bb.width > 0 && bb.height > 0) clone.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
      } catch {}
      if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      logo = { kind: "svg", svg: clone.outerHTML, w: r.width, h: r.height };
    } else {
      const r = logoEl.getBoundingClientRect();
      logo = { kind: "img", src: logoEl.currentSrc || logoEl.src, w: r.width, h: r.height };
    }
  }
  // Logos drawn with CSS (mask-image / background-image) have no file: mark the home link
  // so it can be screenshotted exactly as it renders.
  if (!logo) {
    const homeLink = [...document.querySelectorAll("header a, nav a, a")].find((a) => home(a) && visible(a) && a.getBoundingClientRect().top < 200 && a.getBoundingClientRect().width > 20);
    if (homeLink) {
      homeLink.setAttribute("data-dv-logo", "1");
      const r = homeLink.getBoundingClientRect();
      logo = { kind: "element", w: r.width, h: r.height };
    }
  }
  const icon = document.querySelector('link[rel="apple-touch-icon"]')?.href || document.querySelector('link[rel~="icon"]')?.href || null;

  const meta = (n) => document.querySelector(`meta[property="${n}"], meta[name="${n}"]`)?.content || null;
  const heads = [...document.querySelectorAll("h1, h2")].filter(visible).map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter((t) => t.length > 3 && t.length < 140 && !(t.length > 16 && !t.includes(" "))).slice(0, 5);

  return {
    name: meta("og:site_name") || document.title.split(/[|·—–-]/)[0].trim(),
    title: document.title,
    description: meta("description") || meta("og:description"),
    headlines: heads,
    bg: bodyBg,
    bgTop: top(bgCount).slice(0, 6),
    textTop: top(textCount).slice(0, 4),
    accentTop: top(accentCount).slice(0, 6),
    tokens,
    fonts: { heading: { family: fam(h), weight: weight(h) }, body: { family: fam(p), weight: weight(p) }, loaded },
    logo,
    icon,
  };
});

// ---------- pick roles from the census ----------
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const sat = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const bg = read.bgTop.find((c) => c === read.bg) || read.bg;
// Main text: of the common text colours, the one that stands out most from the background.
const text = read.textTop.slice(0, 3).filter((c) => contrast(c, bg) > 4.5).sort((a, b) => contrast(b, bg) - contrast(a, bg))[0] || (lum(bg) > 0.5 ? "#111111" : "#FFFFFF");
const pool = [...read.accentTop, ...read.bgTop, ...Object.values(read.tokens).filter((v) => v.startsWith("#") && v.length === 7).map((v) => v.toUpperCase())];
const accent = pool.find((c) => c !== bg && c !== text && sat(c) > 0.25 && contrast(c, bg) > 1.6) || null;
const muted = read.textTop.find((c) => c !== text && c !== accent && contrast(c, bg) > 2) || null;

const gaps = [];
if (!accent) gaps.push("no accent colour found: ask the user for their brand colour");

// ---------- logo ----------
// Crop an SVG's viewBox to its drawn shapes, so padding inside the file does not shrink the logo.
async function cropSvg(svg) {
  const p = await browser.newPage();
  try {
    await p.setContent(`<div id="x">${svg}</div>`);
    return await p.evaluate(() => {
      const el = document.querySelector("#x svg");
      if (!el) return null;
      const bb = el.getBBox();
      if (bb.width > 0 && bb.height > 0) {
        el.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
        el.removeAttribute("width");
        el.removeAttribute("height");
      }
      return el.outerHTML;
    }) || svg;
  } catch {
    return svg;
  } finally {
    await p.close();
  }
}
let logo = null;
if (read.logo?.kind === "svg") {
  fs.writeFileSync(path.join(brandDir, "logo.svg"), read.logo.svg);
  logo = { file: "brand/logo.svg", w: read.logo.w, h: read.logo.h };
} else if (read.logo?.kind === "element") {
  // Copy the logo onto a clean stage in the page background so nothing behind a
  // see-through header ends up in the picture.
  await page.evaluate((bgc) => {
    const src = document.querySelector("[data-dv-logo]");
    const stage = document.createElement("div");
    stage.id = "dv-logo-stage";
    Object.assign(stage.style, { position: "fixed", left: "0", top: "0", padding: "12px", background: bgc, zIndex: "2147483647", display: "inline-block", color: getComputedStyle(src).color });
    const clone = src.cloneNode(true);
    clone.style.width = src.getBoundingClientRect().width + "px";
    stage.appendChild(clone);
    document.body.appendChild(stage);
  }, bg);
  await page.mouse.move(1400, 880);
  await page.waitForTimeout(300);
  await page.locator("#dv-logo-stage").screenshot({ path: path.join(brandDir, "logo.png") });
  logo = { file: "brand/logo.png", w: read.logo.w, h: read.logo.h, from: "screenshot of the header logo" };
  gaps.push("logo is drawn with CSS on the site, so it was screenshotted (raster, on the site background): ask for an SVG for the sharpest result");
} else if (read.logo?.kind === "img" || read.icon) {
  const src = read.logo?.src || read.icon;
  try {
    let body;
    let type;
    if (src.startsWith("data:")) {
      const [head, data] = src.split(",", 2);
      type = head.slice(5).split(";")[0];
      body = head.includes(";base64") ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data));
    } else {
      const res = await page.request.get(src);
      type = res.headers()["content-type"] || "";
      body = await res.body();
    }
    const ext = type.includes("svg") ? "svg" : type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("jpeg") ? "jpg" : src.startsWith("data:") ? "png" : path.extname(new URL(src).pathname).slice(1) || "png";
    if (ext === "svg") body = Buffer.from(await cropSvg(body.toString("utf8")));
    fs.writeFileSync(path.join(brandDir, `logo.${ext}`), body);
    logo = { file: `brand/logo.${ext}`, w: read.logo?.w || null, h: read.logo?.h || null, from: read.logo ? "header" : "site icon" };
    if (!read.logo) gaps.push("no logo in the header: used the site icon, ask for a proper logo file");
  } catch {
    gaps.push("logo could not be downloaded: ask the user for a logo file (SVG best)");
  }
} else {
  gaps.push("no logo found: ask the user for a logo file (SVG best)");
}

// ---------- fonts: keep the files for the families the page uses ----------
const want = [read.fonts.heading.family, read.fonts.body.family].filter(Boolean);
const fonts = [];
for (const [u, body] of fontResponses) {
  const file = decodeURIComponent(path.basename(new URL(u).pathname));
  const match = want.find((f) => file.toLowerCase().replace(/[^a-z]/g, "").includes(f.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6)));
  if (!match) continue;
  const safe = file.replace(/[^\w.-]/g, "_");
  fs.writeFileSync(path.join(brandDir, "fonts", safe), body);
  fonts.push({ family: match, file: `brand/fonts/${safe}` });
}
for (const role of ["heading", "body"]) {
  const f = read.fonts[role].family;
  const system = /^(system-ui|-apple-system|BlinkMacSystemFont|sans-serif|serif|monospace|Arial|Helvetica|HelveticaNeue|Helvetica Neue|SF Pro|San Francisco|Segoe UI|Roboto$|Times|Georgia|Verdana)/i;
  if (f && !fonts.some((x) => x.family === f) && system.test(f)) {
    gaps.push(`${role} font "${f}" is a system font (no file on the site): it renders differently on other machines. Ask whether that is their brand font; if yes, it is fine on this machine, otherwise ask for the real font`);
  } else if (f && !fonts.some((x) => x.family === f)) {
    gaps.push(`${role} font "${f}" is not downloadable from the page (often Google Fonts CSS or a licensed font): use @remotion/google-fonts if it is a Google font, otherwise ask the user for the file`);
  }
}

const brand = {
  source: url,
  readAt: new Date().toISOString().slice(0, 10),
  name: read.name,
  colors: { bg, text, accent, muted },
  fonts: {
    heading: { family: read.fonts.heading.family, weight: Number(read.fonts.heading.weight) || 600 },
    body: { family: read.fonts.body.family, weight: Number(read.fonts.body.weight) || 400 },
    files: fonts,
  },
  logo,
  voice: { description: read.description, headlines: read.headlines },
  raw: { backgrounds: read.bgTop, text: read.textTop, buttons: read.accentTop, tokens: read.tokens },
  confirmed: false,
  gaps,
};
fs.writeFileSync(path.join(project, "brand.json"), JSON.stringify(brand, null, 2));

// ---------- brand card: one image to confirm ----------
const dataUri = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", ico: "image/x-icon", woff2: "font/woff2", woff: "font/woff", otf: "font/otf", ttf: "font/ttf" }[ext] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(path.join(project, file)).toString("base64")}`;
};
const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("${dataUri(f.file)}")}`).join("\n");
const swatch = (label, hex) => (hex ? `<div class="sw"><div class="chip" style="background:${hex}"></div><b>${label}</b><span>${hex}</span></div>` : `<div class="sw"><div class="chip miss">?</div><b>${label}</b><span>not found</span></div>`);
const logoTag = logo ? `<img src="${dataUri(logo.file)}" style="max-height:72px;max-width:420px">` : `<div class="miss" style="padding:20px">no logo found</div>`;
const card = `<!doctype html><meta charset="utf-8"><style>${fontFaces}
body{margin:0;width:1200px;font:15px system-ui;background:#F2F2F2;color:#111}
.wrap{padding:36px}.top{display:flex;align-items:center;justify-content:space-between;background:${bg};padding:32px 36px;border-radius:16px}
.row{display:flex;gap:18px;margin-top:22px}.sw{flex:1;background:#fff;border-radius:12px;padding:14px}.chip{height:70px;border-radius:8px;border:1px solid #0001;margin-bottom:10px;display:flex;align-items:center;justify-content:center}
.sw b{display:block}.sw span{color:#666;font-family:ui-monospace,monospace}.miss{background:repeating-linear-gradient(45deg,#eee,#eee 8px,#ddd 8px,#ddd 16px);color:#900;font-weight:700}
.type{background:${bg};color:${text};border-radius:16px;padding:30px 36px;margin-top:22px}
.h{font-family:"${brand.fonts.heading.family}";font-weight:${brand.fonts.heading.weight};font-size:54px;line-height:1.05}
.p{font-family:"${brand.fonts.body.family}";font-weight:${brand.fonts.body.weight};font-size:20px;margin-top:14px;opacity:.85}
.meta{margin-top:18px;color:#444;line-height:1.6}.gap{color:#900}</style>
<div class="wrap"><div class="top">${logoTag}${logo ? "" : `<div style="color:${text};font:600 18px system-ui;opacity:.7">${brand.name}</div>`}</div>
<div class="row">${swatch("Background", bg)}${swatch("Text", text)}${swatch("Accent", accent)}${swatch("Muted", muted)}</div>
<div class="type"><div class="h">${(read.headlines[0] || brand.name).replace(/</g, "&lt;")}</div><div class="p">${(read.description || "").replace(/</g, "&lt;")}</div>
<div class="p" style="margin-top:22px;font-size:14px;opacity:.6">Heading: ${brand.fonts.heading.family} ${brand.fonts.heading.weight} · Body: ${brand.fonts.body.family} ${brand.fonts.body.weight}</div></div>
<div class="meta"><b>Other colours on the site</b> (if the accent is wrong, say which one is yours): ${[...new Set([...read.accentTop, ...read.bgTop, ...read.textTop])].filter((c) => ![bg, text, accent].includes(c)).slice(0, 8).map((c) => `<span style="display:inline-block;vertical-align:middle;width:22px;height:22px;border-radius:5px;border:1px solid #0002;background:${c};margin:0 4px 0 10px"></span><code>${c}</code>`).join("")}</div>
<div class="meta">Read from ${url} on ${brand.readAt}.${gaps.length ? `<br><span class="gap">Missing: ${gaps.join(" · ")}</span>` : ""}</div></div>`;
const cardPage = await browser.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 });
await cardPage.setContent(card, { waitUntil: "load" });
await cardPage.evaluate(() => document.fonts.ready);
await cardPage.screenshot({ path: path.join(project, "brand-card.png"), fullPage: true });

// ---------- DESIGN.md draft (never overwrite the user's own) ----------
const designPath = path.join(project, "DESIGN.md");
if (!fs.existsSync(designPath)) {
  fs.writeFileSync(
    designPath,
    `# ${brand.name}: design notes (draft)

Read from ${url} on ${brand.readAt}. Draft until the user confirms it; then delete this line.

## Colours
- Background: ${bg}
- Text: ${text}
- Accent: ${accent ?? "not found, ask"}
- Muted: ${muted ?? "not found"}

## Type
- Headings: ${brand.fonts.heading.family}, weight ${brand.fonts.heading.weight}
- Body: ${brand.fonts.body.family}, weight ${brand.fonts.body.weight}

## Logo
${logo ? `\`${logo.file}\`` : "Not found, ask for an SVG."}

## Voice (their own words)
${read.description ? `> ${read.description}\n` : ""}${read.headlines.map((h) => `- "${h}"`).join("\n")}
`
  );
}

await browser.close();
console.log(JSON.stringify({ name: brand.name, colors: brand.colors, fonts: { heading: brand.fonts.heading.family, body: brand.fonts.body.family, files: fonts.length }, logo: logo?.file ?? null, gaps }, null, 2));
console.log(`\nbrand card → ${path.join(project, "brand-card.png")}`);
