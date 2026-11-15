import React from "react";
import { Composition } from "remotion";
import { Demo } from "./Demo";
import { buildTimeline } from "./timeline";
import { Showcase, SHOWCASE_FRAMES } from "./Showcase";
import type { Props } from "./types";

// Placeholder props so Studio opens without a project. Real renders pass the project
// files as input props (scripts/render.mjs, scripts/qa.mjs).
const empty: Props = {
  brand: { name: "Your product", colors: { bg: "#0B0D10", text: "#F2F4F7", accent: "#7C9CFF" }, fonts: { heading: { family: null, weight: 700 }, body: { family: null, weight: 400 }, files: [] }, logo: null },
  flow: { app: { url: "" }, hook: { lines: ["Run scripts/new.mjs", "to start a project."] }, steps: [] },
  cap: { viewport: { w: 1280, h: 720 }, scale: 2, steps: [], payoff: null, content: { x: 0, y: 0, w: 1280, h: 720 } },
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Demo"
      component={Demo}
      defaultProps={empty}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={60}
      calculateMetadata={({ props }) => {
        const tl = buildTimeline(props);
        return { durationInFrames: tl.total, width: tl.width, height: tl.height, fps: tl.fps, props: { ...props, _timeline: tl } };
      }}
    />
    {/* The effects pack, one reel: see references/effects.md */}
    <Composition id="Effects" component={Showcase} width={1920} height={1080} fps={30} durationInFrames={SHOWCASE_FRAMES} />
  </>
);
