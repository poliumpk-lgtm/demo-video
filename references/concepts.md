# Concepts and the script

Most people get stuck on the script. So they never write one: they pick from three concepts shown as storyboards of their own product, then approve a script you write.

## Where it runs → shape

| Platform | Aspect (`format`) | Length | Notes |
|---|---|---|---|
| X / Twitter | 1920×1080 or 1080×1080 | 10–20 s | Autoplays muted: the hook must read with sound off. Frame 0 is the thumbnail. |
| LinkedIn | 1080×1080 or 1080×1350 | 15–30 s | Slightly slower; a caption line on the payoff helps. |
| Instagram / TikTok / Shorts | 1080×1920 | 8–20 s | Big type, centre-weighted; set `app.viewport` to a phone size (e.g. [430, 932]) so the UI reads. |
| Product Hunt / landing hero | 1920×1080 | 20–45 s | Can show two or three steps; loops well if the end matches the start. |

## Three angles (pick the three that fit best)

| Angle | Hook shape | Works when |
|---|---|---|
| **Problem → fix** | "X is broken." / "here's the fix." | there is a pain everyone recognises |
| **Speed run** | "one photo." / "twenty frames." / "zero seams." | the product does a lot in few clicks |
| **Before / after** | "before." … "after." | the result is visual |
| **The number** | "77% smaller." | the result is a measurable number |
| **The meme** | a known format, the product as the punchline | the audience is very online; check image rights |
| **The question** | "what if X took one click?" | new category, people need the idea first |

## Openers

Not every video should open with big words. Pick the opener per concept (`hook.style`, formats in `flow-format.md`) and **give the three concepts three different openers**:

| Opener | Use when |
|---|---|
| `words` | the idea fits in 2–4 punchy lines |
| `result` | the result is visual and impressive on its own |
| `cold` | the product looks good up close; no text needed |
| `type` | the product takes a question or prompt (AI, search) |
| `number` | there is one real, striking number |
| `split` | before/after is the whole story |
| `logo` | the brand insists; weakest on social |

For each concept write:

- **Pitch**: one line, why it lands for this audience.
- **Opener**: the style and its text (for `words`, 2–4 short lines, each one beat). Lowercase and punchy reads well; follow the brand's voice from `DESIGN.md`.
- **Flow**: which captured steps, in what order, which one gets the zoom.
- **Payoff**: the one moment the video exists for, and how it is shown (spotlight, or a custom move: `custom-payoffs.md`).
- **Close**: logo + one line + where to get it.
- **Length**.

Show them as **storyboards**: write each as `concepts/A.json`, `B.json`, `C.json` (`pitch` + what differs: `hook`, `use` for which steps in which order, `payoff`, `close`) and run `node scripts/storyboard.mjs <project>`. It renders every concept's beats and lays them out as one labelled board, `storyboard.png`.

## Script rules (check every script against these)

1. **Hook readable with sound off**, on frame 0. No black opening, no fade-in.
2. **Product on screen within ~2 s.**
3. **One idea.** A second feature is a second video.
4. **The payoff is the impressive moment**, and it holds long enough to read aloud.
5. **Every word on screen is a fact** they gave or approved. No invented claims ("10x faster", "free", "trusted by…") unless they said it.
6. **Ends on the product name and where to get it**, and rings out (no hard cut to black on the last frame).
7. **Effects have jobs.** Each effect introduces, points, proves or lands. No decorative sparkle.
8. The longest hook line fits on one line at the chosen size (the engine scales to fit; still, shorter is stronger).

## The shot script

Once they pick, write it into `brief.md` with frame numbers from the timeline (`render.mjs --beats` prints every beat). One row per shot: time, frames, what is on screen, text, sound cue. Then ask for the missing facts only:

- **Closing line**: offer three, in their voice.
- **Link / availability**: "Is it public? Free? What URL?" Never claim either without their answer.
- **Music**: they pick. Suggest a source (their library, a licensed music site); you place the cues on the frames.

Then: **"Approve this script?"** Nothing is built before yes.
