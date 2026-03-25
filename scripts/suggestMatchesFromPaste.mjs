/**
 * Calls Convex seed:suggestShowMatchesForNames for every showName in the Playbill paste file.
 *
 * Usage:
 *   node scripts/suggestMatchesFromPaste.mjs
 *   node scripts/suggestMatchesFromPaste.mjs path/to/other.json
 *
 * Writes: data/playbill-show-match-suggestions.json
 * Requires: npx convex linked to the deployment you care about.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const pastePath =
  process.argv[2] ||
  path.join(root, "data/convex-paste-playbill-productions.json");
const outPath = path.join(root, "data/playbill-show-match-suggestions.json");

const paste = JSON.parse(fs.readFileSync(pastePath, "utf8"));
const names = [...new Set(paste.items.map((i) => i.showName))];

function parseConvexArray(stdout) {
  const raw = stdout.trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("no JSON array in stdout");
  return JSON.parse(raw.slice(start, end + 1));
}

const BATCH = 20;
const parsed = [];
for (let i = 0; i < names.length; i += BATCH) {
  const chunk = names.slice(i, i + BATCH);
  const payload = JSON.stringify({ names: chunk, limitPerName: 8 });
  const result = spawnSync(
    "npx",
    ["convex", "run", "seed:suggestShowMatchesForNames", payload],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env },
    }
  );
  if (result.stderr) {
    const err = result.stderr.trim();
    if (err && !err.includes("npm warn")) console.error(err);
  }
  if (result.status !== 0) {
    console.error(result.stdout);
    process.exit(result.status ?? 1);
  }
  try {
    parsed.push(...parseConvexArray(result.stdout));
  } catch (e) {
    console.error(e.message, result.stdout.slice(0, 2000));
    process.exit(1);
  }
}

const summary = parsed.map((row) => {
  const best = row.matches[0];
  const likelyExact = best && best.score >= 0.999;
  return {
    query: row.query,
    normalizedQuery: row.normalizedQuery,
    bestScore: best?.score ?? 0,
    bestMatchName: best?.name,
    bestMatchId: best?.showId,
    likelyAliasFix: likelyExact ? null : best && best.score >= 0.88 ? best.name : null,
    topMatches: row.matches,
  };
});

fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`Wrote ${outPath} (${summary.length} names).`);
console.log(
  "Tip: open the file; if bestScore ≥ ~0.88, set paste item showName to bestMatchName and re-run applyPlaybillProductionPaste."
);
console.log(
  "If bestScore is low, add the show with seed:bulkFindOrCreateShows (musical vs play per title)."
);
