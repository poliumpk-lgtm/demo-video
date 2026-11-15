# Project files

A project is a folder. The engine renders it; nothing else needs installing per project.

```
demos/<name>/
  brief.md          facts, concepts, approved script, corrections log
  brand.json        the brand (scripts/brand.mjs writes it; you edit it)
  DESIGN.md         human-readable brand notes
  brand/            logo + font files
  flow.json         the app, the steps, the hook, the payoff, the close
  assets/           files the demo uploads (the user's real photo, document…)
  cap/              captures + rects.json (scripts/capture.mjs writes it)
  checks.json       optional extra QA (probes, expect audio)
  qa/  out/         stills, contact sheet, QA report, videos
```

## flow.json

```json
{
  "format": { "width": 1920, "height": 1080, "fps": 30 },
  "app": {
    "url": "http://localhost:3000",
    "viewport": [1280, 720],
    "dismiss": ["text=Accept", "text=DISMISS"],
    "waitFor": "#app"
  },
  "hook": { "lines": ["one photo.", "twenty frames.", "zero seams."], "beat": 16 },
  "steps": [
    { "id": "drop", "do": "upload", "input": "input[type=file]", "target": "#drop", "file": "assets/photo.jpg" },
    { "id": "frames", "do": "click", "target": "#plus", "times": 17 },
    { "id": "gaps", "do": "point", "target": "label.check", "note": "circle" },
    { "id": "prompt", "do": "type", "target": "textarea", "text": "make it pop", "submit": true },
    { "id": "download", "do": "click", "target": "text=Download" }
  ],
  "payoff": { "type": "spotlight", "target": ".result", "text": "zero seams in the feed." },
  "close": { "line": "one photo. one seamless carousel.", "url": "example.com" }
}
```

### app
| Key | Meaning |
|---|---|
| `url` | where the app runs |
| `viewport` | browser size in CSS px. The whole flow must fit on this one screen (no scrolling yet). Default 1280×720. For vertical videos use a phone size. |
| `dismiss` | selectors clicked away before every capture: cookie banners, toasts, popups |
| `waitFor` | selector to wait for before the first capture |
| `scale` | capture pixel ratio (default picks enough to zoom ~2.2× sharp) |
| `colorScheme` | `light` or `dark` |

Selectors are Playwright selectors: CSS (`#save`, `button.primary`), text (`text=Download`), nth match (`a[title=Download] >> nth=1`). Find them with `node scripts/explore.mjs <url>` (screenshot + every visible control with a selector; `--upload file` / `--click sel` to see later states).

Every `target` and `app.waitFor` must be **visible** (non-zero size, on screen). File inputs are usually hidden: put the hidden input in `input` and something visible (the drop zone, or its text like `text=Drop OR`) in `target`.

### steps
| `do` | Keys | What the video shows |
|---|---|---|
| `upload` | `input` (the file input), `target` (the drop zone), `file`, `wait` (ms for the app to process) | the real file dragged in from off-screen and dropped |
| `click` | `target`, `times` (default 1), `wait` (ms between clicks) | cursor travels, camera punches in, clicks with ripple. More than 3 clicks: punch in, then pull back so the change is visible |
| `type` | `target`, `text`, `submit` | text appears in real typing states (up to 12) |
| `point` | `target`, `note`: `circle` / `underline` / `box` / `highlight` | a hand-drawn mark around the target, in the brand accent |

Any step: `zoom` (camera zoom on the target; default automatic, `1` = stay wide) and `hold` (frames to hold after the action).

### payoff
`type: "spotlight"` (default) lifts the `target` region of the final screen out of the app and settles it big and flat, with an optional `text` caption. `type: "none"` skips it. Any other name is a custom payoff registered in `engine/src/payoffs/index.tsx` (see `custom-payoffs.md`).

### close
`line`, `url`, `hold` (frames, default 60). Uses the brand logo (or the name in the heading font if there is no logo).

## concepts/<name>.json

A concept is a partial flow merged over `flow.json`, used for the storyboards and for rendering the chosen version:

```json
{ "pitch": "Problem → fix: X's gaps break your photo", "hook": { "lines": ["X cuts your photo.", "we hide the cuts."] },
  "use": ["drop", "gaps", "download"], "payoff": { "type": "spotlight", "target": ".post", "text": "no jumps." } }
```

`use` picks and orders captured steps by id. Captures run in flow order, so a skipped step's effect still shows on later screens; if a concept needs a genuinely different state, give it its own capture (a second project folder with its own flow). Render one: `render.mjs <project> --concept B`; board of all: `storyboard.mjs <project>`.

## brand.json

```json
{
  "name": "Acme",
  "colors": { "bg": "#0C0B0F", "text": "#FFFFFF", "accent": "#ECFB77", "muted": "#8B8795" },
  "fonts": {
    "heading": { "family": "Acme Sans", "weight": 600 },
    "body": { "family": "Acme Sans", "weight": 400 },
    "files": [{ "family": "Acme Sans", "file": "brand/fonts/AcmeSans.woff2" }]
  },
  "logo": { "file": "brand/logo.svg", "w": 132, "h": 44 },
  "voice": { "description": "…", "headlines": ["…"] },
  "confirmed": true,
  "gaps": []
}
```

The engine uses `bg` for every background, `text` for hook lines, `accent` for the last hook line, the click ripple, annotations, captions and the close URL.

## Timeline (how frames are decided)

`engine/src/timeline.ts` turns the flow into frames: hook lines one beat each; each step = approach (16 frames; 36 for a drag-in upload) + action + hold; payoff entered by a 10-frame push cut; close 60 frames. `render.mjs --beats` prints every beat with what must be visible. Change timing with `hook.beat`, step `hold`, `payoff.hold`, `close.hold`.
