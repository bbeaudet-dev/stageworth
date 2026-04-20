/**
 * Back-fills productions lacking `playbillProductionId` by searching Playbill
 * for matching production pages and staging high-confidence mappings as
 * pending reviewQueue entries for admin approval.
 *
 * This is the long-missing half of the Playbill enrichment pipeline: without
 * the ID, none of the meta/description/date scrape work runs for historical
 * productions. One-time per production — once approved, stays mapped.
 *
 * Flow:
 *   1. GET  {CONVEX_URL}/playbill/mapping-queue     — productions missing IDs
 *   2. For each, query Playbill's Algolia index (section:Shows) for candidates
 *   3. Score each candidate by normalized name + venue + opening year overlap
 *   4. Stage top candidate via reviewQueue (note carries confidence + alternates)
 *   5. POST {CONVEX_URL}/playbill/mapping-findings
 *
 * Note on the search endpoint: playbill.com/searchpage/search is an empty
 * Algolia-driven SPA shell, so there is no HTML to scrape. The client bundle
 * exposes public, search-only credentials (app `QCDH3SSWM9`, index
 * `playbillcraft-beta`), so we hit the same Algolia API directly and get
 * structured hits with venueName, openingYear, and teaser in one shot.
 *
 * Usage:
 *   bun scripts/mapPlaybillProductions.mjs
 *   bun scripts/mapPlaybillProductions.mjs --dry-run
 *   bun scripts/mapPlaybillProductions.mjs --limit 10
 *   bun scripts/mapPlaybillProductions.mjs --min-confidence 0.6
 *
 * Required env vars:
 *   CONVEX_URL        Convex deployment base URL
 *   PLAYBILL_SECRET   Shared secret for /playbill/* HTTP endpoints
 */

import { env } from "node:process";

// ─── CLI flags ────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  const raw = idx !== -1 ? process.argv[idx + 1] : null;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return isNaN(parsed) ? null : parsed;
})();

/** Candidates below this score are not staged (too speculative to waste admin time). */
const MIN_CONFIDENCE = (() => {
  const idx = process.argv.indexOf("--min-confidence");
  const raw = idx !== -1 ? process.argv[idx + 1] : null;
  const parsed = raw ? parseFloat(raw) : NaN;
  return isNaN(parsed) ? 0.5 : parsed;
})();

// ─── Config ───────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 1500;

// Algolia public search-only credentials, lifted from playbill.com's own
// frontend JS bundle (assets/js/search.js). These are the same keys the site
// ships to every browser — not privileged — but we still identify ourselves.
const ALGOLIA_APP_ID = "QCDH3SSWM9";
const ALGOLIA_API_KEY = "cb114466ef2ba94687598379d6761ca8";
const ALGOLIA_INDEX = "playbillcraft-beta";
const ALGOLIA_SEARCH_URL = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

const USER_AGENT =
  "stageworth-enrichment-bot/1.0 (+https://github.com/benbeau/stageworth)";

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function warn(msg) {
  console.warn(`[${new Date().toISOString()}] WARN  ${msg}`);
}

// ─── Env validation ───────────────────────────────────────────────────────────

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    console.error(`[error] Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const CONVEX_URL = requireEnv("CONVEX_URL").replace(/\/$/, "");
const PLAYBILL_SECRET = requireEnv("PLAYBILL_SECRET");

// ─── Convex API helpers ───────────────────────────────────────────────────────

async function fetchMappingQueue() {
  const res = await fetch(`${CONVEX_URL}/playbill/mapping-queue`, {
    headers: { Authorization: `Bearer ${PLAYBILL_SECRET}` },
  });
  if (!res.ok) {
    throw new Error(
      `GET /playbill/mapping-queue → HTTP ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

async function postMappingFindings(findings) {
  if (DRY_RUN) {
    log(`[dry-run] Would POST ${findings.length} mapping(s) — skipping write`);
    for (const f of findings) {
      log(
        `  [dry-run]  production:${f.productionId} → ${f.playbillProductionId} (conf=${f.confidence.toFixed(2)})`
      );
    }
    return { created: findings.length, skipped: 0 };
  }
  const res = await fetch(`${CONVEX_URL}/playbill/mapping-findings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PLAYBILL_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ findings }),
  });
  if (!res.ok) {
    throw new Error(
      `POST /playbill/mapping-findings → HTTP ${res.status}: ${await res.text()}`
    );
  }
  return res.json();
}

// ─── Playbill search (Algolia) ────────────────────────────────────────────────

/**
 * Query Playbill's Algolia index for show candidates.
 *
 * Returns structured candidates with slug, title, venue, and opening year so
 * the scorer can compare real fields instead of regexing a context blob.
 */
async function searchAlgolia(query) {
  const res = await fetch(ALGOLIA_SEARCH_URL, {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      query,
      hitsPerPage: 10,
      filters: "section:Shows",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Algolia query for "${query}" → HTTP ${res.status} ${res.statusText}`
    );
  }
  const data = await res.json();
  return (data.hits || [])
    .map(hitToCandidate)
    .filter((c) => c && c.slug);
}

