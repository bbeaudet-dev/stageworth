/**
 * Show-level description backfill.
 *
 * Walks every show in the DB that's missing a `description`, queries Playbill's
 * Algolia index by name, picks the best-matching show page (preferring the
 * generic, venue-less canonical entry), and stages the teaser/synopsis as a
 * `description` finding in the review queue for admin approval.
 *
 * Unlike `mapPlaybillProductions.mjs`, this path does NOT require a production
 * to exist on the show — it works directly against the `shows` table. For the
 * majority of titles, the generic Playbill entry (`production/{slug}`) has a
 * filled-in `teaser` field that reads like a marketing blurb suitable for the
 * Show Detail hero.
 *
 * Flow:
 *   1. GET  {CONVEX_URL}/playbill/shows-needing-descriptions
 *   2. For each show, query Algolia (section:Shows) for candidates
 *   3. Score by normalized name + bonus for canonical (venue-less) entries
 *   4. Pick teaser (preferred) or synopsis, stripped of HTML
 *   5. POST {CONVEX_URL}/playbill/findings with entityType="show", field="description"
 *
 * Usage:
 *   bun scripts/fetchPlaybillDescriptions.mjs --dry-run
 *   bun scripts/fetchPlaybillDescriptions.mjs --limit 50
 *   bun scripts/fetchPlaybillDescriptions.mjs --min-confidence 0.7
 *   bun scripts/fetchPlaybillDescriptions.mjs --prefer synopsis
 *
 * Required env vars:
 *   CONVEX_URL        Convex deployment base URL (https://*.convex.site)
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

/** Name-score threshold below which we don't even stage a finding. */
const MIN_CONFIDENCE = (() => {
  const idx = process.argv.indexOf("--min-confidence");
  const raw = idx !== -1 ? process.argv[idx + 1] : null;
  const parsed = raw ? parseFloat(raw) : NaN;
  return isNaN(parsed) ? 0.6 : parsed;
})();

/** Which Algolia field drives the description: "teaser" (marketing) or "synopsis" (plot). */
const PREFER = (() => {
  const idx = process.argv.indexOf("--prefer");
  const raw = idx !== -1 ? process.argv[idx + 1] : null;
  if (raw === "synopsis" || raw === "teaser") return raw;
  return "teaser";
})();

// ─── Config ───────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 600;

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
  console.warn(`[${new Date().toISOString()}] WARN    ${msg}`);
}

// ─── Env ──────────────────────────────────────────────────────────────────────

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

// ─── Convex helpers ───────────────────────────────────────────────────────────

async function fetchShowsNeedingDescriptions() {
  const res = await fetch(`${CONVEX_URL}/playbill/shows-needing-descriptions`, {
    headers: { Authorization: `Bearer ${PLAYBILL_SECRET}` },
  });
  if (!res.ok) {
    throw new Error(
      `GET /playbill/shows-needing-descriptions → HTTP ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

async function postFindings(findings) {
  if (DRY_RUN) {
    log(`[dry-run] Would POST ${findings.length} finding(s) — skipping write`);
    for (const f of findings) {
      const preview = f.value.length > 90 ? `${f.value.slice(0, 90)}…` : f.value;
      log(`  [dry-run]  show:${f.entityId}  "${preview}"`);
    }
    return { created: findings.length, skipped: 0 };
  }
  const res = await fetch(`${CONVEX_URL}/playbill/findings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PLAYBILL_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ findings }),
  });
  if (!res.ok) {
    throw new Error(
      `POST /playbill/findings → HTTP ${res.status}: ${await res.text()}`
    );
  }
  return res.json();
}

// ─── Algolia ──────────────────────────────────────────────────────────────────

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
      hitsPerPage: 8,
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
  const slug = hit.uri.replace(/^production\//, "").trim();
  if (!slug || slug.length > 200) return null;
  return {
    slug,
    title: (hit.title || "").trim(),
    venueName: (hit.venueName || "").trim() || null,
    openingYear:
      typeof hit.openingYear === "number" ? hit.openingYear : null,
    teaser: cleanText(hit.teaser),
    synopsis: cleanText(hit.synopsis),
  };
}

