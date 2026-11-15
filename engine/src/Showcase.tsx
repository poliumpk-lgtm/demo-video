// Showcase reel: every effect in the pack, one short scene each, labelled.
import React from "react";
import { AbsoluteFill, Series, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { ripple } from "@remotion/transitions/ripple";
import { crosswarp } from "@remotion/transitions/crosswarp";
import { filmBurn } from "@remotion/transitions/film-burn";
import { zoomBlur } from "@remotion/transitions/zoom-blur";
import { bookFlip } from "@remotion/transitions/book-flip";
import { pushCut } from "@remotion/transitions/push-cut";
import { crossZoom } from "@remotion/transitions/cross-zoom";
import { LightLeak } from "@remotion/light-leaks";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { Button, Label, T, Window, fontFamily, Rows } from "./ui";
import { CursorZoom, Tilt3D, TiltedStack, type CursorKey } from "./effects/camera";
import { FlapCounter, KineticWords, MaskedReveal, NumberRoll, Scramble, SplitText, Typewriter } from "./effects/text";
import { Burst, DotField, Globe, GlowBorder, LightRays, MeshGradient } from "./effects/atmosphere";
import { Annotate, Connector } from "./effects/annotate";

const Stage: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = T.bg }) => (
  <AbsoluteFill style={{ background: bg, alignItems: "center", justifyContent: "center", fontFamily, color: T.text }}>{children}</AbsoluteFill>
);

