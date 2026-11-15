// Backgrounds and atmosphere: mesh gradient, noise dot field, light rays, glow border, particles, globe.
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D, noise3D } from "@remotion/noise";

// Soft blobs drifting on noise, blurred together (the Granim / mesh gradient look).
export const MeshGradient: React.FC<{ colors?: string[]; base?: string; speed?: number; seed?: string }> = ({
  colors = ["#3B5BDB", "#7C9CFF", "#5EE6B0", "#9B5DE5"],
  base = "#0B0D10",
  speed = 0.006,
  seed = "mesh",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: `blur(${Math.round(width / 12)}px)` }}>
        {colors.map((c, i) => {
          const x = (0.5 + 0.42 * noise2D(`${seed}-x${i}`, frame * speed, i * 10)) * width;
          const y = (0.5 + 0.42 * noise2D(`${seed}-y${i}`, frame * speed, i * 10 + 5)) * height;
          const r = width * (0.28 + 0.08 * noise2D(`${seed}-r${i}`, frame * speed, i));
          return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: c, opacity: 0.75 }} />;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Grid of dots lifted by 3D noise: a calm "data" surface.
export const DotField: React.FC<{ cols?: number; rows?: number; color?: string; speed?: number }> = ({ cols = 48, rows = 27, color = "#7C9CFF", speed = 0.02 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const gx = width / cols;
  const gy = height / rows;
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        {Array.from({ length: cols * rows }, (_, k) => {
          const i = k % cols;
          const j = Math.floor(k / cols);
          const n = noise3D("dots", i * 0.09, j * 0.09, frame * speed);
          const r = 1.2 + Math.max(0, n) * 4.5;
          return <circle key={k} cx={gx * (i + 0.5)} cy={gy * (j + 0.5) - n * 10} r={r} fill={color} opacity={0.18 + Math.max(0, n) * 0.8} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Slowly turning god rays from a point above the frame.
export const LightRays: React.FC<{ color?: string; x?: number; y?: number; rays?: number; speed?: number; opacity?: number }> = ({
  color = "255,255,255",
  x = 0.5,
  y = -0.15,
  rays = 14,
  speed = 0.15,
  opacity = 0.22,
}) => {
  const frame = useCurrentFrame();
  const stops = Array.from({ length: rays }, (_, i) => {
    const a = (360 / rays) * i;
    const w = 3 + random(`ray-${i}`) * 6;
    const o = opacity * (0.4 + 0.6 * random(`rayo-${i}`));
    return `rgba(${color},0) ${a}deg, rgba(${color},${o}) ${a + w / 2}deg, rgba(${color},0) ${a + w}deg`;
  }).join(", ");
  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${frame * speed}deg at ${x * 100}% ${y * 100}%, ${stops})`,
        filter: "blur(18px)",
        maskImage: `radial-gradient(ellipse at ${x * 100}% ${y * 100}%, black 10%, transparent 75%)`,
        WebkitMaskImage: `radial-gradient(ellipse at ${x * 100}% ${y * 100}%, black 10%, transparent 75%)`,
        mixBlendMode: "screen",
      }}
    />
  );
};

// A beam of light running around a card's border.
export const GlowBorder: React.FC<{ radius?: number; thickness?: number; color?: string; speed?: number; children: React.ReactNode }> = ({
  radius = 20,
  thickness = 2,
  color = "#7C9CFF",
  speed = 4,
  children,
}) => {
  const frame = useCurrentFrame();
  const ring = `conic-gradient(from ${frame * speed}deg, transparent 0deg, transparent 200deg, ${color} 300deg, #fff 340deg, transparent 360deg)`;
  return (
    <div style={{ position: "relative", borderRadius: radius, padding: thickness, background: "rgba(255,255,255,0.06)" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: ring }} />
      <div style={{ position: "absolute", inset: -14, borderRadius: radius + 14, background: ring, filter: "blur(22px)", opacity: 0.55 }} />
      <div style={{ position: "relative", borderRadius: radius - thickness, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

// Seeded particle burst from a point, with gravity and fade. Same frame, same particles.
export const Burst: React.FC<{ x: number; y: number; at?: number; count?: number; colors?: string[]; seed?: string; spread?: number }> = ({
  x,
  y,
  at = 0,
  count = 70,
  colors = ["#7C9CFF", "#5EE6B0", "#F2F4F7", "#FFD166"],
  seed = "burst",
  spread = 14,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 70) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`${seed}-a${i}`) * Math.PI * 2;
        const v = spread * (0.35 + random(`${seed}-v${i}`) * 0.65);
        const px = x + Math.cos(a) * v * t * 0.9;
        const py = y + Math.sin(a) * v * t * 0.9 + 0.35 * t * t;
        const s = 6 + random(`${seed}-s${i}`) * 10;
        const rot = random(`${seed}-r${i}`) * 360 + t * 12;
        const o = interpolate(t, [0, 40, 70], [1, 1, 0]);
        return (
          <div
            key={i}
            style={{ position: "absolute", left: px, top: py, width: s, height: s * 0.6, background: colors[i % colors.length], opacity: o, transform: `rotate(${rot}deg)`, borderRadius: 2 }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Dotted globe (fibonacci sphere) turning, with arcs between points. Good for "global" / network claims.
export const Globe: React.FC<{ size?: number; dots?: number; color?: string; arc?: string; speed?: number; arcs?: [number, number][] }> = ({
  size = 640,
  dots = 900,
  color = "#7C9CFF",
  arc = "#5EE6B0",
  speed = 0.6,
  arcs = [
    [40, 520],
    [120, 700],
    [300, 860],
    [610, 210],
  ],
}) => {
  const frame = useCurrentFrame();
  const pts = useMemo(
    () =>
      Array.from({ length: dots }, (_, i) => {
        const y = 1 - (i / (dots - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = Math.PI * (3 - Math.sqrt(5)) * i;
        return [Math.cos(th) * r, y, Math.sin(th) * r] as const;
      }),
    [dots],
  );
  const rot = (frame * speed * Math.PI) / 180;
  const tilt = 0.35;
  const project = ([x, y, z]: readonly [number, number, number]) => {
    const x1 = x * Math.cos(rot) + z * Math.sin(rot);
    const z1 = -x * Math.sin(rot) + z * Math.cos(rot);
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
    return { x: size / 2 + x1 * size * 0.46, y: size / 2 + y2 * size * 0.46, z: z2 };
  };
  const arcPath = (a: number, b: number) => {
    const A = pts[a];
    const B = pts[b];
    const seg = 32;
    let d = "";
    let minZ = 1;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      let v = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
      const len = Math.hypot(v[0], v[1], v[2]);
      const lift = 1 + 0.1 * Math.sin(Math.PI * t);
      v = v.map((c) => (c / len) * lift);
      const p = project(v as unknown as readonly [number, number, number]);
      minZ = Math.min(minZ, p.z);
      d += `${s ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    // Fade arcs as they turn toward the back instead of popping.
    return { d, opacity: Math.max(0, Math.min(1, (minZ + 0.15) * 3)) };
  };
  return (
    <svg width={size} height={size}>
      <defs>
        <radialGradient id="glow">
          <stop offset="60%" stopColor={color} stopOpacity={0.08} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size * 0.5} fill="url(#glow)" />
      {pts.map((p, i) => {
        const q = project(p);
        if (q.z < 0) return null;
        return <circle key={i} cx={q.x} cy={q.y} r={1.6 + q.z * 2.2} fill={color} opacity={0.3 + q.z * 0.7} />;
      })}
      {arcs.map(([a, b], i) => {
        const { d, opacity } = arcPath(a, b);
        return opacity > 0 ? <path key={i} d={d} fill="none" stroke={arc} strokeWidth={2.4} strokeLinecap="round" opacity={0.95 * opacity} /> : null;
      })}
    </svg>
  );
};