function cleanText(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<br\s*\/?>(?=\s*<br)/gi, "\n\n")
    .replace(/<br\s*\/?>(?!\s*<br)/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function normalizeName(s) {
  return (s || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreName(candidateText, showName) {
  const a = normalizeName(candidateText);
  const b = normalizeName(showName);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));

  if (a.includes(b) || b.includes(a)) {
    const overlap = [...bTokens].filter((t) => aTokens.has(t)).length;
    return 0.7 + 0.25 * (overlap / Math.max(bTokens.size, 1));
  }

  const intersection = [...bTokens].filter((t) => aTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Score a candidate for being the show-canonical page.
 * - Name match drives most of it.
 * - +0.15 bonus if the slug equals the normalized name exactly ("hadestown"
 *   vs "hadestownwalter-kerr-theatre-2018-2019"), since those are the
 *   generic show-level pages with marketing teasers.
 * - +0.05 bonus if venueName is null — also a signal of a canonical entry.
 */
function scoreCandidate(candidate, show) {
  const nameScore = scoreName(candidate.title || candidate.slug, show.name);
  const normalizedShow = normalizeName(show.name).replace(/ /g, "-");
  const slugLooksCanonical = candidate.slug === normalizedShow;
  const canonicalBonus = slugLooksCanonical ? 0.15 : 0;
  const venuelessBonus = !candidate.venueName ? 0.05 : 0;
  return Math.min(1, nameScore + canonicalBonus + venuelessBonus);
}

// ─── Per-show match ───────────────────────────────────────────────────────────

async function describeShow(show) {
  log(`Searching: "${show.name}"`);

  let candidates;
  try {
    candidates = await searchAlgolia(show.name);
  } catch (err) {
    warn(`  Search failed: ${err.message}`);
    return null;
  }

  if (candidates.length === 0) {
    log(`  → no Shows-section hits`);
    return null;
  }

  // Only keep candidates that actually have description text we'd want.
  const usable = candidates.filter(
    (c) => (c.teaser && c.teaser.length > 40) || (c.synopsis && c.synopsis.length > 40)
  );
  if (usable.length === 0) {
    log(`  → candidates found but none had teaser/synopsis text`);
    return null;
  }

  const scored = usable
    .map((c) => ({ ...c, score: scoreCandidate(c, show) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top.score < MIN_CONFIDENCE) {
    log(
      `  → top: "${top.title}" score=${top.score.toFixed(2)} [below threshold ${MIN_CONFIDENCE}]`
    );
    return null;
  }

  const description = chooseDescription(top);
  if (!description) {
    log(`  → top: "${top.title}" — no usable description field`);
    return null;
  }

  log(
    `  → ${top.slug} score=${top.score.toFixed(2)} (${description.length} chars, ${description === top.teaser ? "teaser" : "synopsis"})`
  );

  return {
    entityType: "show",
    entityId: show._id,
    field: "description",
    value: description,
  };
}

function chooseDescription(hit) {
  const teaser = hit.teaser || "";
  const synopsis = hit.synopsis || "";
  if (PREFER === "synopsis") {
    return synopsis || teaser || null;
  }
  return teaser || synopsis || null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (DRY_RUN) log("DRY RUN — Convex will not be written to");
  log(`Min confidence threshold: ${MIN_CONFIDENCE}`);
  log(`Preferred description field: ${PREFER}`);

  log("Fetching shows-needing-descriptions queue…");
  let queue;
  try {
    queue = await fetchShowsNeedingDescriptions();
  } catch (err) {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  }

  if (queue.length === 0) {
    log("Queue empty — every show already has a description (or was recently checked).");
    process.exit(0);
  }

  if (LIMIT !== null && LIMIT < queue.length) {
    log(`Limiting to first ${LIMIT} of ${queue.length} show(s)`);
    queue = queue.slice(0, LIMIT);
  } else {
    log(`${queue.length} show(s) to describe`);
  }

  const findings = [];
  for (let i = 0; i < queue.length; i++) {
    if (i > 0) await sleep(RATE_LIMIT_MS);
    try {
      const finding = await describeShow(queue[i]);
      if (finding) findings.push(finding);
    } catch (err) {
      warn(`  Unhandled error describing "${queue[i].name}": ${err.message}`);
    }
  }

  if (findings.length === 0) {
    log("Scanning complete — no confident descriptions to stage.");
    process.exit(0);
  }

  log(`Submitting ${findings.length} finding(s) to Convex…`);
  try {
    const result = await postFindings(findings);
    log(`Done. created=${result.created} skipped=${result.skipped}`);
  } catch (err) {
    console.error(`[error] Failed to submit findings: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
