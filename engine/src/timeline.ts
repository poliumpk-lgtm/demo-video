// Turns a flow into frame numbers. Every timing rule lives here, so the video,
// the stills and the QA beats always agree.
import type { Props, StepTiming, Timeline } from "./types";
import { openerBeat, openerLength } from "./openers";

export const PUSH = 10; // push-cut overlap between the UI and the payoff

export const buildTimeline = ({ flow, cap }: Props): Timeline => {
  const fps = flow.format?.fps ?? 30;
  const width = flow.format?.width ?? 1920;
  const height = flow.format?.height ?? 1080;
  const beats: Timeline["beats"] = [];
  const cuts: number[] = [];
  let t = 0;

  // Opener (flow.hook.style): words by default; result, cold, type, number, split, logo.
  // Frame 0 is always already readable (it is the thumbnail).
  let hook: Timeline["hook"] = null;
  const style = flow.hook?.style ?? "words";
  const lines = flow.hook?.lines ?? [];
  const len = flow.hook ? openerLength({ flow, cap } as Props, fps) : 0;
  if (len > 0) {
    hook = [0, len];
    beats.push({ frame: 0, name: `opener (${style}) / thumbnail`, mustSee: openerBeat({ flow, cap } as Props) });
    if (style === "words") {
      const beat = flow.hook?.beat ?? 16;
      lines.forEach((l, i) => i && cuts.push(i * beat));
      beats.push({ frame: len - 4, name: "opener end", mustSee: `"${lines[lines.length - 1]}" in the accent colour` });
    } else {
      beats.push({ frame: len - 6, name: "opener end", mustSee: openerBeat({ flow, cap } as Props) });
    }
    t = len;
    cuts.push(t);
  }

  // UI steps.
  const uiStart = t;
  const first = flow.steps[0];
  t += first && first.do === "upload" ? 0 : 20; // a beat on the empty app first
  const steps: StepTiming[] = flow.steps.map((s, i) => {
    const c = cap.steps[i];
    const start = t;
    const approach = s.do === "upload" ? 36 : 16;
    const arrive = start + approach;
    let actions: number[] = [];
    let actLen = 0;
    if (s.do === "click") {
      const times = c?.times ?? s.times ?? 1;
      const every = times === 1 ? 8 : Math.max(3, Math.min(8, Math.round(60 / times)));
      actions = Array.from({ length: times }, (_, k) => arrive + 2 + k * every);
      actLen = 2 + times * every;
    } else if (s.do === "upload") {
      actions = [arrive];
      actLen = 6;
    } else if (s.do === "type") {
      actions = Array.from({ length: c?.shots ?? 1 }, (_, k) => arrive + 4 + k * 2);
      actLen = 4 + (c?.shots ?? 1) * 2;
    } else if (s.do === "point") {
      actions = [arrive + 2];
      actLen = 20;
    }
    const actStart = arrive;
    const actEnd = arrive + actLen;
    const hold = s.hold ?? (s.do === "point" ? 30 : s.do === "click" && (c?.times ?? 1) > 3 ? 24 : 18);
    const end = actEnd + hold;
    t = end;
    beats.push({ frame: Math.min(end - 1, actEnd + 4), name: `step ${i + 1} ${s.id ?? s.do}`, mustSee: describe(s) });
    return { i, start, arrive, actStart, actEnd, end, actions };
  });
  const uiEnd = t;

  // Payoff, entered with a push cut that overlaps the end of the UI.
  let payoff: Timeline["payoff"] = null;
  const ptype = flow.payoff?.type ?? (cap.payoff ? "spotlight" : "none");
  if (ptype !== "none") {
    const len = flow.payoff?.hold ?? 80;
    payoff = [uiEnd - PUSH, uiEnd - PUSH + len];
    cuts.push(uiEnd - PUSH / 2);
    beats.push({ frame: payoff[0] + 40, name: "payoff", mustSee: flow.payoff?.text ? `result shown big + "${flow.payoff.text}"` : "result shown big, readable" });
    t = payoff[1];
  }

  // Close: logo, line, url. Rings out to the last frame.
  let close: Timeline["close"] = null;
  if (flow.close) {
    close = [t, t + (flow.close.hold ?? 60)];
    cuts.push(t);
    beats.push({ frame: close[1] - 10, name: "close", mustSee: ["logo", flow.close.line && `"${flow.close.line}"`, flow.close.url].filter(Boolean).join(" + ") });
    t = close[1];
  }

  return { fps, width, height, hook, ui: [uiStart, uiEnd], steps, payoff, close, push: PUSH, total: Math.max(1, t), beats, cuts };
};

const describe = (s: Props["flow"]["steps"][number]) =>
  s.do === "upload" ? "file lands, app shows the loaded state" : s.do === "click" ? `cursor on ${s.target}${(s.times ?? 1) > 1 ? `, ${s.times} clicks done` : ", click visible"}` : s.do === "type" ? `"${s.text}" typed` : `${s.note ?? "circle"} drawn around ${s.target}`;
