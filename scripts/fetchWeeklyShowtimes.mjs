/**
 * Fetches the Playbill weekly Broadway schedule and syncs it to Convex.
 *
 * Usage:
 *   bun scripts/fetchWeeklyShowtimes.mjs
 *   bun scripts/fetchWeeklyShowtimes.mjs --dry-run   (logs output, no Convex write)
 *   bun scripts/fetchWeeklyShowtimes.mjs --force      (write even if weekOf unchanged)
 *
 * Required env vars (when not --dry-run):
 *   CONVEX_HTTP_URL        — e.g. https://your-deployment.convex.site
 *   SHOWTIMES_SYNC_SECRET  — bearer token matching SHOWTIMES_SYNC_SECRET in Convex
 *
 * Exit codes:
 *   0  — success (synced new data or --dry-run)
 *   1  — fetch, parse, or Convex error
 *   2  — freshness check: Playbill still shows last week's schedule (retry later)
 */

const PLAYBILL_URL =
  "https://playbill.com/article/weekly-schedule-of-current-broadway-shows";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function warn(msg) {
  console.warn(`[${new Date().toISOString()}] WARN ${msg}`);
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchPage() {
  log(`Fetching ${PLAYBILL_URL}`);
  const res = await fetch(PLAYBILL_URL, {
    headers: {
      "User-Agent":
        "theatre-diary-showtimes-bot/1.0 (+https://github.com/benbeau/theatre-diary)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Parse HTML table
//
// Playbill renders the schedule as a plain HTML table — no JS required.
// Columns: Show | Mon | Tue | Wed | Thu | Fri | Sat | Sun
// Cell values: "7pm", "2pm, 8pm", "DARK", "OPENING", ""
// ---------------------------------------------------------------------------

/**
 * Parse a Playbill time cell into an array of time strings.
 * DARK or empty → []
 * OPENING → ["opening"]  (a performance exists; exact time not listed)
 * "2pm, 8pm" → ["14:00", "20:00"]
 */
function parseCell(raw) {
  const trimmed = (raw || "").trim();

  if (!trimmed || trimmed === "DARK") return [];
  if (trimmed === "OPENING") return ["opening"];

  // May contain multiple times separated by comma, e.g. "2pm, 8pm"
  return trimmed.split(",").map((t) => {
    const clean = t.trim().toLowerCase();
    // Normalise to HH:MM 24h
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
    if (!match) {
      warn(`Unrecognised time format: "${t.trim()}"`);
      return t.trim();
    }
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3];
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Extract the "week of MMMM D, YYYY" date from the page HTML. */
function extractWeekOf(html) {
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  // Strategy 1: article publication date meta tag (most reliable)
  // Playbill publishes the article on Sunday; we want the Monday (weekOf).
  const metaMatch = html.match(
    /<meta[^>]+(?:property="article:published_time"|name="publish-date")[^>]+content="(\d{4}-\d{2}-\d{2})/i
  );
  if (metaMatch) {
    // Advance to Monday if the article date is Sunday
    const d = new Date(`${metaMatch[1]}T12:00:00Z`);
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); // Sun → Mon
    return d.toISOString().slice(0, 10);
  }

  // Strategy 2: "April 05, 2026" style date line near byline
  const bylineMatch = html.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(20\d{2})/);
  if (bylineMatch) {
    const month = months[bylineMatch[1].toLowerCase()];
    if (month) {
      const d = new Date(
        Date.UTC(parseInt(bylineMatch[3], 10), month - 1, parseInt(bylineMatch[2], 10))
      );
      if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); // Sun → Mon
      return d.toISOString().slice(0, 10);
    }
  }

  // Strategy 3: "Mon. April 6" table header — derive year from current date
  const headerMatch = html.match(/Mon\.\s+([A-Za-z]+)\s+(\d{1,2})/i);
  if (headerMatch) {
    const monthName = headerMatch[1].toLowerCase();
    const month = months[monthName];
    const day = parseInt(headerMatch[2], 10);
    if (month) {
      const now = new Date();
      let year = now.getUTCFullYear();
      const candidate = new Date(Date.UTC(year, month - 1, day));
      // If candidate is >6 months in the past, it's probably next year
      if (now - candidate > 180 * 24 * 60 * 60 * 1000) year += 1;
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // Last resort: compute Monday of the current week
  warn("Could not extract weekOf from page — using computed Monday of current week");
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + daysOffset);
  return monday.toISOString().slice(0, 10);
}

/**
 * Compute what Monday's date should be for the current week (UTC).
 * Used as the expected weekOf — if Playbill still shows last week's date, they
 * haven't published the new schedule yet.
 */
function getExpectedWeekOf() {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysBack = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysBack);
  return monday.toISOString().slice(0, 10);
}

/**
 * Parse the schedule HTML table.
 * Returns an array of show objects.
 */
function parseShowtimesTable(html) {
  // Find the <table> that has a <th> containing "Mon"
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tableMatch) throw new Error("No <table> found in page HTML");

  let showtimesTable = null;
  for (const table of tableMatch) {
    if (/Mon\./i.test(table)) {
      showtimesTable = table;
      break;
    }
  }
  if (!showtimesTable) throw new Error("Could not find schedule table (no Mon. header)");

  // Extract all rows
  const rows = [...showtimesTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (m) => m[1]
  );

  // First row is the header — find column indices for each day
  const headerRow = rows[0];
  const headerCells = [...headerRow.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(
    (m) => stripTags(m[1]).trim()
  );

  const dayIndex = {};
  for (const [i, cell] of headerCells.entries()) {
    for (const day of DAYS) {
      if (cell.toLowerCase().startsWith(day)) {
        dayIndex[day] = i;
        break;
      }
    }
  }

  const shows = [];

  for (const row of rows.slice(1)) {
    const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(
      (m) => stripTags(m[1]).trim()
    );
    if (cells.length < 2) continue;

    const firstCell = cells[0];
    if (!firstCell) continue;

    const showName = firstCell.replace(/\s+/g, " ").trim();
    if (!showName) continue;

    const schedule = {};
    for (const day of DAYS) {
      const idx = dayIndex[day];
      schedule[day] = idx !== undefined && cells[idx] !== undefined
        ? parseCell(cells[idx])
        : [];
    }

    shows.push({ title: showName, schedule });
  }

  return shows;
}

/** Strip HTML tags and decode basic entities. */
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim();
}

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------

function runQualityChecks(snapshot) {
  const issues = [];
  const warnings = [];

  // Every show should have at least one performance
  for (const show of snapshot.shows) {
    const total = DAYS.reduce(
      (sum, d) => sum + (show.schedule[d]?.length ?? 0),
      0
    );
    if (total === 0) {
      issues.push(`"${show.title}" has zero performances this week`);
    }
  }

  // All times should be HH:MM or the string "opening"
  for (const show of snapshot.shows) {
    for (const day of DAYS) {
      for (const slot of show.schedule[day] ?? []) {
        if (slot !== "opening" && !/^\d{2}:\d{2}$/.test(slot)) {
          warnings.push(`"${show.title}" ${day}: unexpected time "${slot}"`);
        }
      }
    }
  }

  return { issues, warnings };
}

// ---------------------------------------------------------------------------
// Convex sync
// ---------------------------------------------------------------------------

async function syncToConvex(weekOf, shows) {
  const convexUrl = process.env.CONVEX_HTTP_URL;
  const secret = process.env.SHOWTIMES_SYNC_SECRET;

  if (!convexUrl || !secret) {
    throw new Error(
      "Missing required env vars: CONVEX_HTTP_URL and SHOWTIMES_SYNC_SECRET must be set"
    );
  }

  const url = `${convexUrl.replace(/\/$/, "")}/showtimes/sync`;
  log(`Syncing ${shows.length} shows to Convex (${url})`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ weekOf, shows }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex sync failed: HTTP ${res.status} — ${text}`);
  }

  const result = await res.json();
  log(`Convex sync complete: matched=${result.matched?.length ?? "?"} unmatched=${result.unmatched?.length ?? "?"}`);
  if (result.unmatched?.length) {
    warn(`Unmatched Playbill titles: ${result.unmatched.join(", ")}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`Starting (DRY_RUN=${DRY_RUN}, FORCE=${FORCE})`);

  // Fetch and parse
  let html;
  try {
    html = await fetchPage();
  } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
    process.exit(1);
  }

  const weekOf = extractWeekOf(html);
  log(`Parsed weekOf: ${weekOf}`);

  // Freshness check: if Playbill still shows a weekOf that doesn't match the
  // expected current week's Monday, they haven't published the new schedule yet.
  if (!FORCE) {
    const expected = getExpectedWeekOf();
    if (weekOf < expected) {
      log(
        `weekOf=${weekOf} is before expected ${expected} — Playbill hasn't updated yet. Exiting with code 2 (retry later).`
      );
      process.exit(2);
    }
  }

  let shows;
  try {
    shows = parseShowtimesTable(html);
  } catch (err) {
    console.error(`Parse failed: ${err.message}`);
    process.exit(1);
  }

  if (shows.length === 0) {
    console.error("Parsed 0 shows — something is wrong with the HTML structure");
    process.exit(1);
  }

  log(`Parsed ${shows.length} shows`);

  const snapshot = { weekOf, fetchedAt: new Date().toISOString(), showCount: shows.length, shows };

  // Quality checks
  const { issues, warnings } = runQualityChecks(snapshot);
  for (const w of warnings) warn(w);
  if (issues.length) {
    for (const issue of issues) console.error(`QUALITY ISSUE: ${issue}`);
  }

  if (DRY_RUN) {
    log("DRY RUN — skipping Convex sync");
    log("Snapshot preview:");
    console.log(JSON.stringify(snapshot, null, 2).slice(0, 2000) + "\n...");
    return;
  }

  // Sync to Convex
  try {
    await syncToConvex(weekOf, shows);
  } catch (err) {
    console.error(`Convex sync error: ${err.message}`);
    process.exit(1);
  }

  const qualitySummary =
    issues.length || warnings.length
      ? `\n\n---\n**Quality:** ${issues.length} issues, ${warnings.length} warnings`
      : "";
  log(`DONE weekOf=${weekOf} shows=${shows.length}${qualitySummary}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
