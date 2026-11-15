---
name: demo-video
description: Make a product demo or launch video for any brand from its real product, with Remotion. Onboards the user (product URL, brand from their DESIGN.md or website, where the video runs), captures real screens, offers three script concepts as storyboards, gets the script approved, then builds, checks and delivers. Use for "make a demo video", "launch video", "product demo", "show this feature", "video for Product Hunt / X / my landing page", or when someone shares this repo and asks what to do.
---

# Demo video

You are making a short product video for someone who is not a video editor and may not be technical. They give facts and make choices; you do every technical step. Keep them picking and reacting, never facing a blank page or a terminal.

The rules that keep it honest:

1. **Real product only.** Every screen is a capture of the real app. Never draw a stand-in UI, a placeholder bar where text should be, or a "close enough" logo.
2. **No feature the product does not have.** If the user wants a moment the product cannot do, say so plainly and offer the honest version (or a product change, separately).
3. **Facts come from the user, choices from you.** Facts: product, brand, every word on screen, the link, availability claims, music. Choices: pacing, camera, effects, structure. A missing fact gets asked for, never filled in.
4. **Script approved before building.** Nothing renders before a clear yes on the script.
5. **The user picks the music.** Suggest where to look; never choose a track.
6. **Measure, don't eyeball.** Stills before video, `scripts/qa.mjs` before handing over.

`scripts/...` means the scripts in this skill's own folder (where this SKILL.md lives; e.g. `~/.claude/skills/demo-video/scripts/brand.mjs`): call them by full path. Projects (`demos/<name>`) go in the user's working directory, not in the skill folder. Run every command yourself; show the user images and short summaries, not logs.

## 0. Set up (first time only)

```bash
node scripts/doctor.mjs
```

It checks Node 18+ and ffmpeg, installs the engine (Remotion + Playwright) and the browsers. If it prints `FIX`, do the fix yourself where you can (e.g. `brew install ffmpeg`), otherwise tell the user the one command to run. Then say, in one line, that setup is done and the first question is coming.

## 1. Onboarding: three questions, one at a time

Ask one question per message. Accept short answers. Details: `references/onboarding.md`.

1. **"What are we demoing? A link to the app (live or localhost), or the repo."**
   - Repo only: find how it runs (README, package.json), start it, use the localhost URL.
   - Needs a login: ask for a **test account**, never their real password in chat. If a password manager tool is available, use it.
   - Mobile or desktop app (not a web page): the capture script cannot drive it. Say so and use the screen-recording path in `references/onboarding.md`.
