// Shapes of the three project files the engine renders. See references/flow-format.md.
export type Rect = { x: number; y: number; w: number; h: number };

export type Brand = {
  name: string;
  colors: { bg: string; text: string; accent: string | null; muted?: string | null };
  fonts: { heading: { family: string | null; weight: number }; body: { family: string | null; weight: number }; files: { family: string; file: string; weight?: number }[] };
  logo: { file: string; w?: number | null; h?: number | null } | null;
};

export type Step =
  | { id?: string; do: "upload"; input: string; target?: string; file: string; wait?: number; hold?: number; zoom?: number }
  | { id?: string; do: "click"; target: string; times?: number; hold?: number; zoom?: number }
  | { id?: string; do: "type"; target: string; text: string; submit?: boolean; hold?: number; zoom?: number }
  | { id?: string; do: "point"; target: string; note?: "circle" | "underline" | "box" | "highlight"; hold?: number; zoom?: number };

export type Flow = {
  format?: { width?: number; height?: number; fps?: number };
  app: { url: string; viewport?: [number, number] };
  hook?: {
    style?: "words" | "result" | "cold" | "type" | "number" | "split" | "logo";
    lines?: string[];
    beat?: number;
    frames?: number;
    focus?: string; // cold: step id to start tight on
    number?: { value: number; from?: number; prefix?: string; suffix?: string; decimals?: number };
  };
  steps: Step[];
  payoff?: { type?: "spotlight" | "none" | string; target?: string; text?: string; hold?: number; rects?: Record<string, string>; [k: string]: unknown };
  close?: { line?: string; url?: string; hold?: number };
};

export type CapStep = { id: string; do: Step["do"]; rect: Rect; shots: number; times?: number; file?: string; fileSize?: { w: number; h: number } | null; shotIndex?: number };
export type Cap = { viewport: { w: number; h: number }; scale: number; steps: CapStep[]; payoff: Rect | null; payoffRects?: Record<string, Rect>; content: Rect };

export type Props = { brand: Brand; flow: Flow; cap: Cap; _timeline?: Timeline };

export type StepTiming = { i: number; start: number; arrive: number; actStart: number; actEnd: number; end: number; actions: number[] };
export type Timeline = {
  fps: number;
  width: number;
  height: number;
  hook: [number, number] | null;
  ui: [number, number];
  steps: StepTiming[];
  payoff: [number, number] | null;
  close: [number, number] | null;
  push: number;
  total: number;
  beats: { frame: number; name: string; mustSee: string }[];
  cuts: number[];
};
