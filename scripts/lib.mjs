// Shared helpers for the scripts. Everything resolves from the engine's own node_modules,
// so the scripts need no install of their own.
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ENGINE = path.join(ROOT, "engine");

export const engineRequire = (mod) => {
  if (!fs.existsSync(path.join(ENGINE, "node_modules"))) {
    console.error("The engine is not installed yet. Run: node scripts/doctor.mjs");
    process.exit(2);
  }
  return createRequire(path.join(ENGINE, "package.json"))(mod);
};

export const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback);

// Remotion keeps its browser in <cwd>/.remotion: run from the repo root so it downloads once.
export const fromRoot = () => process.chdir(ROOT);

// A concept = concepts/<name>.json, a partial flow merged over flow.json:
// { "hook": {...}, "payoff": {...}, "close": {...}, "use": ["stepId", ...] }.
// "use" picks and orders captured steps by id, so concepts can tell different stories
// from one capture.
export const applyConcept = (flow, cap, concept) => {
  if (!concept) return { flow, cap };
  const merged = { ...flow, ...concept, app: flow.app, format: { ...flow.format, ...(concept.format || {}) } };
  delete merged.use;
  if (!concept.use) return { flow: merged, cap };
  const idx = concept.use.map((id) => {
    const i = flow.steps.findIndex((s, k) => (s.id || `s${k}`) === id);
    if (i < 0) throw new Error(`concept uses step "${id}" which is not in flow.json`);
    return i;
  });
  // Captured file names stay per original step index: remap through "shotIndex".
  return {
    flow: { ...merged, steps: idx.map((i) => flow.steps[i]) },
    cap: { ...cap, steps: idx.map((i) => ({ ...cap.steps[i], shotIndex: i })) },
  };
};

// Everything the engine needs to render one project, passed as Remotion input props.
export const projectProps = (project, conceptName) => {
  const brand = readJson(path.join(project, "brand.json"), null);
  const baseFlow = readJson(path.join(project, "flow.json"), null);
  const baseCap = readJson(path.join(project, "cap", "rects.json"), null);
  const concept = conceptName ? readJson(path.join(project, "concepts", `${conceptName}.json`), null) : null;
  if (conceptName && !concept) throw new Error(`no concepts/${conceptName}.json in ${project}`);
  const { flow, cap } = baseFlow && baseCap ? applyConcept(baseFlow, baseCap, concept) : { flow: baseFlow, cap: baseCap };
  if (!brand) throw new Error(`no brand.json in ${project}: run scripts/brand.mjs first`);
  if (!flow) throw new Error(`no flow.json in ${project}`);
  if (!cap) throw new Error(`no cap/rects.json in ${project}: run scripts/capture.mjs first`);
  return { brand, flow, cap };
};
