// Text effects. All driven by useCurrentFrame(); start at the Sequence's frame 0.
import React from "react";
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Letters or words rise in with a spring and a blur that clears (the Splitting look).
export const SplitText: React.FC<{
  text: string;
  by?: "letters" | "words";
  stagger?: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ text, by = "letters", stagger = 2, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parts = by === "letters" ? Array.from(text) : text.split(/(\s+)/);
  let idx = 0;
  return (
    <div style={{ whiteSpace: "pre", ...style }}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) return <span key={i}>{p}</span>;
        const n = idx++;
        const s = spring({ frame: frame - delay - n * stagger, fps, config: { damping: 14, mass: 0.6 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - s) * 0.6}em)`,
              opacity: Math.min(1, s * 1.4),
              filter: `blur(${(1 - Math.min(1, s)) * 8}px)`,
            }}
          >
            {p === " " ? " " : p}
          </span>
        );
      })}
    </div>
  );
};

// Typewriter with a caret that blinks only while idle.
export const Typewriter: React.FC<{ text: string; cps?: number; delay?: number; caretColor?: string; style?: React.CSSProperties }> = ({
  text,
  cps = 22,
  delay = 0,
  caretColor = "currentColor",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - delay) / fps) * cps)));
  const typing = n > 0 && n < text.length;
  const caretOn = typing || Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <div style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: "0.06em", height: "1em", marginLeft: "0.04em", verticalAlign: "-0.12em", background: caretColor, opacity: caretOn ? 1 : 0 }} />
    </div>
  );
};

// Text that scrambles through seeded glyphs and locks left to right.
export const Scramble: React.FC<{ text: string; durationInFrames?: number; delay?: number; glyphs?: string; style?: React.CSSProperties }> = ({
  text,
  durationInFrames = 30,
  delay = 0,
  glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=?",
  style,
}) => {
  const frame = useCurrentFrame() - delay;
  const chars = Array.from(text);
  return (
    <div style={{ whiteSpace: "pre", fontVariantNumeric: "tabular-nums", ...style }}>
      {chars.map((ch, i) => {
        const lockAt = (i / chars.length) * durationInFrames * 0.7 + durationInFrames * 0.3;
        if (ch === " " || frame >= lockAt) return <span key={i}>{frame < 0 ? " " : ch}</span>;
        if (frame < 0) return <span key={i}>{" "}</span>;
        const g = glyphs[Math.floor(random(`scr-${i}-${Math.floor(frame / 2)}`) * glyphs.length)];
        return (
          <span key={i} style={{ opacity: 0.55 }}>
            {g}
          </span>
        );
      })}
    </div>
  );
};

// Split-flap board (airport display). Each cell flips through the alphabet to its target.
const FLAP = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$%.,:-+";
export const FlapCounter: React.FC<{ text: string; delay?: number; perChar?: number; framesPerFlip?: number; cell?: number; style?: React.CSSProperties }> = ({
  text,
  delay = 0,
  perChar = 2,
  framesPerFlip = 2,
  cell = 90,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: cell * 0.08, ...style }}>
      {Array.from(text.toUpperCase()).map((target, i) => {
        const targetIdx = Math.max(0, FLAP.indexOf(target));
        // Start 6–13 flips before the target so the board settles fast and then holds.
        const startIdx = (targetIdx - 6 - Math.floor(random(`flap-${i}`) * 8) + FLAP.length) % FLAP.length;
        const steps = (targetIdx - startIdx + FLAP.length) % FLAP.length;
        const local = frame - delay - i * perChar;
        const flips = Math.max(0, Math.min(steps, Math.floor(local / framesPerFlip)));
        const cur = FLAP[(startIdx + flips) % FLAP.length];
        const next = FLAP[(startIdx + Math.min(steps, flips + 1)) % FLAP.length];
        const phase = flips < steps ? (Math.max(0, local) % framesPerFlip) / framesPerFlip : 0;
        const half = (top: boolean, ch: string, extra?: React.CSSProperties): React.ReactNode => (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: "50%",
              top: top ? 0 : "50%",
              overflow: "hidden",
              background: top ? "#1E2228" : "#191C21",
              borderRadius: top ? "10px 10px 0 0" : "0 0 10px 10px",
              ...extra,
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: top ? 0 : "-100%", height: "200%", display: "flex", alignItems: "center", justifyContent: "center" }}>{ch}</div>
          </div>
        );
        return (
          <div key={i} style={{ position: "relative", width: cell * 0.72, height: cell, fontSize: cell * 0.7, fontWeight: 600, color: "#F2F4F7", perspective: 400 }}>
            {half(true, next)}
            {half(false, cur)}
            {phase > 0 ? (
              phase < 0.5
                ? half(true, cur, { transformOrigin: "bottom", transform: `rotateX(${-phase * 180}deg)` })
                : half(false, next, { transformOrigin: "top", transform: `rotateX(${(1 - phase) * 180}deg)` })
            ) : null}
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "#0B0D10" }} />
          </div>
        );
      })}
    </div>
  );
};

// Odometer: each digit column rolls to its value.
export const NumberRoll: React.FC<{
  from?: number;
  to: number;
  durationInFrames?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ from = 0, to, durationInFrames = 45, delay = 0, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - t, 3);
  const value = from + (to - from) * eased;
  const digits = String(Math.round(to)).length;
  // Each column shows its digit and only rolls while the column below it wraps 9 → 0,
  // so every digit lands exactly on the final value.
  const cols = Array.from({ length: digits }, (_, i) => {
    const place = 10 ** (digits - 1 - i);
    const d = Math.floor(value / place) % 10;
    const lower = value % place;
    const frac = place === 1 ? value % 1 : Math.max(0, Math.min(1, lower - (place - 1)));
    return d + frac;
  });
  const withCommas = (i: number) => (digits - i) % 3 === 0 && i !== 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontVariantNumeric: "tabular-nums", lineHeight: 1, ...style }}>
      {prefix}
      {cols.map((v, i) => (
        <React.Fragment key={i}>
          {withCommas(i) ? <span>,</span> : null}
          <span style={{ display: "inline-block", height: "1em", overflow: "hidden", position: "relative", width: "0.62em" }}>
            <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${-v}em)`, display: "flex", flexDirection: "column" }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, k) => (
                <span key={k} style={{ height: "1em" }}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        </React.Fragment>
      ))}
      {suffix}
    </div>
  );
};

// Hard-cut kinetic words on a beat grid, each landing with a scale punch (BOLD → BOLDER).
export const KineticWords: React.FC<{ words: string[]; beat?: number; style?: React.CSSProperties; sizes?: number[] }> = ({ words, beat = 8, style, sizes }) => {
  const frame = useCurrentFrame();
  const i = Math.min(words.length - 1, Math.floor(frame / beat));
  const local = frame - i * beat;
  const punch = interpolate(local, [0, 3, 8], [1.18, 0.97, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `scale(${punch})`, fontSize: sizes?.[i] ?? 220, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, ...style }}>{words[i]}</div>
  );
};

// Line rises from behind an invisible mask edge.
export const MaskedReveal: React.FC<{ lines: string[]; stagger?: number; delay?: number; style?: React.CSSProperties }> = ({ lines, stagger = 5, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={style}>
      {lines.map((l, i) => {
        const s = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 200 }, durationInFrames: 22 });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em" }}>
            <div style={{ transform: `translateY(${(1 - s) * 110}%)` }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
};
