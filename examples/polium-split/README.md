# Example: Polium Split launch demo

Polium Split cuts one photo into a seamless X carousel (up to 20 frames). This is the 15-second launch demo made with this repo. Polium Split itself is not included here: the flow shows the format, and you can point it at your own app.

## Brief

| Fact | Value |
|---|---|
| Product | Polium Split, a web app (localhost) |
| Brand | read from the app: bg #0C0B0F, text #FFFFFF, accent #ECFB77, Right Grotesk Wide, Polium logo |
| Runs on | X, 1920×1080, 15 s, sound-off first |
| The one thing | one photo becomes a seamless carousel |
| Closing line | "one photo. one seamless carousel." |

**Concept picked:** speed run. The other two were "problem → fix" (X's ugly crop vs the seamless carousel) and a meme version.

## Script (30 fps)

| Shot | Frames | On screen |
|---|---|---|
| Hook | 0–47 | "one photo." → "twenty frames." → "zero seams." (accent on the last), hard cuts every 16 frames. Frame 0 readable as the thumbnail. |
| Drop | 48–103 | The real photo dragged in from off-screen, dropped on the real drop zone. |
| Frames | 104–211 | Camera punches in on +, 17 fast clicks (3 → 20), pulls back so the preview re-cuts live. |
| Gaps | 212–263 | Hand-drawn circle around "hide X's 4 px gaps", the differentiator. |
| Download | 264–309 | Click DOWNLOAD 20 FRAMES. |
| Payoff | 310–397 | Push cut. Cut lines run down the photo, 20 strips pull forward like books off a shelf, then slot into the app's real X-post preview with no jump across the gaps (`payoff.type: "split"`, `engine/src/payoffs/split.tsx`). |
| Close | 398–457 | Polium logo + closing line, rings out. |

## What the review rounds changed

- Frame 0 read as "black" to the first QA version: white text on a near-black brand. The check now fails only flat or near-empty frames, and the hook text got bigger (a better thumbnail anyway).
- A stray corner of the photo card showed at f48: the drag now starts fully off-screen.
- The overview cut the header in half: content edges near the screen edge now snap to it.
- The user asked for strips "split by the size of the book". The app cuts equal widths, so the demo shows equal widths and the product change was offered separately. Rule: never show a feature the product doesn't have.
