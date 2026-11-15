// The generic demo: hook -> real UI with camera + cursor -> payoff -> close.
// Everything is a pure function of the frame and the project files (brand, flow, captures).
import React, { useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Annotate } from "./effects/annotate";
import { Cursor } from "./effects/camera";
import { PAYOFFS } from "./payoffs";
import { OPENERS } from "./openers";
import { PUSH } from "./timeline";
import type { Brand, Props, Rect, Timeline } from "./types";

const ease = Easing.bezier(0.45, 0, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---------- brand ----------
export const fontStack = (family: string | null | undefined) => (family ? `"${family}", system-ui, sans-serif` : "system-ui, sans-serif");
const useBrandFonts = (brand: Brand) => {
  useState(() => {
    const files = brand.fonts.files ?? [];
    if (!files.length) return null;
    const h = delayRender("brand fonts");
    Promise.all(
      files.map((f) =>
        new FontFace(f.family, `url(${staticFile(f.file)})`, f.weight ? { weight: String(f.weight) } : undefined)
          .load()
          .then((ff) => document.fonts.add(ff))
          .catch(() => null)
      )
    ).then(() => continueRender(h));
    return h;
  });
};
export const accentOf = (b: Brand) => b.colors.accent ?? b.colors.text;

// ---------- keyframes ----------
type Key = { f: number; x: number; y: number; z?: number };
const sample = (keys: Key[], f: number) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.f) {
      const t = ease((f - a.f) / Math.max(1, b.f - a.f));
      return { f, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: (a.z ?? 1) + ((b.z ?? 1) - (a.z ?? 1)) * t };
    }
  }
  return keys[keys.length - 1];
};

// The wide shot of the app: the content box, fitted. The UI starts here.
export const overviewOf = (cap: Props["cap"]) => {
  const c = cap.content;
  return { x: c.x + c.w / 2, y: c.y + c.h / 2, z: Math.max(1, Math.min(1.6, Math.min(cap.viewport.w / c.w, cap.viewport.h / c.h))) };
};

// Camera and cursor paths, derived from where the real targets are.
const paths = ({ flow, cap }: Props, tl: Timeline) => {
  const { w: vw, h: vh } = cap.viewport;
  const overview = overviewOf(cap);
  const cam: Key[] = [{ f: tl.ui[0], ...overview }];
  const cur: Key[] = [];
  const first = flow.steps[0];
  cur.push({ f: tl.ui[0], x: first?.do === "upload" ? vw + 120 : vw * 0.62, y: first?.do === "upload" ? vh * 0.85 : vh * 0.7 });
  tl.steps.forEach((st, i) => {
    const s = flow.steps[i];
    const r = cap.steps[i].rect;
    const p = s.do === "type" ? { x: r.x + Math.min(24, r.w / 4), y: r.y + r.h / 2 } : centre(r);
    const auto = Math.max(1.5, Math.min(2.4, Math.min((vw * 0.3) / r.w, (vh * 0.3) / r.h)));
    const z = s.do === "upload" ? overview.z : s.zoom ?? auto;
    const focus = z <= overview.z + 0.01 ? overview : { x: p.x, y: p.y, z };
    cur.push({ f: st.start, x: cur[cur.length - 1].x, y: cur[cur.length - 1].y }, { f: st.arrive, ...p }, { f: st.end, ...p });
    cam.push({ ...sample(cam, st.start), f: st.start }, { f: st.arrive, ...focus });
    // Many clicks: punch in for the first third, then pull back so the change is visible.
    if (s.do === "click" && (s.times ?? 1) > 3) {
      const pull = st.actions[Math.floor(st.actions.length / 3)];
      cam.push({ f: pull, ...focus }, { f: pull + 10, ...overview }, { f: st.end, ...overview });
    } else {
      cam.push({ f: st.end, ...focus });
    }
  });
  return { cam, cur, overview };
};

// Which captured screenshot is on screen at frame f.
const screenAt = ({ flow, cap }: Props, tl: Timeline, f: number): { src: string; prev?: string; mix?: number } => {
  // Capture files are named by the step's index in flow.json (a concept may reorder steps).
  const shotOf = (k: number) => cap.steps[k].shotIndex ?? k;
  const firstShot = cap.steps.length ? shotOf(0) : 0;
  let current = firstShot > 0 ? `s${firstShot - 1}-rest` : "start";
  for (const st of tl.steps) {
    const i = shotOf(st.i);
    const s = flow.steps[st.i];
    const shots = cap.steps[st.i].shots;
    if (f < st.start) break;
    const done = st.actions.filter((a) => a <= f).length;
    if (s.do === "upload") {
      if (f < st.arrive) return { src: `s${i}-0` };
      const mix = interpolate(f, [st.arrive, st.arrive + 3], [0, 1], clamp);
      current = `s${i}-1`;
      if (f < st.end) return mix < 1 ? { src: current, prev: `s${i}-0`, mix } : { src: current };
    } else {
      const last = `s${i}-${Math.max(1, Math.min(shots, done))}`;
      if (f < st.arrive - 4) return { src: current };
      if (f < st.end) return { src: done === 0 ? `s${i}-0` : last };
      current = last;
    }
    // After the step, the mouse has moved on: the at-rest capture (no hover).
    current = `s${i}-rest`;
  }
  return { src: current };
};

