// Hand-drawn annotations and self-drawing connector lines.
import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, interpolate, random, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";

const wob = (seed: string, i: number, amt: number) => (random(`${seed}-${i}`) - 0.5) * 2 * amt;

// A sketchy ellipse around a box, drawn in two loose passes.
const circlePath = (w: number, h: number, seed: string, pass: number) => {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 + 14;
  const ry = h / 2 + 12;
  const start = -0.9 + pass * 0.4;
  const pts: string[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = start + (i / n) * (Math.PI * 2 + 0.5);
    const x = cx + Math.cos(t) * (rx + wob(seed + pass, i, 5));
    const y = cy + Math.sin(t) * (ry + wob(seed + pass + "y", i, 4));
    pts.push(`${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
};

const underlinePath = (w: number, h: number, seed: string, pass: number) => {
  const y = h * 0.84 + pass * 5; // just under the glyphs, not the line box
  return `M${-4 + wob(seed, pass, 4)},${y + wob(seed, pass + 9, 2)} Q${w / 2},${y + 6 + wob(seed, pass + 3, 4)} ${w + 6 + wob(seed, pass + 5, 4)},${y - 2 + wob(seed, pass + 7, 3)}`;
};

const boxPath = (w: number, h: number, seed: string, pass: number) => {
  const p = 10;
  const j = (i: number) => wob(seed + pass, i, 4);
  return `M${-p + j(1)},${-p + j(2)} L${w + p + j(3)},${-p + j(4)} L${w + p + j(5)},${h + p + j(6)} L${-p + j(7)},${h + p + j(8)} Z`;
};

const strikePath = (w: number, h: number, seed: string, pass: number) =>
  `M${-6 + wob(seed, pass, 3)},${h * 0.55 + wob(seed, pass + 1, 4)} L${w + 6 + wob(seed, pass + 2, 3)},${h * 0.48 + wob(seed, pass + 3, 4)}`;

// Measures the wrapped content once fonts are ready (offsetWidth ignores camera transforms).
const useBox = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [handle] = useState(() => delayRender("measure annotation"));
  // First measure waits for fonts; after that, re-measure on every render and update only on change
  // (a late font swap changes text width).
  useLayoutEffect(() => {
    let done = false;
    document.fonts.ready.then(() => {
      if (done || !ref.current) return;
      setBox({ w: ref.current.offsetWidth, h: ref.current.offsetHeight });
      continueRender(handle);
    });
    return () => {
      done = true;
    };
  }, [handle]);
  useLayoutEffect(() => {
    if (!ref.current || !box) return;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    if (w !== box.w || h !== box.h) setBox({ w, h });
  });
  return { ref, box };
};

// Wrap any inline content. Size is measured; width/height override it if given.
export const Annotate: React.FC<{
  type?: "circle" | "underline" | "box" | "strike" | "highlight";
  width?: number;
  height?: number;
  delay?: number;
  durationInFrames?: number;
  color?: string;
  strokeWidth?: number;
  seed?: string;
  children: React.ReactNode;
}> = ({ type = "circle", width: wIn, height: hIn, delay = 0, durationInFrames = 18, color = "#FF6B6B", strokeWidth = 4, seed = "ann", children }) => {
  const frame = useCurrentFrame();
  const { ref, box } = useBox();
  const width = wIn ?? box?.w ?? 0;
  const height = hIn ?? box?.h ?? 0;
  const pass1 = interpolate(frame - delay, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pass2 = interpolate(frame - delay - durationInFrames * 0.6, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const make = type === "underline" ? underlinePath : type === "box" ? boxPath : type === "strike" ? strikePath : circlePath;
  if (type === "highlight") {
    return (
      <span ref={ref} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
        <span
          style={{
            position: "absolute",
            left: -6,
            right: -6,
            top: "12%",
            bottom: "4%",
            background: color,
            opacity: 0.55,
            borderRadius: 4,
            transform: `scaleX(${pass1}) skewX(-6deg)`,
            transformOrigin: "left",
            zIndex: 0,
          }}
        />
        <span style={{ position: "relative" }}>{children}</span>
      </span>
    );
  }
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      {children}
      {width > 0 ? <svg width={width + 80} height={height + 80} style={{ position: "absolute", left: -40, top: -40, overflow: "visible", pointerEvents: "none" }}>
        <g transform="translate(40,40)">
          {[pass1, pass2].map((p, i) => {
            if (p <= 0) return null;
            const d = make(width, height, seed, i);
            const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
            return <path key={i} d={d} fill="none" stroke={color} strokeWidth={strokeWidth - i} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} opacity={i ? 0.7 : 1} />;
          })}
        </g>
      </svg> : null}
    </span>
  );
};

// Curved connector that draws itself from A to B with an arrowhead at the end.
export const Connector: React.FC<{ from: [number, number]; to: [number, number]; bend?: number; delay?: number; durationInFrames?: number; color?: string; width?: number; dashed?: boolean }> = ({
  from,
  to,
  bend = 0.3,
  delay = 0,
  durationInFrames = 24,
  color = "#7C9CFF",
  width = 3,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  const ang = (Math.atan2(y2 - my, x2 - mx) * 180) / Math.PI;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width="100%" height="100%">
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      {p > 0.97 ? <path d="M-14,-8 L0,0 L-14,8" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${x2},${y2}) rotate(${ang})`} /> : null}
    </svg>
  );
};
