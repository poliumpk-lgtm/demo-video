# QA

The first render always looks finished. That is the problem: a defect that lives for 40 frames is invisible at playback speed, and the model never sees the film unless you show it. So every claim about the video is checked by a still, a measurement or the file.

```bash
node scripts/qa.mjs demos/<name> --video out/demo.mp4
node scripts/qa.mjs demos/<name> --only frame0,sheet     # quick, while iterating
```

| Check | Catches | How |
|---|---|---|
| `frame0` | black or blank thumbnail | brightness + contrast of frame 0 (white text on a dark brand passes; a flat or near-black frame fails) |
| `seek` | hidden state, unseeded randomness, anything with its own clock | renders each beat twice, and again by playing the 20 frames before it; all three must match |
| `hex` | the brand colour that came out wrong, or never shows | searches the hook end, payoff and close for the brand accent (ΔE ≤ 6); plus any probes in `checks.json` |
| `sheet` | cropping, overlap, unreadable text, the cursor off target | every beat + the frames around every cut → `qa/sheet.png`, labelled in `qa/sheet.html` |
| `file` | wrong size / fps / duration, a pixel format that won't play, audio longer than video, black first frame in the export | ffprobe + decode of the exported file |

Read the sheet yourself, beat by beat, against each `mustSee`. You review a sheet well. You cannot see between frames (things passing through each other) and you cannot judge taste: those are the user's.

`checks.json` (optional):

```json
{
  "probes": [{ "name": "button yellow", "frame": 286, "x": 1286, "y": 190, "size": 6, "hex": "#ECFB77", "tol": 6 }],
  "expect": { "audio": true }
}
```

## Corrections: four fields

Every fix, from the user's notes or your own review:

1. **Location**: the frame (global, from the timeline)
2. **Problem**: what is wrong, observed
3. **Change**: what to do, with constraints
4. **Fixed**: what must not move (click frames, copy, the payoff)

Missing information and unreadable text first, then timing, then detail. At most five per round. Log them in `brief.md`.

## Ten ways demos go wrong

| Class | Example | Caught by |
|---|---|---|
| Invented facts | placeholder text, a drawn logo, a claim nobody made | brief, real captures, sheet |
| Defaults | the same generic look every model makes | concepts, brand, sheet |
| Staging | cursor covering the result, a caption on a same-colour background | sheet |
| Wrong target | the cursor clicks "about there" | captured rects (cursor uses the real position) |
| Hidden history | a frame depends on the frame before | `seek` |
| Render artefacts | blurry zoom, flicker | capture scale, sheet |
| Colour | the brand accent came out a different shade | `hex` |
| The thumbnail | black or empty frame 0 | `frame0` |
| The file | audio 12.011 s vs video 12.000 s, yuv444 that won't play on phones | `file` |
| Taste | it is correct and still dull | the user, and the concept step |

When a defect class shows up twice, make it a rule in `brief.md` and, if it is measurable, a probe in `checks.json` that would have failed.