function hitToCandidate(hit) {
  if (!hit || typeof hit.uri !== "string") return null;
  // hit.uri is "production/{slug}" — strip the prefix to match how the rest
  // of the pipeline stores playbillProductionId.
  const slug = hit.uri.replace(/^production\//, "").trim();
  if (!slug || slug.length > 120) return null;

  const openingYear = pickYear(hit.openingYear, hit.openDate);
  const closingYear = pickYear(null, hit.closeDate);

  return {
    slug,
    title: (hit.title || "").trim(),
    venueName: (hit.venueName || "").trim(),
    venueType: (hit.venueType || "").trim().toLowerCase(),
    openingYear,
    closingYear,
    teaser: stripTags(hit.teaser || ""),
  };
}

function pickYear(explicit, isoDate) {
  if (typeof explicit === "number" && explicit >= 1850 && explicit <= 2100) {
    return explicit;
  }
  if (typeof isoDate === "string") {
    const m = isoDate.match(/(\d{4})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 1850 && y <= 2100) return y;
    }
  }
  return null;
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Aggressive normalization for name comparison — strips articles + punctuation. */
function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light normalization for theatre comparison — keep discriminators, drop fluff. */
function normalizeTheatre(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\b(theatre|theater|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYears(str) {
  const years = str.match(/\b(19\d{2}|20\d{2})\b/g);
  return years ? years.map((y) => parseInt(y, 10)) : [];
}

/**
 * Score a candidate 0..1 against a production's name + theatre + opening
 * year. Weighting:
 *   - 0.7 name match (exact normalized = 1.0, contains = 0.6, word overlap scaled)
 *   - 0.2 theatre match (exact normalized = 1.0, contains = 0.5)
 *   - 0.1 year overlap (within ±2 years of opening/closing = 1.0)
 *
 * Fields come straight from Algolia hits; when venue/year are missing on the
 * hit we fall back to searching the slug (which usually encodes theatre-year).
 */
function scoreCandidate(candidate, target) {
  const nameScore = scoreName(candidate.title || candidate.slug, target.showName);

  const theatreHaystack = [candidate.venueName, candidate.slug]
    .filter(Boolean)
    .join(" ");
  const theatreScore = target.theatre
    ? scoreTheatre(theatreHaystack, target.theatre)
    : 0.5;

  const yearScore = scoreYear(candidate, target);

  return 0.7 * nameScore + 0.2 * theatreScore + 0.1 * yearScore;
}

function scoreName(candidateText, showName) {
  const a = normalizeName(candidateText);
  const b = normalizeName(showName);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));

  if (a.includes(b) || b.includes(a)) {
    // Partial containment, boost if most significant words overlap.
    const overlap = [...bTokens].filter((t) => aTokens.has(t)).length;
    return 0.6 + 0.3 * (overlap / Math.max(bTokens.size, 1));
  }

  const intersection = [...bTokens].filter((t) => aTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union > 0 ? intersection / union : 0;
}

function scoreTheatre(contextText, theatre) {
  const a = normalizeTheatre(contextText);
  const b = normalizeTheatre(theatre);
  if (!a || !b) return 0;
  if (a.includes(b)) return 1;
  const bTokens = b.split(" ").filter((t) => t.length > 2);
  if (bTokens.length === 0) return 0;
  const hits = bTokens.filter((t) => a.includes(t)).length;
  return hits / bTokens.length;
}

function scoreYear(candidate, target) {
  const candidateYears = [candidate.openingYear, candidate.closingYear]
    .filter((y) => typeof y === "number")
    .concat(extractYears(candidate.slug));

  // Deduped and sanity-bounded.
  const uniqueYears = [...new Set(candidateYears)].filter(
    (y) => y >= 1850 && y <= 2100
  );

  if (uniqueYears.length === 0) return 0.5;

  const targetYears = [target.previewDate, target.openingDate, target.closingDate]
    .filter(Boolean)
    .map((d) => parseInt(d.slice(0, 4), 10))
    .filter((y) => !isNaN(y));

  if (targetYears.length === 0) return 0.5;

  const minT = Math.min(...targetYears);
  const maxT = Math.max(...targetYears);

  for (const y of uniqueYears) {
    if (y >= minT - 1 && y <= maxT + 1) return 1;
  }
  const closest = Math.min(
    ...uniqueYears.map((y) => Math.min(Math.abs(y - minT), Math.abs(y - maxT)))
  );
  if (closest <= 3) return 0.5;
  return 0;
}

// ─── Per-production match ─────────────────────────────────────────────────────

async function matchProduction(target) {
  log(`Searching: "${target.showName}" (${target.theatre ?? "no theatre"})`);

  let candidates;
  try {
    candidates = await searchAlgolia(target.showName);
  } catch (err) {
    warn(`  Search failed: ${err.message}`);
    return null;
  }

  if (candidates.length === 0) {
    log(`  → no Shows-section hits`);
    return null;
  }

  const scored = candidates
    .map((c) => ({ ...c, score: scoreCandidate(c, target) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  // Gap requirement avoids staging ambiguous matches where #1 and #2 are
  // basically tied (e.g. a show with multiple Broadway revivals).
  const gap = top.score - (second?.score ?? 0);
  const confident = top.score >= MIN_CONFIDENCE && (scored.length === 1 || gap >= 0.1);

  const topLabel = formatCandidate(top);
  log(
    `  → top: ${topLabel} score=${top.score.toFixed(2)}` +
      (second ? ` (next=${second.score.toFixed(2)})` : "") +
      ` ${confident ? "[confident]" : "[skip]"}`
  );

  if (!confident) return null;

  const alternateIds = scored
    .slice(1, 4)
    .filter((c) => c.score >= MIN_CONFIDENCE * 0.7)
    .map((c) => c.slug);

  return {
    productionId: target.productionId,
    playbillProductionId: top.slug,
    confidence: top.score,
    alternateIds: alternateIds.length > 0 ? alternateIds : undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCandidate(c) {
  const bits = [`"${c.title || c.slug}"`];
  if (c.venueName) bits.push(c.venueName);
  if (c.openingYear) bits.push(String(c.openingYear));
  return bits.join(" · ");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) log("DRY RUN — Convex will not be written to");
  log(`Min confidence threshold: ${MIN_CONFIDENCE}`);

  log("Fetching mapping queue from Convex…");
  let queue;
  try {
    queue = await fetchMappingQueue();
  } catch (err) {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  }

  if (queue.length === 0) {
    log("Mapping queue is empty — every production has a playbillProductionId.");
    process.exit(0);
  }

  if (LIMIT !== null && LIMIT < queue.length) {
    log(`Limiting to first ${LIMIT} of ${queue.length} production(s)`);
    queue = queue.slice(0, LIMIT);
  } else {
    log(`${queue.length} production(s) to map`);
  }

  const findings = [];
  for (let i = 0; i < queue.length; i++) {
    if (i > 0) await sleep(RATE_LIMIT_MS);
    try {
      const finding = await matchProduction(queue[i]);
      if (finding) findings.push(finding);
    } catch (err) {
      warn(`  Unhandled error matching "${queue[i].showName}": ${err.message}`);
    }
  }

  if (findings.length === 0) {
    log("Scanning complete — no confident mappings to stage.");
    process.exit(0);
  }

  log(`Submitting ${findings.length} mapping(s) to Convex…`);
  try {
    const result = await postMappingFindings(findings);
    log(`Done. created=${result.created} skipped=${result.skipped}`);
  } catch (err) {
    console.error(`[error] Failed to submit mappings: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