const FileCard: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        bottom: 150,
        width: 260,
        padding: 22,
        borderRadius: 16,
        background: "#1C2026",
        border: `1px solid ${T.line}`,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`,
        opacity: Math.min(1, s * 1.5),
        display: "flex",
        gap: 16,
        alignItems: "center",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ width: 44, height: 54, borderRadius: 8, background: T.accent2, opacity: 0.9 }} />
      <div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>report.md</div>
        <div style={{ fontSize: 16, color: T.dim }}>12 KB · ready</div>
      </div>
    </div>
  );
};

// 01 cursor walkthrough with zoom-follow
const keys: CursorKey[] = [
  // Button "Export report" sits at ~x1270–1450, y748–800 (window 1100×640 centred).
  { frame: 0, x: 1000, y: 480 },
  { frame: 40, x: 1360, y: 774 },
  { frame: 55, x: 1360, y: 774, click: true },
  { frame: 90, x: 1490, y: 840 },
  { frame: 120, x: 1490, y: 840 },
];
const SceneCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const pressed = frame >= 55 && frame < 61 ? Math.sin(((frame - 55) / 6) * Math.PI) : 0;
  return (
    <Stage>
      <CursorZoom keys={keys} zoom={1.7} holdFrames={45}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Window width={1100} height={640}>
            <Rows n={4} />
            <div style={{ position: "absolute", right: 60, bottom: 60 }}>
              <Button label="Export report" pressed={pressed} />
            </div>
            <FileCard at={62} />
          </Window>
        </AbsoluteFill>
      </CursorZoom>
      <Label n={1} name="Cursor zoom-follow" note="camera eases to the click, punches in, holds, eases out" />
    </Stage>
  );
};

const SceneTilt: React.FC = () => (
  <Stage>
    <Tilt3D from={[20, -28]} to={[4, 14]} durationInFrames={90}>
      <Window width={1000} height={600} />
    </Tilt3D>
    <Label n={2} name="3D tilt + glare" />
  </Stage>
);

const SceneStack: React.FC = () => (
  <Stage>
    <TiltedStack items={[<Window key="a" title="Inbox" />, <Window key="b" title="Reports" />, <Window key="c" title="Billing" />]} spread={110} delay={7} />
    <Label n={3} name="Tilted stack" />
  </Stage>
);

const SceneSplit: React.FC = () => (
  <Stage>
    <SplitText text="Ship the demo." by="letters" stagger={2} style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.04em" }} />
    <Label n={4} name="Split text" note="letters rise, blur clears" />
  </Stage>
);

const SceneMasked: React.FC = () => (
  <Stage>
    <MaskedReveal lines={["One click.", "Every report.", "Done."]} stagger={6} style={{ fontSize: 120, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }} />
    <Label n={5} name="Masked reveal" />
  </Stage>
);

const SceneKinetic: React.FC = () => (
  <Stage>
    <KineticWords words={["BOLD", "BOLDER", "BOLDEST"]} beat={14} sizes={[180, 230, 280]} />
    <Label n={6} name="Kinetic words on a beat" note="hard cuts + scale punch" />
  </Stage>
);

const SceneType: React.FC = () => (
  <Stage>
    <div style={{ width: 1100, padding: "34px 40px", borderRadius: 20, background: T.panel, border: `1px solid ${T.line}`, fontSize: 44 }}>
      <Typewriter text="Summarise last week's revenue by channel" cps={24} delay={8} caretColor={T.accent} />
    </div>
    <Label n={7} name="Typewriter" />
  </Stage>
);

const SceneScramble: React.FC = () => (
  <Stage>
    <Scramble text="SETTLEMENT CONFIRMED" durationInFrames={40} delay={6} style={{ fontSize: 110, fontWeight: 800, letterSpacing: "0.02em" }} />
    <Label n={8} name="Scramble resolve" note="seeded, same every render" />
  </Stage>
);

const SceneFlap: React.FC = () => (
  <Stage>
    <FlapCounter text="LAUNCH 10:00" delay={4} perChar={3} framesPerFlip={2} cell={110} />
    <Label n={9} name="Split-flap board" />
  </Stage>
);

const SceneRoll: React.FC = () => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 34, color: T.dim }}>Paid out this month</div>
      <NumberRoll to={1284500} durationInFrames={50} delay={6} prefix="$" style={{ fontSize: 170, fontWeight: 800, letterSpacing: "-0.02em" }} />
    </div>
    <Label n={10} name="Number roll" />
  </Stage>
);

const SceneAnnotate: React.FC = () => (
  <Stage>
    <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.5, textAlign: "center" }}>
      <div>
        Reports in{" "}
        <Annotate type="circle" delay={10} seed="c1">
          minutes
        </Annotate>
        , not{" "}
        <Annotate type="strike" delay={34} seed="s1">
          days
        </Annotate>
      </div>
      <div>
        <Annotate type="highlight" delay={52} color="#5EE6B0">
          any file
        </Annotate>{" "}
        <Annotate type="underline" delay={70} color={T.accent} seed="u1">
          any format
        </Annotate>
      </div>
    </div>
    <Label n={11} name="Hand-drawn annotations" note="circle · strike · highlight · underline" />
  </Stage>
);

const MiniCard: React.FC<{ x: number; y: number; title: string; sub: string }> = ({ x, y, title, sub }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 300, padding: 24, borderRadius: 16, background: T.panel, border: `1px solid ${T.line}` }}>
    <div style={{ fontSize: 26, fontWeight: 600 }}>{title}</div>
    <div style={{ fontSize: 18, color: T.dim, marginTop: 6 }}>{sub}</div>
  </div>
);
const SceneConnect: React.FC = () => (
  <Stage>
    <AbsoluteFill>
      <MiniCard x={260} y={300} title="Upload" sub="photo.jpg" />
      <MiniCard x={810} y={560} title="Process" sub="run #42" />
      <MiniCard x={1360} y={300} title="Share" sub="3 recipients" />
      <Connector from={[560, 360]} to={[810, 600]} bend={-0.25} delay={6} />
      <Connector from={[1110, 600]} to={[1360, 360]} bend={-0.25} delay={30} color={T.accent2} />
    </AbsoluteFill>
    <Label n={12} name="Self-drawing connectors" />
  </Stage>
);

const SceneMesh: React.FC = () => (
  <AbsoluteFill>
    <MeshGradient />
    <Stage bg="transparent">
      <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: "-0.04em" }}>Living gradient</div>
    </Stage>
    <Label n={13} name="Mesh gradient" note="noise-driven, seeded" />
  </AbsoluteFill>
);

const SceneDots: React.FC = () => (
  <AbsoluteFill style={{ background: T.bg }}>
    <DotField />
    <Label n={14} name="Noise dot field" />
  </AbsoluteFill>
);

const SceneRays: React.FC = () => (
  <Stage>
    <Window width={1000} height={580} style={{ marginTop: 120 }} />
    <LightRays />
    <Label n={15} name="Light rays" />
  </Stage>
);

const SceneGlow: React.FC = () => (
  <Stage>
    <GlowBorder radius={22} thickness={3}>
      <div style={{ width: 760, height: 300, background: T.panel, padding: 44, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 22, color: T.accent }}>NEW</div>
        <div style={{ fontSize: 58, fontWeight: 700 }}>Instant settlement</div>
        <div style={{ fontSize: 24, color: T.dim }}>Funds land in seconds, not days.</div>
      </div>
    </GlowBorder>
    <Label n={16} name="Glow border beam" />
  </Stage>
);

const SceneBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  return (
    <Stage>
      <div style={{ transform: `scale(${0.8 + s * 0.2})`, opacity: Math.min(1, s * 2), padding: "34px 50px", borderRadius: 22, background: T.panel, border: `1px solid ${T.line}`, display: "flex", gap: 22, alignItems: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: T.accent2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, color: "#0B0D10", fontWeight: 800 }}>✓</div>
        <div style={{ fontSize: 56, fontWeight: 700 }}>Payment sent</div>
      </div>
      <Burst x={960} y={540} at={16} />
      <Label n={17} name="Seeded particle burst" />
    </Stage>
  );
};

const SceneGlobe: React.FC = () => (
  <Stage>
    <Globe size={760} />
    <Label n={18} name="Dotted globe + arcs" />
  </Stage>
);

const SlideIn: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [4, 16], [-1400, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `translateX(${x}px)` }}>
        <Window width={900} height={520} />
      </div>
    </AbsoluteFill>
  );
};
const SceneBlur: React.FC = () => (
  <Stage>
    <CameraMotionBlur shutterAngle={180} samples={10}>
      <SlideIn />
    </CameraMotionBlur>
    <Label n={19} name="Camera motion blur" note="real sampled blur on a fast entrance" />
  </Stage>
);

const SceneLeak: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence durationInFrames={30}>
        <Stage bg="#10151C">
          <div style={{ fontSize: 110, fontWeight: 800 }}>Before</div>
        </Stage>
      </Series.Sequence>
      <Series.Sequence durationInFrames={45}>
        <Stage bg="#141019">
          <div style={{ fontSize: 110, fontWeight: 800 }}>After</div>
        </Stage>
      </Series.Sequence>
    </Series>
    <Sequence from={14} durationInFrames={36}>
      <LightLeak seed={4} hueShift={10} />
    </Sequence>
    <Label n={20} name="Light leak over a cut" />
  </AbsoluteFill>
);

// 21 transitions gallery
const Card: React.FC<{ name: string; hue: number }> = ({ name, hue }) => (
  <AbsoluteFill style={{ background: `hsl(${hue} 45% 14%)`, alignItems: "center", justifyContent: "center", fontFamily, color: T.text }}>
    <div style={{ fontSize: 26, color: T.dim, marginBottom: 12 }}>transition</div>
    <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: "-0.03em" }}>{name}</div>
  </AbsoluteFill>
);

const transitions = (w: number, h: number) =>
  [
    ["slide", slide({ direction: "from-right" })],
    ["wipe", wipe({ direction: "from-left" })],
    ["flip", flip()],
    ["clock wipe", clockWipe({ width: w, height: h })],
    ["iris", iris({ width: w, height: h })],
    ["ripple", ripple({})],
    ["crosswarp", crosswarp({})],
    ["film burn", filmBurn({ seed: 2 })],
    ["zoom blur", zoomBlur({})],
    ["book flip", bookFlip({ direction: "from-right" })],
    ["push cut", pushCut({})],
    ["cross zoom", crossZoom({})],
  ] as const;

const SceneTransitions: React.FC = () => {
  const { width, height } = useVideoConfig();
  const list = transitions(width, height);
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={34}>
          <Card name="21 · transitions" hue={220} />
        </TransitionSeries.Sequence>
        {list.map(([name, p], i) => (
          <React.Fragment key={name}>
            <TransitionSeries.Transition presentation={p as never} timing={linearTiming({ durationInFrames: 22 })} />
            <TransitionSeries.Sequence durationInFrames={44}>
              <Card name={name} hue={(i * 37 + 250) % 360} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const SCENES: { id: string; frames: number; C: React.FC }[] = [
  { id: "cursor", frames: 120, C: SceneCursor },
  { id: "tilt", frames: 90, C: SceneTilt },
  { id: "stack", frames: 90, C: SceneStack },
  { id: "split", frames: 75, C: SceneSplit },
  { id: "masked", frames: 70, C: SceneMasked },
  { id: "kinetic", frames: 52, C: SceneKinetic },
  { id: "type", frames: 90, C: SceneType },
  { id: "scramble", frames: 70, C: SceneScramble },
  { id: "flap", frames: 110, C: SceneFlap },
  { id: "roll", frames: 80, C: SceneRoll },
  { id: "annotate", frames: 115, C: SceneAnnotate },
  { id: "connect", frames: 80, C: SceneConnect },
  { id: "mesh", frames: 90, C: SceneMesh },
  { id: "dots", frames: 90, C: SceneDots },
  { id: "rays", frames: 90, C: SceneRays },
  { id: "glow", frames: 90, C: SceneGlow },
  { id: "burst", frames: 85, C: SceneBurst },
  { id: "globe", frames: 100, C: SceneGlobe },
  { id: "blur", frames: 50, C: SceneBlur },
  { id: "leak", frames: 75, C: SceneLeak },
  // Transitions overlap their neighbours: total = sequences − transitions.
  { id: "transitions", frames: 34 + 12 * 44 - 12 * 22, C: SceneTransitions },
];

export const SHOWCASE_FRAMES = SCENES.reduce((a, s) => a + s.frames, 0);

export const Showcase: React.FC = () => (
  <AbsoluteFill style={{ background: T.bg }}>
    <Series>
      {SCENES.map(({ id, frames, C }) => (
        <Series.Sequence key={id} durationInFrames={frames}>
          <C />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
