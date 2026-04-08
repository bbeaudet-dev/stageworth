/**
 * Fetches Playbill production pages for shows in the enrichment queue
 * and stages the scraped data as pending reviewQueue entries in Convex.
 *
 * Flow:
 *   1. GET  {CONVEX_URL}/playbill/enrich-queue  — fetch the work list
 *   2. Fetch each playbill.com/production/{id} page (rate-limited)
 *   3. Parse: running time, intermission count, description, dates
 *   4. POST {CONVEX_URL}/playbill/findings      — submit results
 *
 * Usage:
 *   bun scripts/fetchPlaybillShowData.mjs
 *   bun scripts/fetchPlaybillShowData.mjs --dry-run
 *   bun scripts/fetchPlaybillShowData.mjs --id <playbillProductionId>
 *
 * Required env vars:
 *   CONVEX_URL        Convex deployment base URL, e.g. https://xxx.convex.cloud
 *   PLAYBILL_SECRET   Shared secret for the /playbill/* HTTP endpoints
 *
 * Exit codes:
 *   0  success (including "nothing to do")
 *   1  hard error (bad env, network failure, unexpected crash)
 */

import { env } from "node:process";

// ─── CLI flags ────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

const SPECIFIC_ID = (() => {
  const idx = process.argv.indexOf("--id");
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

// ─── Config ───────────────────────────────────────────────────────────────────

/** ms to wait between Playbill page fetches — be a polite bot. */
const RATE_LIMIT_MS = 1500;

const PLAYBILL_BASE = "https://playbill.com/production";

const USER_AGENT =
  "theatre-diary-enrichment-bot/1.0 (+https://github.com/benbeau/theatre-diary)";

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

async function fetchEnrichQueue() {
  const res = await fetch(`${CONVEX_URL}/playbill/enrich-queue`, {
    headers: { Authorization: `Bearer ${PLAYBILL_SECRET}` },
  });
  if (!res.ok) {
    throw new Error(`GET /playbill/enrich-queue → HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function postFindings(findings) {
  if (DRY_RUN) {
    log(`[dry-run] Would POST ${findings.length} finding(s) — skipping write`);
    for (const f of findings) {
      log(`  [dry-run]  ${f.entityType}:${f.entityId} ${f.field} = ${JSON.stringify(f.value)}`);
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

// ─── Playbill page fetch ──────────────────────────────────────────────────────

async function fetchPlaybillPage(playbillProductionId) {
  const url = `${PLAYBILL_BASE}/${playbillProductionId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

const MONTH_MAP = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Parse a labeled date circle from the "Pro Info" sidebar.
 *
 * Playbill renders each date as:
 *   <div class="bsp-list-promo-title">Opening Date</div>
 *   ...
 *   <div class="info-circular">
 *     <span class="info-circular-pre-text">Nov</span>
 *     <span class="info-circular-text">21</span>
 *     <span class="info-circular-post-text">2024</span>
 *   </div>
 *
 * When there's no closing date and the show is running:
 *   <span class="info-circular-pre-text">Currently Running</span>
 *
 * Returns:
 *   { date: "YYYY-MM-DD" }   — a specific date was found
 *   { openRun: true }        — "Currently Running" (closing date label only)
 *   null                     — label absent or date not parseable
 */
function parseDateSection(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<div class="bsp-list-promo-title">\\s*${escaped}\\s*<\\/div>` +
      `[\\s\\S]{0,1000}?` +
      `<div class="info-circular">\\s*` +
      `<span class="info-circular-pre-text">([^<]*)<\\/span>\\s*` +
      `(?:<span class="info-circular-text">([^<]*)<\\/span>\\s*)?` +
      `(?:<span class="info-circular-post-text">([^<]*)<\\/span>)?`
  );
  const match = html.match(pattern);
  if (!match) return null;

  const [, preText, dayText, postText] = match;
  const pre = preText.trim();

  if (pre === "Currently Running") return { openRun: true };

  const month = MONTH_MAP[pre.toLowerCase().slice(0, 3)];
  const day = dayText?.trim().padStart(2, "0");
  const year = postText?.trim();

  if (!month || !day || !year || !/^\d{4}$/.test(year)) {
    warn(`Unparseable date for "${label}": pre="${pre}" day="${dayText}" year="${postText}"`);
    return null;
  }

  return { date: `${year}-${month}-${day}` };
}

/**
 * Parse running time and intermission count from:
 *   <li><span>Running Time:</span> 2 hours and 30 minutes, including one intermission</li>
 *
 * Returns { minutes: number|null, intermissionCount: number|null }
 */
function parseRunningTime(html) {
  const match = html.match(/<span>Running Time:<\/span>\s*([^<\n]+)/);
  if (!match) return { minutes: null, intermissionCount: null };

  const raw = match[1].trim();

  let minutes = 0;
  const standaloneMin = raw.match(/^(\d+)\s*minutes?$/i);
  if (standaloneMin) {
    minutes = parseInt(standaloneMin[1], 10);
  } else {
    const hours = raw.match(/(\d+)\s*hour/i);
    const mins = raw.match(/(\d+)\s*min/i);
    if (hours) minutes += parseInt(hours[1], 10) * 60;
    if (mins) minutes += parseInt(mins[1], 10);
  }

  if (minutes === 0) {
    warn(`Could not parse running time from: "${raw}"`);
    return { minutes: null, intermissionCount: null };
  }

  const lower = raw.toLowerCase();
  let intermissionCount = null;
  if (/no intermission/.test(lower) || /without.*intermission/.test(lower)) {
    intermissionCount = 0;
  } else if (/two intermissions/.test(lower)) {
    intermissionCount = 2;
  } else if (/one intermission|an intermission|including.*intermission|with.*intermission/.test(lower)) {
    intermissionCount = 1;
  }

  return { minutes, intermissionCount };
}

/**
 * Extract the <meta name="description"> content.
 * This is the cleanest source for show descriptions — no HTML to strip.
 */
function parseDescription(html) {
  const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (!match) return null;
  return match[1]
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// ─── Per-production scrape ────────────────────────────────────────────────────

async function scrapeProduction(production) {
  const {
    productionId,
    playbillProductionId,
    showId,
    showName,
    missingShowFields,
    missingProductionFields,
  } = production;

  log(`Fetching: "${showName}" — ${playbillProductionId}`);

  let html;
  try {
    html = await fetchPlaybillPage(playbillProductionId);
  } catch (err) {
    warn(`  Failed to fetch page: ${err.message}`);
    return [];
  }

  // Detect 404-equivalent pages (Playbill returns 200 with an error page body).
  if (html.includes("THE SHOW MUST GO ON") || html.includes("error-page-message")) {
    warn(`  404-style page returned — playbillProductionId may be stale or wrong`);
    return [];
  }

  const findings = [];

  // ── Show-level fields ────────────────────────────────────────────────────

  if (
    missingShowFields.includes("runningTime") ||
    missingShowFields.includes("intermissionCount")
  ) {
    const { minutes, intermissionCount } = parseRunningTime(html);

    if (minutes !== null && missingShowFields.includes("runningTime")) {
      findings.push({
        entityType: "show",
        entityId: showId,
        field: "runningTime",
        value: String(minutes),
      });
    }
    if (intermissionCount !== null && missingShowFields.includes("intermissionCount")) {
      findings.push({
        entityType: "show",
        entityId: showId,
        field: "intermissionCount",
        value: String(intermissionCount),
      });
    }
  }

  if (missingShowFields.includes("description")) {
    const description = parseDescription(html);
    if (description) {
      findings.push({
        entityType: "show",
        entityId: showId,
        field: "description",
        value: description,
      });
    }
  }

  // ── Production-level date fields ─────────────────────────────────────────

  const dateFields = {
    previewDate: "First Preview",
    openingDate: "Opening Date",
    closingDate: "Closing Date",
  };

  for (const [field, label] of Object.entries(dateFields)) {
    if (!missingProductionFields.includes(field)) continue;

    const result = parseDateSection(html, label);
    if (!result) continue;

    if (result.openRun) {
      // "Currently Running" on the Closing Date circle → propose isOpenRun = true.
      // The admin can review this in the normal queue flow.
      findings.push({
        entityType: "production",
        entityId: productionId,
        field: "isOpenRun",
        value: "true",
      });
    } else if (result.date) {
      findings.push({
        entityType: "production",
        entityId: productionId,
        field,
        value: result.date,
      });
    }
  }

  const fieldSummary = findings.map((f) => f.field).join(", ") || "nothing new";
  log(`  → ${findings.length} finding(s): ${fieldSummary}`);

  return findings;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) log("DRY RUN — Convex will not be written to");
  if (SPECIFIC_ID) log(`Single-ID mode: ${SPECIFIC_ID}`);

  // 1. Fetch work list from Convex.
  log("Fetching enrichment queue from Convex…");
  let queue;
  try {
    queue = await fetchEnrichQueue();
  } catch (err) {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  }

  // In single-ID mode, filter or synthesise a synthetic entry for testing.
  if (SPECIFIC_ID) {
    const match = queue.find((p) => p.playbillProductionId === SPECIFIC_ID);
    if (match) {
      queue = [match];
    } else {
      log(`ID not in queue — creating synthetic entry for manual scrape`);
      queue = [
        {
          productionId: "manual-test",
          playbillProductionId: SPECIFIC_ID,
          showId: "manual-test",
          showName: SPECIFIC_ID,
          missingShowFields: ["runningTime", "intermissionCount", "description"],
          missingProductionFields: ["previewDate", "openingDate", "closingDate"],
        },
      ];
    }
  }

  if (queue.length === 0) {
    log("Enrichment queue is empty — all productions are up to date.");
    process.exit(0);
  }

  log(`${queue.length} production(s) to enrich`);

  // 2. Scrape each production page, rate-limited.
  const allFindings = [];
  for (let i = 0; i < queue.length; i++) {
    if (i > 0) await sleep(RATE_LIMIT_MS);
    const findings = await scrapeProduction(queue[i]);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    log("Scraping complete — no new data found.");
    process.exit(0);
  }

  // 3. Submit all findings to Convex in one batch.
  log(`Submitting ${allFindings.length} finding(s) to Convex…`);
  try {
    const result = await postFindings(allFindings);
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
