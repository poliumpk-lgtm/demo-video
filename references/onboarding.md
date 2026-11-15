# Onboarding

Goal: everything needed to build, in about two minutes of the user's time. One question per message, plain words, no jargon.

## The three questions

**1. "What are we demoing? A link to the app (live or localhost), or the repo."**

| They give | You do |
|---|---|
| A live URL | Use it. Check it loads without a login (open it with Playwright). |
| localhost | Use it. If it is not running, ask how they start it, or find it (README, `package.json` scripts) and start it yourself. |
| A repo | Read the README, install, run it, use the localhost URL. |
| Needs a login | Ask them to use a test account. Run `node scripts/login.mjs <project>`: a browser window opens, **they** sign in, close it, and the session is saved to `<project>/auth.json` for capture. Never ask for a password in chat. Keep `auth.json` out of git. |
| Mobile / desktop app | The capture script drives web pages only. Ask for a screen recording (QuickTime / Xcode simulator / Android emulator, 60 fps, the flow done slowly, once). Extract the states with ffmpeg at the frames where each action lands, save them as `cap/start.png`, `cap/s0-0.png`... and write `cap/rects.json` by hand from the frames (target rectangles in recording pixels / scale). Then everything else works the same. |

**2. "Do you have a brand guide or a DESIGN.md? If not, just give me your website."**

| They give | You do |
|---|---|
| DESIGN.md / brand guide / brand folder | Read it. Write `brand.json` from it (colours, fonts with files, logo file). Copy fonts and logo into the project's `brand/`. |
| Figma | Ask for an export of the logo (SVG) and the colour/type styles; or fall back to the website. |
| A website | `node scripts/brand.mjs <url> <project>` |
| Nothing at all | Use the app itself as the website (its UI is the brand). |

`brand.mjs` reads what the site actually renders: the page background, the main text colour, the accent (from buttons and links), the fonts the page loads (and their files), the logo (header image, inline SVG, or a screenshot when the logo is drawn with CSS), and voice lines from the headlines and meta description. It never guesses: what it cannot find goes into `gaps`.

Then show `brand-card.png` and ask **"Is this you?"** Common corrections:

- Wrong accent (the site's buttons use a secondary colour): ask which colour is "theirs", update `colors.accent`.
- Logo is a screenshot or the site icon: ask for an SVG. It still works without one.
- Font not downloadable (licensed, or Google Fonts CSS): if it is a Google font, add it with `@remotion/google-fonts` in a custom payoff or ask for the file; if it is licensed, ask for the file or agree a close Google font, noted as a stand-in in `brief.md`.

Set `"confirmed": true` when they say yes. Save `DESIGN.md` in the project (and offer to copy it into their repo: the next tool that asks for a brand will find it).

**3. "Where will this run, and what's the one thing people should remember?"**

The answer picks length, aspect and pace (table in `concepts.md`). The "one thing" becomes the payoff. If they say three things, ask which one matters most; the others can be a second video.

## After onboarding, write `brief.md`

Fill the facts table. Anything still missing is listed as needed, with who provides it. Status: `exploring`.

## Tone

- Say what you are doing in one line, then do it. Show images, not logs.
- When something fails, fix it; tell them only what they need to do (and the exact command, if it is theirs to run).
- Never make them choose between technical options. Make the call, mention it.
