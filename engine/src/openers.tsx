// Openers: the first second or two, before the product walkthrough. Set flow.hook.style.
// Every opener shows real material only (captured screens, the brand, numbers the user
// confirmed) and frame 0 is already readable, because it is the thumbnail.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { accentOf, finalShot, fontStack, overviewOf } from "./Demo";
import type { Props, Rect, Timeline } from "./types";

export type OpenerProps = { props: Props; tl: Timeline };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

// How long each opener runs (frames at 30 fps; scaled for other rates).
export const openerLength = (props: Props, fps: number) => {
  const h = props.flow.hook ?? {};
  if (h.frames) return h.frames;
  const k = fps / 30;
  const lines = h.lines ?? [];
  switch (h.style ?? "words") {
    case "words":
      return lines.length * (h.beat ?? 16);
    case "result":
      return Math.round(54 * k);
    case "cold":
      return Math.round(40 * k);
    case "type": {
      const len = (lines[0] ?? "").length;
      return Math.round(((len - Math.ceil(len * 0.35)) * 0.65 + 22) * k); // typing + a hold
    }
    case "number":
      return Math.round(50 * k);
    case "split":
      return Math.round(60 * k);
    case "logo":
      return Math.round(30 * k);
    default:
      return lines.length * (h.beat ?? 16);
  }
};

export const openerBeat = (props: Props): string => {
  const h = props.flow.hook ?? {};
  const l = h.lines ?? [];
  switch (h.style ?? "words") {
    case "result":
      return `the finished result, readable${l[0] ? ` + "${l[0]}"` : ""}`;
    case "cold":
      return "tight on a real detail, pulling back to the app";
    case "type":
      return `"${l[0] ?? ""}" typing, partly typed on frame 0`;
    case "number":
      return `the number ${h.number?.prefix ?? ""}${h.number?.value ?? ""}${h.number?.suffix ?? ""} rolling${l[0] ? ` + "${l[0]}"` : ""}`;
    case "split":
      return "before | after, the wipe moving across";
    case "logo":
      return "logo, settling";
    default:
      return `"${l[0] ?? ""}" readable on frame 0`;
  }
};

// A captured screen placed behind a camera (centre + zoom, in capture CSS px).
const Screen: React.FC<{ props: Props; src: string; cam: { x: number; y: number; z: number }; opacity?: number }> = ({ props, src, cam, opacity = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const { cap } = props;
  const S = W / cap.viewport.w;
  const z = cam.z;
  const hw = W / 2 / z;
  const hh = H / 2 / z;
  const cx = Math.min(W - hw, Math.max(hw, cam.x * S));
  const cy = Math.min(cap.viewport.h * S - hh, Math.max(hh, cam.y * S));
  return (
    <AbsoluteFill style={{ transform: `translate(${W / 2 - cx * z}px, ${H / 2 - cy * z}px) scale(${z})`, transformOrigin: "0 0", opacity }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: W, height: cap.viewport.h * S }} />
    </AbsoluteFill>
  );
};

const Line: React.FC<{ props: Props; text?: string; at?: number; size?: number; color?: string; bottom?: number }> = ({ props, text, at = 0, size = 64, color, bottom = 0.09 }) => {
  const f = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  if (!text) return null;
  const { brand } = props;
  const s = at <= 0 ? 1 : spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 14 });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: H * bottom, display: "flex", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: size, color: color ?? accentOf(brand), transform: `translateY(${(1 - s) * 110}%)`, whiteSpace: "nowrap", textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}>{text}</div>
    </div>
  );
};

const resultRect = (props: Props): Rect => props.cap.payoff ?? props.cap.content;

// Result first: open on the finished result, then rewind into "how".
const Result: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, durationInFrames: D } = useVideoConfig();
  const { brand, cap, flow } = props;
  const r = resultRect(props);
  const k = Math.min((W * 0.84) / r.w, (H * 0.72) / r.h);
  const settle = interpolate(f, [0, 10], [1.04, 1], { ...clamp, easing: ease });
  // Rewind: the last 8 frames shrink and slide back, then the walkthrough starts.
  const rew = interpolate(f, [D - 8, D], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const lines = flow.hook?.lines ?? [];
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: r.w * k, height: r.h * k, position: "relative", overflow: "hidden", borderRadius: 14, marginTop: lines[0] ? -70 : 0, transform: `scale(${settle * (1 - rew * 0.35)}) translateX(${-rew * 30}%)`, opacity: 1 - rew, boxShadow: "0 30px 90px rgba(0,0,0,0.3)" }}>
        <Img src={staticFile(finalShot(props))} style={{ position: "absolute", left: -r.x * k, top: -r.y * k, width: cap.viewport.w * k, height: cap.viewport.h * k }} />
      </div>
      <Line props={props} text={f < D / 2 ? lines[0] : lines[1] ?? lines[0]} size={58} />
    </AbsoluteFill>
  );
};