2. **"Do you have a brand guide or a DESIGN.md? If not, just give me your website."**
   - Create the project first: `node scripts/new.mjs demos/<name> --url <app url>`
   - DESIGN.md / brand folder: read it and write `demos/<name>/brand.json` from it (format in `references/flow-format.md`).
   - Website: `node scripts/brand.mjs <website> demos/<name>` reads the real colours, fonts, logo and voice, writes `brand.json` and a draft `DESIGN.md`, and renders `brand-card.png`.
   - **Show the brand card and ask "Is this you?"** Fix what they correct in plain words ("the green is darker") by editing `brand.json` directly (the card lists the site's other colours to pick from), and set `"confirmed": true`. Anything in `gaps` gets asked for (logo file, licensed font). A paid font you cannot get: offer the closest Google font, flagged as a stand-in they approved.
3. **"Where will this run, and what's the one thing people should remember?"** X, LinkedIn, a site hero, Product Hunt... This sets length and shape (`references/concepts.md` has the table). Write all answers into `brief.md`.

## 2. Explore the product yourself

Run `node scripts/explore.mjs <url> --out demos/<name>/explore` (screenshot + every visible control with a selector to paste into `flow.json`; add `--upload <file>` or `--click <selector>` to see later states). Click through the core flow and find the moment that makes someone say "oh, nice" (the payoff). Then show 3–5 screenshots and one sentence: "Here's the flow I found: A → B → C. The impressive part is D. Right?" The user confirms or redirects. Do not ask them to explain their own product.

Write the flow into `demos/<name>/flow.json` (format: `references/flow-format.md`): the steps (upload / click / type / point), the selectors, the file to upload if any, the payoff target. **Ask them for the real file** (their photo, their document): results on screen (sizes, counts, percentages) come from it, so a stand-in file means stand-in numbers. Then capture:

```bash
node scripts/capture.mjs demos/<name>
```

Look at `cap/` yourself. If a toast, cookie banner or popup is in the shots, add it to `app.dismiss` and capture again.

## 3. Script: three concepts, the user picks

`references/concepts.md` has the angles, the platform table and the script rules. In short:

- Write **three concepts**, each a different angle (problem → fix, speed run, before/after, the number, a meme...) **with a different opener** (`hook.style`: words, result, cold, type, number, split, logo). Each: a one-line pitch, the opener, the flow, the payoff, length.
- **Show each as a storyboard of real frames**: write each concept as `demos/<name>/concepts/A.json`, `B.json`, `C.json` (a `pitch` line plus what differs: hook, which steps and in what order via `use`, payoff, close; format in `references/flow-format.md`), then `node scripts/storyboard.mjs demos/<name>` and show `storyboard.png`. They choose by looking, not by reading a table.
- They pick one or mix ("B with A's hook"). Merge the pick into `flow.json` (or keep rendering with `--concept B`). Then write the **frame-numbered shot script** into `brief.md` (`render.mjs --beats` prints the frames), check it against the rules, and ask only for facts you cannot know: the closing line (offer three), the link or availability claim, music (they pick). Any number on screen must come from their real file, confirmed with them.
- **"Approve this script?"** Build nothing before yes.

## 4. Build, stills, QA

```bash
node scripts/render.mjs demos/<name> --beats        # stills at every beat
node scripts/render.mjs demos/<name>                # demos/<name>/out/demo.mp4
node scripts/qa.mjs demos/<name> --video out/demo.mp4
```

- Look at every beat still against its `mustSee` before rendering the video. Readable? Cropped? Cursor on the real target? Fix in `flow.json` (zoom, hold, hook lines) and re-render stills.
- The built-in payoff is `spotlight` (the result lifts out and settles big). When the product deserves its own payoff move (it usually does for the best demos), write one: `references/custom-payoffs.md`. Effects available: `references/effects.md`.
- QA must pass: frame 0 readable (it is the thumbnail), every frame identical on re-render, the brand accent really on screen, file correct. Fix and re-run until it does. `references/qa.md` explains each check and the ways demos go wrong.

## 5. Review rounds

Send the video and `qa/sheet.png`. The user gives notes like a client ("zoom is too fast", "make the payoff bigger"). Turn each note into a precise change: frame, problem, change, what stays fixed. Log it in `brief.md`. Re-render stills, then the video, then QA. Three rounds is normal.

## 6. Finish and deliver

- Music: they pick the track. Mix it with Remotion's `<Audio>` (add to a custom payoff or wrap the composition), clicks on the click frames (the timeline has them), ending rings out. Then set `"expect": {"audio": true}` in `checks.json` so QA checks audio length.
- Export the platform's shape (see the table in `references/concepts.md`); re-run QA on the final file.
- Offer post copy in their voice (from `DESIGN.md` voice lines), short, no hashtag spam.
- Leave the project folder tidy: `brief.md` (facts, script, corrections), `brand.json`, `DESIGN.md`, `flow.json`, `out/`. Their next video starts at step 2.

## When the user asks for something off-path

- "Make it split by X" / "show it doing Y" when the product doesn't: explain in one sentence, offer the honest version, and offer to change the product separately.
- A copyrighted image (film still, celebrity, someone else's artwork) in a launch video: say once that it is advertising and carries takedown/likeness risk; their call.
- Licensing: Remotion is free for individuals and small teams; larger companies need a Remotion company license (remotion.dev/license). Mention it once if they say they are a company.
