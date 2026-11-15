// Payoffs: the moment the video exists for. Register custom ones here by name and
// set flow.payoff.type to that name. Each gets the project props and the timeline,
// and starts at its own frame 0 (the push cut).
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { accentOf, finalShot, fontStack } from "../Demo";
import type { Props, Timeline } from "../types";
import { SplitPayoff } from "./split";

export type PayoffProps = { props: Props; tl: Timeline };

// Spotlight: the result region of the final real screen lifts out of the app and
// settles big and flat, so it can be read. Optional caption under it.
const Spotlight: React.FC<PayoffProps> = ({ props }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { cap, brand, flow } = props;
  const r = cap.payoff ?? cap.content;
  const caption = flow.payoff?.text;
  const room = caption ? 0.7 : 0.82;
  const k = Math.min((W * 0.86) / r.w, (H * room) / r.h);
  const w = r.w * k;
  const h = r.h * k;
  const s = spring({ frame: f - 6, fps, config: { damping: 18, mass: 0.9 } });
  const rx = interpolate(s, [0, 1], [16, 0]);
  const ry = interpolate(s, [0, 1], [-22, 0]);
  const sc = interpolate(s, [0, 1], [0.82, 1]);
  const vw = cap.viewport.w;
  const vh = cap.viewport.h;
  const capt = spring({ frame: f - 22, fps, config: { damping: 200 }, durationInFrames: 18 });
  return (
    <AbsoluteFill style={{ background: brand.colors.bg, alignItems: "center", justifyContent: "center", perspective: 1800 }}>
      <div style={{ width: w, height: h, position: "relative", overflow: "hidden", borderRadius: 14, transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`, boxShadow: `0 40px 120px rgba(0,0,0,${0.35 * (1 - s) + 0.18})`, marginTop: caption ? -60 : 0 }}>
        <Img src={staticFile(finalShot(props))} style={{ position: "absolute", left: -r.x * k, top: -r.y * k, width: vw * k, height: vh * k }} />
      </div>
      {caption ? (
        <div style={{ position: "absolute", bottom: H * 0.08, overflow: "hidden" }}>
          <div style={{ fontFamily: fontStack(brand.fonts.heading.family), fontWeight: brand.fonts.heading.weight, fontSize: 56, color: accentOf(brand), transform: `translateY(${(1 - capt) * 110}%)`, whiteSpace: "nowrap" }}>{caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const PAYOFFS: Record<string, React.FC<PayoffProps>> = {
  spotlight: Spotlight,
  split: SplitPayoff, // example of a product-specific payoff (Polium Split)
};