// Cold open: tight on one real detail of the finished screen (the payoff, or hook.focus = a step
// id), pulling back to the whole app; then a hard cut to the walkthrough from the start.
const Cold: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { durationInFrames: D } = useVideoConfig();
  const { cap, flow, brand } = props;
  const focusId = flow.hook?.focus;
  const r = (focusId ? cap.steps.find((s) => s.id === focusId) : undefined)?.rect ?? cap.payoff ?? cap.steps[cap.steps.length - 1]?.rect;
  const target = r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : { x: cap.viewport.w / 2, y: cap.viewport.h / 2 };
  const ov = overviewOf(cap);
  const t = interpolate(f, [4, D], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const tightZ = Math.max(2.6, ov.z * 2.2);
  const cam = { x: target.x + (ov.x - target.x) * t, y: target.y + (ov.y - target.y) * t, z: tightZ + (ov.z - tightZ) * t };
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, overflow: "hidden" }}>
      <Screen props={props} src={finalShot(props)} cam={cam} />
      <Line props={props} text={flow.hook?.lines?.[0]} size={60} />
    </AbsoluteFill>
  );
};

// The typed question: a prompt typed out, already partly there on frame 0.
const Typed: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const { brand, flow } = props;
  const text = flow.hook?.lines?.[0] ?? "";
  const start = Math.ceil(text.length * 0.35);
  const n = Math.min(text.length, start + Math.floor(f / 0.65));
  const done = n >= text.length;
  const caret = !done || Math.floor(f / 8) % 2 === 0;
  const size = Math.min(110, (W * 0.8) / Math.max(8, text.length * 0.56));
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: fontStack(brand.fonts.body.family ?? brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: size, color: brand.colors.text, whiteSpace: "pre" }}>
        {text.slice(0, n)}
        <span style={{ display: "inline-block", width: size * 0.07, height: size * 1.05, marginLeft: size * 0.05, verticalAlign: "-0.15em", background: accentOf(brand), opacity: caret ? 1 : 0 }} />
      </div>
    </AbsoluteFill>
  );
};

// The number: a real result rolling up, readable from frame 0.
const NumberOpen: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { brand, flow } = props;
  const n = flow.hook?.number ?? { value: 0 };
  const from = n.from ?? n.value * 0.15;
  const t = interpolate(f, [0, 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const v = from + (n.value - from) * t;
  const dec = n.decimals ?? (Number.isInteger(n.value) ? 0 : 1);
  const punch = interpolate(f, [30, 33, 38], [1, 1.06, 1], clamp);
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 230, lineHeight: 1, color: accentOf(brand), fontVariantNumeric: "tabular-nums", transform: `scale(${punch})`, marginTop: flow.hook?.lines?.[0] ? -80 : 0 }}>
        {n.prefix ?? ""}
        {v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}
        {n.suffix ?? ""}
      </div>
      <Line props={props} text={flow.hook?.lines?.[0]} at={-1} size={52} color={brand.colors.text} bottom={0.2} />
    </AbsoluteFill>
  );
};

// Before / after: the starting screen and the result, a wipe crossing between them.
const Split: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { brand, flow, cap } = props;
  // The wipe moves right to left: "before" (left of the line) gives way to "after".
  const p = interpolate(f, [0, 40], [0.78, 0.22], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ov = overviewOf(cap);
  const lines = flow.hook?.lines ?? [];
  const label = (text: string | undefined, left: boolean) =>
    text ? (
      <div style={{ position: "absolute", top: H * 0.06, [left ? "left" : "right"]: W * 0.05, fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 52, color: left ? brand.colors.text : accentOf(brand), background: brand.colors.bg, padding: "6px 18px", borderRadius: 10 }}>{text}</div>
    ) : null;
  const first = cap.steps[0]?.do === "upload" ? `cap/s${cap.steps[0].shotIndex ?? 0}-0.png` : "cap/start.png";
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, overflow: "hidden" }}>
      <Screen props={props} src={finalShot(props)} cam={ov} />
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
        <Screen props={props} src={first} cam={ov} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${p * 100}% - 3px)`, width: 6, background: accentOf(brand), boxShadow: "0 0 24px rgba(0,0,0,0.35)" }} />
      {label(lines[0], true)}
      {label(lines[1], false)}
    </AbsoluteFill>
  );
};

// Logo sting: short, for brands that want one. Rarely the strongest choice on social.
const Logo: React.FC<OpenerProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { width: W } = useVideoConfig();
  const { brand } = props;
  const s = interpolate(f, [0, 14], [0.94, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center" }}>
      {brand.logo ? (
        <Img src={staticFile(brand.logo.file)} style={{ height: Math.min(200, (W * 0.42 * (brand.logo.h ?? 1)) / (brand.logo.w ?? 1) || 160), maxWidth: W * 0.55, objectFit: "contain", transform: `scale(${s})` }} />
      ) : (
        <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 140, color: brand.colors.text, transform: `scale(${s})` }}>{brand.name}</div>
      )}
    </AbsoluteFill>
  );
};

export const OPENERS: Record<string, React.FC<OpenerProps>> = {
  result: Result,
  cold: Cold,
  type: Typed,
  number: NumberOpen,
  split: Split,
  logo: Logo,
};
