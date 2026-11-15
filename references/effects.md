# Effects

Every effect is a frame-driven React component (a pure function of the frame, so stills and the video always match). Preview them all: `cd engine && npx remotion studio`, composition **Effects**.

Pick effects in the script, not after. Each one needs a job: introduce, point, prove or land. Two or three strong effects beat ten weak ones. The engine already uses the cursor, camera, click ripple, kinetic hook, annotations and push cut; reach for the rest in custom payoffs.

| Effect | Component | File | Good for |
|---|---|---|---|
| Cursor + zoom-follow + click ripple | `CursorZoom`, `Cursor`, `cursorAt` | `engine/src/effects/camera.tsx` | the core action (built into the engine) |
| 3D tilt + glare sweep | `Tilt3D` | `camera.tsx` | hero product shot |
| Tilted stack fan-out | `TiltedStack` | `camera.tsx` | "many screens / many features" |
| Split text (letters rise, blur clears) | `SplitText` | `text.tsx` | headlines |
| Masked line reveal | `MaskedReveal` | `text.tsx` | taglines |
| Kinetic words on a beat | `KineticWords` | `text.tsx` | punchy openers (the engine's hook) |
| Typewriter with caret | `Typewriter` | `text.tsx` | prompts, search, AI input |
| Scramble resolve | `Scramble` | `text.tsx` | "confirmed", status |
| Split-flap board | `FlapCounter` | `text.tsx` | launch times, tickers |
| Odometer number roll | `NumberRoll` | `text.tsx` | stats, money, a result number |
| Hand-drawn circle / underline / box / strike / highlight | `Annotate` | `annotate.tsx` | pointing at the proof (the `point` step) |
| Self-drawing connector + arrow | `Connector` | `annotate.tsx` | flows, A → B |
| Mesh gradient | `MeshGradient` | `atmosphere.tsx` | backgrounds, end cards |
| Noise dot field | `DotField` | `atmosphere.tsx` | data / infra backdrop |
| Light rays | `LightRays` | `atmosphere.tsx` | hero reveal |
| Glow border beam | `GlowBorder` | `atmosphere.tsx` | a "new" feature card |
| Seeded particle burst | `Burst` | `atmosphere.tsx` | success moment |
| Dotted globe + arcs | `Globe` | `atmosphere.tsx` | global, network |
| Camera motion blur | `CameraMotionBlur` (`@remotion/motion-blur`) | Effects scene 19 | fast entrances only |
| Light leak over a cut | `LightLeak` (`@remotion/light-leaks`) | Effects scene 20 | warm scene change |
| 12 transitions: slide, wipe, flip, clock wipe, iris, ripple, crosswarp, film burn, zoom blur, book flip, push cut, cross zoom | `@remotion/transitions/*` | Effects scene 21 | scene changes |

Notes:

- Colours in the effects are neutral placeholders. Pass the brand's colours (`props.brand.colors`) when you use one.
- `TransitionSeries` overlaps scenes: total length = sum of sequences − sum of transitions.
- `Annotate` keeps its content on one line.
- WebGL transitions (ripple, crosswarp, film burn, zoom blur, book flip, cross zoom) render in Remotion's own browser: check them in a rendered still.
- No third-party animation libraries (GSAP, Anime.js, Motion, Lottie players, particle engines, typewriter libraries). Anything with its own clock breaks stills; QA's `seek` check fails it.
