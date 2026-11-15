#!/usr/bin/env node
// Start a demo project: a plain folder of files the engine renders.
//
//   node scripts/new.mjs <projectDir> [--url http://localhost:3000]
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dir = path.resolve(args[0] || "");
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:3000";
if (!args[0]) {
  console.error("usage: node scripts/new.mjs <projectDir> [--url <app url>]");
  process.exit(2);
}
if (fs.existsSync(path.join(dir, "flow.json"))) {
  console.error(`${dir} already has a flow.json: not overwriting`);
  process.exit(1);
}
fs.mkdirSync(path.join(dir, "assets"), { recursive: true });

const flow = {
  format: { width: 1920, height: 1080, fps: 30 },
  app: { url, viewport: [1280, 720] },
  hook: { lines: ["first line.", "second line.", "the payoff line."] },
  steps: [
    { id: "example-click", do: "click", target: "button", times: 1 },
  ],
  payoff: { type: "spotlight", target: "main" },
  close: { line: "one line that says what it does.", url: "" },
};
fs.writeFileSync(path.join(dir, "flow.json"), JSON.stringify(flow, null, 2) + "\n");

fs.writeFileSync(
  path.join(dir, "brief.md"),
  `# Brief

Status: onboarding

## Facts (from the user, never invented)
| Fact | Value | Status |
|---|---|---|
| Product + where it runs | ${url} | |
| Brand | brand.json (confirmed: no) | |
| Where the video runs | | |
| The one thing viewers remember | | |
| Closing line | | |
| Link / availability claim | | |
| Music | user picks | |

## Concepts shown
(three concepts, the user's pick and any mix)

## Shot script
(frame-numbered, approved before building)

## Corrections log
(location · problem · change · what stays fixed)
`
);
console.log(`project → ${dir}
next:
  node scripts/brand.mjs <their website> ${path.relative(process.cwd(), dir) || "."}
  edit flow.json (steps, hook, payoff, close), then
  node scripts/capture.mjs ${path.relative(process.cwd(), dir) || "."}`);