// ---------- hook ----------
const Hook: React.FC<{ brand: Brand; lines: string[]; beat: number }> = ({ brand, lines, beat }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const i = Math.min(lines.length - 1, Math.floor(frame / beat));
  const local = frame - i * beat;
  const punch = i === 0 ? interpolate(local, [0, 6], [1.04, 1], clamp) : interpolate(local, [0, 3, 8], [1.16, 0.98, 1], clamp);
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(176, (width * 0.82) / (longest * 0.62)); // longest line fits ~82% width
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", color: i === lines.length - 1 ? accentOf(brand) : brand.colors.text, transform: `scale(${punch})` }}>
        {lines[i]}
      </div>
    </AbsoluteFill>
  );
};

// ---------- UI ----------
const UI: React.FC<{ props: Props; tl: Timeline }> = ({ props, tl }) => {
  const frame = useCurrentFrame() + tl.ui[0];
  const { width: W, height: H } = useVideoConfig();
  const { brand, flow, cap } = props;
  const S = W / cap.viewport.w; // capture CSS px -> video px
  const { cam, cur } = paths(props, tl);
  const c = sample(cam, frame);
  const z = c.z ?? 1;
  const hw = W / 2 / z;
  const hh = H / 2 / z;
  const cx = Math.min(W - hw, Math.max(hw, c.x * S));
  const cy = Math.min(cap.viewport.h * S - hh, Math.max(hh, c.y * S));
  const toScreen = (p: { x: number; y: number }) => ({ x: (p.x * S - cx) * z + W / 2, y: (p.y * S - cy) * z + H / 2 });
  const m = sample(cur, frame);
  const cursor = toScreen(m);
  const shown = screenAt(props, tl, frame);
  const clicks = tl.steps.flatMap((st, i) => (flow.steps[i].do === "click" ? st.actions : []));
  const lastClick = clicks.filter((a) => a <= frame).pop();
  const since = lastClick === undefined ? Infinity : frame - lastClick;
  const press = since < 4 ? Math.sin((since / 4) * Math.PI) : 0;
  const ripple = since < 12 ? since / 12 : 0;
  const accent = accentOf(brand);
  const img = (name: string, opacity = 1) => <Img key={name} src={staticFile(`cap/${name}.png`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: cap.viewport.h * S, opacity }} />;
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${W / 2 - cx * z}px, ${H / 2 - cy * z}px) scale(${z})`, transformOrigin: "0 0" }}>
        {shown.prev ? img(shown.prev, 1 - (shown.mix ?? 0)) : null}
        {img(shown.src, shown.prev ? shown.mix : 1)}
        {tl.steps.map((st, i) => {
          const s = flow.steps[i];
          if (s.do !== "point") return null;
          const r = cap.steps[i].rect;
          return (
            <div key={i} style={{ position: "absolute", left: r.x * S, top: r.y * S }}>
              <Sequence from={st.actions[0] - tl.ui[0]} layout="none">
                <Annotate type={s.note ?? "circle"} width={r.w * S} height={r.h * S} durationInFrames={18} color={accent} strokeWidth={4} seed={`note-${i}`}>
                  <span style={{ display: "inline-block", width: r.w * S, height: r.h * S }} />
                </Annotate>
              </Sequence>
            </div>
          );
        })}
      </AbsoluteFill>
      <DragFile props={props} tl={tl} frame={frame} toScreen={toScreen} cursor={m} />
      {ripple > 0 ? <div style={{ position: "absolute", left: cursor.x - 36, top: cursor.y - 36, width: 72, height: 72, borderRadius: 36, border: `3px solid ${accent}`, transform: `scale(${0.3 + ripple})`, opacity: (1 - ripple) * 0.9 }} /> : null}
      <Cursor x={cursor.x} y={cursor.y} press={press} size={40} />
    </AbsoluteFill>
  );
};

// The file being dragged in for an upload step: a card of the real file following the cursor.
const DragFile: React.FC<{ props: Props; tl: Timeline; frame: number; toScreen: (p: { x: number; y: number }) => { x: number; y: number }; cursor: { x: number; y: number } }> = ({ props, tl, frame, toScreen, cursor }) => {
  const i = props.flow.steps.findIndex((s) => s.do === "upload");
  if (i < 0) return null;
  const st = tl.steps[i];
  const capStep = props.cap.steps[i];
  if (frame < st.start || frame > st.arrive + 4 || !capStep.file) return null;
  const isImage = /\.(png|jpe?g|webp|gif|avif)$/i.test(capStep.file);
  const size = capStep.fileSize;
  const w = 340;
  const h = isImage && size ? (w * size.h) / size.w : 90;
  const p = toScreen(cursor);
  const shrink = interpolate(frame, [st.arrive - 2, st.arrive + 4], [1, 0.55], clamp);
  const op = interpolate(frame, [st.arrive, st.arrive + 4], [1, 0], clamp);
  const tilt = interpolate(frame, [st.start, st.arrive], [-6, 0], clamp);
  return (
    <div style={{ position: "absolute", left: p.x - w * 0.55, top: p.y - h * 0.7, width: w, height: h, transform: `rotate(${tilt}deg) scale(${shrink})`, opacity: op, borderRadius: 10, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.45)", outline: "2px solid rgba(255,255,255,0.15)", background: "#fff" }}>
      {isImage ? (
        <Img src={staticFile(capStep.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ font: "600 22px system-ui", color: "#222", padding: 28 }}>{capStep.file.split("/").pop()}</div>
      )}
    </div>
  );
};

// ---------- close ----------
const Close: React.FC<{ brand: Brand; line?: string; url?: string }> = ({ brand, line, url }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const a = spring({ frame: f + 5, fps, config: { damping: 200 }, durationInFrames: 16 });
  const b = spring({ frame: f - 2, fps, config: { damping: 200 }, durationInFrames: 18 });
  const drift = interpolate(f, [0, 60], [1, 1.025], { extrapolateRight: "clamp" });
  // Wide logos get ~40% of the frame width, capped in height so tall marks don't tower.
  const logoH = brand.logo ? Math.min(180, (width * 0.4 * (brand.logo.h ?? 1)) / (brand.logo.w ?? 1) || 140) : 0;
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center", transform: `scale(${drift})` }}>
      <div style={{ overflow: "hidden", padding: 8 }}>
        <div style={{ transform: `translateY(${(1 - a) * 110}%)` }}>
          {brand.logo ? (
            <Img src={staticFile(brand.logo.file)} style={{ height: logoH, maxWidth: width * 0.5, objectFit: "contain" }} />
          ) : (
            <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 110, color: brand.colors.text }}>{brand.name}</div>
          )}
        </div>
      </div>
      {line ? (
        <div style={{ overflow: "hidden", marginTop: 34 }}>
          <div style={{ fontFamily: fontStack(brand.fonts.body.family ?? brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 44, color: brand.colors.text, transform: `translateY(${(1 - b) * 110}%)`, whiteSpace: "nowrap" }}>{line}</div>
        </div>
      ) : null}
      {url ? (
        <div style={{ marginTop: 22, fontFamily: fontStack(brand.fonts.body.family), fontSize: 30, color: accentOf(brand), opacity: interpolate(f, [8, 18], [0, 1], clamp) }}>{url}</div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- assembly ----------
export const Demo: React.FC<Props> = (props) => {
  useBrandFonts(props.brand);
  const tl = props._timeline!;
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const { brand, flow } = props;
  const push = tl.payoff ? Easing.bezier(0.7, 0, 0.2, 1)(interpolate(f, [tl.payoff[0], tl.payoff[0] + PUSH], [0, 1], clamp)) : 0;
  const Payoff = tl.payoff ? PAYOFFS[flow.payoff?.type ?? "spotlight"] ?? PAYOFFS.spotlight : null;
  return (
    <AbsoluteFill style={{ background: brand.colors.bg }}>
      {tl.hook ? (
        <Sequence durationInFrames={tl.hook[1]}>
          {(() => {
            const style = flow.hook?.style ?? "words";
            const O = OPENERS[style];
            return style === "words" || !O ? <Hook brand={brand} lines={flow.hook?.lines ?? []} beat={flow.hook?.beat ?? 16} /> : <O props={props} tl={tl} />;
          })()}
        </Sequence>
      ) : null}
      <Sequence from={tl.ui[0]} durationInFrames={tl.ui[1] - tl.ui[0]}>
        <AbsoluteFill style={{ transform: `translateX(${-push * W}px)` }}>
          <UI props={props} tl={tl} />
        </AbsoluteFill>
      </Sequence>
      {tl.payoff && Payoff ? (
        <Sequence from={tl.payoff[0]} durationInFrames={tl.payoff[1] - tl.payoff[0]}>
          <AbsoluteFill style={{ transform: `translateX(${(1 - push) * W}px)` }}>
            <Payoff props={props} tl={tl} />
          </AbsoluteFill>
        </Sequence>
      ) : null}
      {tl.close ? (
        <Sequence from={tl.close[0]} durationInFrames={tl.close[1] - tl.close[0]}>
          <Close brand={brand} line={flow.close?.line} url={flow.close?.url} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

// The final captured screen (last step, mouse at rest).
export const finalShot = (props: Props) => {
  const last = props.cap.steps.length - 1;
  return `cap/s${props.cap.steps[last]?.shotIndex ?? last}-rest.png`;
};
