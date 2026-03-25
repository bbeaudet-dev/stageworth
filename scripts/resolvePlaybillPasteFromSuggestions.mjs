/**
 * Merges playbill-show-match-suggestions.json into convex-paste-playbill-productions.json.
 *
 * Run: node scripts/resolvePlaybillPasteFromSuggestions.mjs
 *
 * Writes:
 *   - data/convex-paste-playbill-productions-resolved.json → seed:applyPlaybillProductionPaste
 *   - data/convex-bulk-create-shows-paste.json → seed:bulkFindOrCreateShows (only titles with no strong DB match)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const THRESHOLD = 0.88;

/** Do not auto-rename paste → DB: fuzzy score is misleading for these titles. */
const NEVER_AUTO_RENAME = new Set([
  "The Fever", // normalizes to "fever" → false hit on Saturday Night Fever
  "Hamlet", // matches "I Hate Hamlet"; real run is likely Shakespeare
  "Monte Cristo", // DB may have "Monte Cristo Jr." — different adaptation
  "A Woman Among Women", // not "The Women"
  "Cats: The Jellicle Ball", // same franchise as Cats but distinct billing — confirm before merging
]);

function guessType(name) {
  const n = name.toLowerCase();
  if (
    /\bmusical\b/.test(n) ||
    /\bparody\b/.test(n) ||
    /singfeld|friends!|gazillion bubble|little shop|heathers|gotta dance|pinkalicious|grandparents fell in love/i.test(
      n
    )
  ) {
    return "musical";
  }
  // Titles that are musicals but don’t say “musical” in the name
  if (
    /^(wicked|ragtime)$/i.test(name.trim()) ||
    /\blion king\b/i.test(n) ||
    /\bbuena vista social club\b/i.test(n) ||
    /^just in time$/i.test(name.trim()) ||
    /\bmexodus\b/i.test(n)
  ) {
    return "musical";
  }
  return "play";
}

const suggestions = JSON.parse(
  fs.readFileSync(path.join(root, "data/playbill-show-match-suggestions.json"), "utf8")
);
const byQuery = new Map(suggestions.map((s) => [s.query, s]));

const paste = JSON.parse(
  fs.readFileSync(path.join(root, "data/convex-paste-playbill-productions.json"), "utf8")
);

const needCreate = new Map();
const resolvedItems = paste.items.map((item) => {
  const s = byQuery.get(item.showName);
  if (!s) {
    needCreate.set(item.showName, guessType(item.showName));
    return { ...item };
  }
  if (
    !NEVER_AUTO_RENAME.has(item.showName) &&
    s.bestScore >= THRESHOLD &&
    s.bestMatchName
  ) {
    return { ...item, showName: s.bestMatchName };
  }
  needCreate.set(item.showName, guessType(item.showName));
  return { ...item };
});

const entries = [...needCreate.entries()].map(([name, type]) => ({ name, type }));

fs.writeFileSync(
  path.join(root, "data/convex-paste-playbill-productions-resolved.json"),
  JSON.stringify({ items: resolvedItems }, null, 2)
);
fs.writeFileSync(
  path.join(root, "data/convex-bulk-create-shows-paste.json"),
  JSON.stringify({ entries }, null, 2)
);

console.log({
  threshold: THRESHOLD,
  totalPasteItems: resolvedItems.length,
  uniqueShowsToCreate: entries.length,
  resolvedPaste: "data/convex-paste-playbill-productions-resolved.json",
  bulkCreate: "data/convex-bulk-create-shows-paste.json",
});
