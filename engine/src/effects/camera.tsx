// Camera effects: cursor walkthrough with zoom-follow, 3D tilt + glare, tilted stack.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type CursorKey = { frame: number; x: number; y: number; click?: boolean };

const ease = Easing.bezier(0.45, 0, 0.2, 1);

// Position at frame f along keyframes, eased between each pair.
export const cursorAt = (keys: CursorKey[], f: number) => {
  if (f <= keys[0].frame) return { x: keys[0].x, y: keys[0].y };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.frame) {
      const t = ease((f - a.frame) / Math.max(1, b.frame - a.frame));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l.x, y: l.y };
};

// Frames since the most recent click at or before f (Infinity if none).
export const sinceClick = (keys: CursorKey[], f: number) => {
  const clicks = keys.filter((k) => k.click && k.frame <= f);
  return clicks.length ? f - clicks[clicks.length - 1].frame : Infinity;
};

export const Cursor: React.FC<{ x: number; y: number; press?: number; size?: number }> = ({ x, y, press = 0, size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ position: "absolute", left: x - 4, top: y - 2, transform: `scale(${1 - press * 0.15})`, transformOrigin: "4px 2px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}
  >
    <path d="M4 2 L4 19 L8.5 14.8 L11.6 21.6 L14.4 20.4 L11.3 13.7 L17.5 13.7 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

// Wraps a scene in a camera that eases toward the cursor and punches in after each click.
// `zoom` is the punch-in scale; the camera only zooms around clicks, otherwise follows gently.
export const CursorZoom: React.FC<{
  keys: CursorKey[];
  zoom?: number;
  holdFrames?: number;
  children: React.ReactNode;
}> = ({ keys, zoom = 1.6, holdFrames = 40, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = cursorAt(keys, frame);
  // Zoom in shortly before each click, hold, ease back out.
  const clickFrames = keys.filter((k) => k.click).map((k) => k.frame);
  let z = 1;
  for (const cf of clickFrames) {
    const inP = spring({ frame: frame - (cf - 12), fps, config: { damping: 200 }, durationInFrames: 18 });
    const outP = spring({ frame: frame - (cf + holdFrames), fps, config: { damping: 200 }, durationInFrames: 22 });
    z = Math.max(z, 1 + (zoom - 1) * (inP - outP));
  }
  // Camera centre drifts toward the cursor, more when zoomed.
  const k = (z - 1) / (zoom - 1 || 1);
  const cx = width / 2 + (c.x - width / 2) * (0.15 + 0.85 * k);
  const cy = height / 2 + (c.y - height / 2) * (0.15 + 0.85 * k);
  const tx = width / 2 - cx * z;
  const ty = height / 2 - cy * z;
  const since = sinceClick(keys, frame);
  const press = since < 6 ? Math.sin((since / 6) * Math.PI) : 0;
  const ripple = since < 18 ? since / 18 : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: "0 0" }}>
        {children}
        {ripple > 0 ? (
          <div
            style={{
              position: "absolute",
              left: c.x - 40,
              top: c.y - 40,
              width: 80,
              height: 80,
              borderRadius: 40,
              border: "3px solid rgba(255,255,255,0.8)",
              transform: `scale(${0.3 + ripple})`,
              opacity: 1 - ripple,
            }}
          />
        ) : null}
        <Cursor x={c.x} y={c.y} press={press} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 3D tilt with a glare sweep that follows the tilt, frame-driven.
export const Tilt3D: React.FC<{
  from?: [number, number];
  to?: [number, number];
  durationInFrames?: number;
  perspective?: number;
  glare?: boolean;
  children: React.ReactNode;
}> = ({ from = [18, -24], to = [6, 10], durationInFrames = 90, perspective = 1400, glare = true, children }) => {
  const frame = useCurrentFrame();
  const t = Easing.inOut(Easing.cubic)(Math.min(1, frame / durationInFrames));
  const rx = from[0] + (to[0] - from[0]) * t;
  const ry = from[1] + (to[1] - from[1]) * t;
  const gx = interpolate(ry, [-30, 30], [100, 0]);
  return (
    <div style={{ perspective, display: "inline-block" }}>
      <div style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transformStyle: "preserve-3d", position: "relative" }}>
        {children}
        {glare ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              pointerEvents: "none",
              background: `linear-gradient(115deg, transparent ${gx - 25}%, rgba(255,255,255,0.16) ${gx}%, transparent ${gx + 25}%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

// Cards fanning out in 3D from a single stack.
export const TiltedStack: React.FC<{ items: React.ReactNode[]; spread?: number; delay?: number }> = ({ items, spread = 120, delay = 6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ perspective: 1800, position: "relative", width: 900, height: 560 }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: "rotateX(52deg) rotateZ(-32deg)" }}>
        {items.map((node, i) => {
          const p = spring({ frame: frame - i * delay, fps, config: { damping: 18, mass: 0.8 } });
          return (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translateZ(${p * i * spread}px)`, opacity: interpolate(p, [0, 0.2], [i === 0 ? 1 : 0, 1], { extrapolateRight: "clamp" }) }}>
              {node}
            </div>
          );
        })}
      </div>
    </div>
  );
};
