// Neutral showcase look. In a real demo, swap these for the brand's tokens from brands/[Brand]/Context.
import React from "react";
import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "800"], subsets: ["latin"] });

export const T = {
  bg: "#0B0D10",
  panel: "#15181D",
  line: "#252A31",
  bar: "#2C323A",
  text: "#F2F4F7",
  dim: "#8A93A0",
  accent: "#7C9CFF",
  accent2: "#5EE6B0",
};

// A believable app window: chrome, sidebar, rows. Real words only where the story is.
export const Window: React.FC<{
  width?: number;
  height?: number;
  title?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ width = 900, height = 560, title = "Reports", children, style }) => (
  <div
    style={{
      width,
      height,
      background: T.panel,
      borderRadius: 18,
      border: `1px solid ${T.line}`,
      boxShadow: "0 40px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.35)",
      overflow: "hidden",
      fontFamily,
      color: T.text,
      position: "relative",
      ...style,
    }}
  >
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: `1px solid ${T.line}` }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
      ))}
      <div style={{ marginLeft: 16, fontSize: 15, color: T.dim, fontWeight: 500 }}>{title}</div>
    </div>
    <div style={{ display: "flex", height: height - 44 }}>
      <div style={{ width: 180, borderRight: `1px solid ${T.line}`, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {[70, 90, 60, 80, 55].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 5, background: i === 1 ? T.accent : T.bar, opacity: i === 1 ? 0.8 : 1 }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 28, position: "relative" }}>
        {children ?? <Rows />}
      </div>
    </div>
  </div>
);

export const Rows: React.FC<{ n?: number }> = ({ n = 5 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ fontSize: 28, fontWeight: 600 }}>Project report</div>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: T.bar }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 10, width: `${60 + ((i * 37) % 30)}%`, borderRadius: 5, background: T.bar }} />
          <div style={{ height: 8, width: `${30 + ((i * 23) % 25)}%`, borderRadius: 4, background: T.line }} />
        </div>
      </div>
    ))}
  </div>
);

export const Button: React.FC<{ label: string; pressed?: number; style?: React.CSSProperties }> = ({ label, pressed = 0, style }) => (
  <div
    data-target
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 22px",
      borderRadius: 12,
      background: T.accent,
      color: "#0B0D10",
      fontWeight: 600,
      fontSize: 20,
      fontFamily,
      transform: `scale(${1 - pressed * 0.06})`,
      boxShadow: `0 ${8 - pressed * 6}px 24px rgba(124,156,255,${0.35 - pressed * 0.2})`,
      ...style,
    }}
  >
    {label}
  </div>
);

// Small label chip for the showcase reel only.
export const Label: React.FC<{ n: number; name: string; note?: string }> = ({ n, name, note }) => (
  <div style={{ position: "absolute", left: 48, bottom: 40, fontFamily, display: "flex", alignItems: "baseline", gap: 14 }}>
    <div style={{ fontSize: 20, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{String(n).padStart(2, "0")}</div>
    <div style={{ fontSize: 26, color: T.text, fontWeight: 600 }}>{name}</div>
    {note ? <div style={{ fontSize: 18, color: T.dim }}>{note}</div> : null}
  </div>
);
