// Example custom payoff (Polium Split): the uploaded photo is cut into the same N
// strips the app makes, the strips pull forward like books off a shelf, then slot
// into the app's real feed preview with no jump across the gaps.
//
// flow.json:
//   "payoff": { "type": "split", "frames": 20, "target": ".post", "rects": { "row": "#rowwrap" }, "hold": 88 }
// target = the card shown at the end (cropped from the final screen); rects.row = the
// strip row inside it. Strip maths match the app: equal widths, and the slivers X's
// 4 px gaps would hide are skipped (gap / (0.68 * 600) of the photo height per cut).
import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { finalShot } from "../Demo";
import type { PayoffProps } from "./index";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SplitPayoff: React.FC<PayoffProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { cap, flow, brand } = props;
  const up = cap.steps.find((s) => s.do === "upload");
  const card = cap.payoff;
  const row = cap.payoffRects?.row;
  if (!up?.file || !up.fileSize || !card || !row) return <AbsoluteFill style={{ background: brand.colors.bg }} />;
  const N = Number(flow.payoff?.frames ?? 5);
  const IMG = up.fileSize;
  const SKIP = (4 * IMG.h) / (0.68 * 600);
  const SW = (IMG.w - SKIP * (N - 1)) / N;
  const photo = staticFile(up.file);

  // Whole photo first, ~81% of the frame width.
  const k0 = Math.min((W * 0.81) / IMG.w, (H * 0.75) / IMG.h);
  const x0 = (W - IMG.w * k0) / 2;
  const y0 = (H - IMG.h * k0) / 2;
  // The card at the end, as large as fits.
  const pk = Math.min((W * 0.9) / card.w, (H * 0.94) / card.h);
  const px = (W - card.w * pk) / 2;
  const py = (H - card.h * pk) / 2;
  // Strip slots inside the real row: height = row height, 4 px CSS gaps.
  const slotH = row.h;
  const slotW = (slotH * SW) / IMG.h;
  const winR = px + (row.x - card.x + row.w) * pk;

  const cutStart = 10;
  const split = f >= cutStart + 14;
  const joinAt = cutStart + 38;
  const join = spring({ frame: f - joinAt, fps, config: { damping: 20, mass: 0.8 }, durationInFrames: 26 });
  const cardIn = interpolate(f, [joinAt, joinAt + 14], [0, 1], clamp);
  const settled = f >= joinAt + 26;
  const mid = (N - 1) / 2;
  const accent = brand.colors.accent ?? brand.colors.text;
  const vw = cap.viewport.w;
  const vh = cap.viewport.h;

  return (
    <AbsoluteFill style={{ background: brand.colors.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: px, top: py, width: card.w * pk, height: card.h * pk, overflow: "hidden", opacity: cardIn, borderRadius: 14 * pk }}>
        <Img src={staticFile(finalShot(props))} style={{ position: "absolute", left: -card.x * pk, top: -card.y * pk, width: vw * pk, height: vh * pk }} />
      </div>
      {!split ? (
        <div style={{ position: "absolute", left: x0, top: y0, width: IMG.w * k0, height: IMG.h * k0 }}>
          <Img src={photo} style={{ width: "100%", height: "100%" }} />
          {Array.from({ length: N - 1 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: ((i + 1) * SW + i * SKIP + SKIP / 2) * k0 - 2.5, top: 0, width: 5, boxShadow: `0 0 0 2px ${brand.colors.bg}d9`, background: accent, height: `${interpolate(f, [cutStart + i * 0.6, cutStart + 6 + i * 0.6], [0, 100], clamp)}%` }} />
          ))}
        </div>
      ) : settled ? null : (
        <div style={{ position: "absolute", inset: 0, perspective: 1800 }}>
          {Array.from({ length: N }, (_, i) => {
            const sx = x0 + i * (SW + SKIP) * k0;
            const pull = spring({ frame: f - (cutStart + 14) - i * 0.8, fps, config: { damping: 14, mass: 0.7 } });
            const lift = -(24 + random(`lift-${i}`) * 70);
            const depth = 60 + random(`z-${i}`) * 140;
            const turn = (i - mid) * -1.6 + (random(`r-${i}`) - 0.5) * 8;
            const spread = (i - mid) * 9;
            const tx = px + (row.x - card.x + i * (slotW + 4)) * pk;
            const ty = py + (row.y - card.y) * pk;
            const x = interpolate(join, [0, 1], [sx + spread * pull, tx]);
            const y = interpolate(join, [0, 1], [y0 + lift * pull, ty]);
            const w = interpolate(join, [0, 1], [SW * k0, slotW * pk]);
            const h = interpolate(join, [0, 1], [IMG.h * k0, slotH * pk]);
            const clipR = join > 0.02 ? Math.max(0, Math.min(w, winR - x)) : w;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateZ(${depth * pull * (1 - join)}px) rotateY(${turn * pull * (1 - join)}deg)`, clipPath: `inset(0 ${w - clipR}px 0 0)`, boxShadow: join < 0.9 ? "0 24px 50px rgba(0,0,0,0.55)" : "none" }}>
                <div style={{ width: "100%", height: "100%", backgroundImage: `url(${photo})`, backgroundSize: `${(IMG.w * w) / SW}px ${h}px`, backgroundPosition: `${(-i * (SW + SKIP) * w) / SW}px 0px` }} />
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
