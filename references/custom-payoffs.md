# Custom payoffs

The payoff is the moment the video exists for. `spotlight` works for anything, but the best demos give the product's result its own move: a photo splitting into strips, a number rolling up, a document flying into a folder, before and after wiping across each other.

## Add one

1. Create `engine/src/payoffs/<name>.tsx`:

```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { PayoffProps } from "./index";

export const MyPayoff: React.FC<PayoffProps> = ({ props }) => {
  const f = useCurrentFrame(); // 0 = start of the push cut into the payoff
  const { fps } = useVideoConfig();
  const { brand, cap, flow } = props;
  // Real material only: the captured screens (cap/*.png), the uploaded file (cap.steps[i].file),
  // the brand (colours, fonts, logo). Never draw a stand-in.
  const s = spring({ frame: f - 6, fps, config: { damping: 18 } });
  return <AbsoluteFill style={{ background: brand.colors.bg }}>{/* ... */}</AbsoluteFill>;
};
```

2. Register it in `engine/src/payoffs/index.tsx`: `PAYOFFS.mypayoff = MyPayoff` (add to the object).
3. Set `"payoff": { "type": "mypayoff", "hold": 90 }` in the project's `flow.json`.

## What a payoff has to work with

| Material | Where |
|---|---|
| Final screen | `staticFile(\`cap/s${props.flow.steps.length - 1}-rest.png\`)` (helper: `finalShot(props)` from `../Demo`) |
| Any captured state | `cap/start.png`, `cap/s<step>-<k>.png`, `cap/s<step>-rest.png` |
| Target positions | `props.cap.steps[i].rect`, `props.cap.payoff` (CSS px of the capture viewport) |
| The uploaded file | `staticFile(props.cap.steps[i].file)`, its size in `fileSize` |
| Brand | `props.brand.colors`, `fontStack(brand.fonts.heading.family)`, `brand.logo.file` |
| Effects | `../effects/*` (see `effects.md`) |

## Rules

- Every frame is a pure function of `useCurrentFrame()`. Randomness only through `random("seed")` from `remotion`. No `Math.random`, no timers, no libraries with their own clock. QA's `seek` check catches violations.
- Show what the product really does. If the product cuts equal strips, the payoff cuts equal strips, even if uneven ones would look better.
- Land it and hold it: the result must be readable for at least ~1 s.

## Example: the split payoff (Polium Split)

The Polium Split demo's payoff cuts the uploaded photo into the same N strips the app makes (same maths as the app: equal widths, minus the slivers X's 4 px gaps would hide), pulls them forward like books off a shelf, then slots them into the app's real X-post preview. See `examples/polium-split/` for the flow and the script.
