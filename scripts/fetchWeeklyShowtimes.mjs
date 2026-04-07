/**
 * Fetches the Playbill weekly Broadway schedule and writes structured JSON.
 *
 * Outputs:
 *   data/showtimes/current.json          — always the latest week (overwritten each run)
 *   data/showtimes/YYYY-MM-DD.json       — immutable snapshot for that week
 *   data/showtimes/diff-YYYY-MM-DD.json  — structured diff vs the previous week
 *
 * Usage:
 *   bun scripts/fetchWeeklyShowtimes.mjs
 *   bun scripts/fetchWeeklyShowtimes.mjs --dry-run   (no file writes, logs output)
 *   bun scripts/fetchWeeklyShowtimes.mjs --force      (write even if same weekOf)
 *
 * Exit codes:
 *   0  — success (wrote new data, or no-op because weekOf unchanged)
 *   1  — fetch or parse error
 *   2  — freshness check failed (Playbill still shows previous week — retry later)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SHOWTIMES_DIR = path.join(ROOT, "data", "showtimes");
const CURRENT_PATH = path.join(SHOWTIMES_DIR, "current.json");

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
  // (the year is almost never in the header itself)
  const headerMatch = html.match(/Mon\.\s+([A-Za-z]+)\s+(\d{1,2})/i);
  if (headerMatch) {
    const monthName = headerMatch[1].toLowerCase();
    const month = months[monthName];
    const day = parseInt(headerMatch[2], 10);
    if (month) {
      // Use current year; if the parsed month is far in the future, try next year
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
  const dayOfWeek = today.getUTCDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  // If today IS Monday, use today
  const daysOffset = dayOfWeek === 1 ? 0 : -(dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + daysOffset);
  return monday.toISOString().slice(0, 10);
}

/**
 * Parse the schedule HTML table.
 * Returns an array of show objects.
 */
function parseShowtimesTable(html) {
  // Find the schedule table — it contains a header row with day names.
  // Strategy: find the <table> that has a <th> containing "Mon"
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

  // Map day abbreviation → column index (0-based, first col is show name)
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

    // First cell is always the show name + sometimes venue on a new line
    const firstCell = cells[0];
    if (!firstCell) continue;

    // Some rows are section headers (e.g. bold show name) — skip if no day data
    const hasAnyPerf = DAYS.some((day) => {
      const idx = dayIndex[day];
      return idx !== undefined && cells[idx] && cells[idx] !== "DARK";
    });

    // Parse show name (may include theatre in parens or on a second line in HTML)
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
// Diff
// ---------------------------------------------------------------------------

const DAYS_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function slotsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function slotLabel(slots) {
  if (!slots || slots.length === 0) return "DARK";
  return slots.join(", ");
}

/**
 * Compute a human-readable + machine-readable diff between two schedule snapshots.
 */
function computeDiff(prev, next) {
  const prevMap = new Map(prev.shows.map((s) => [s.title, s]));
  const nextMap = new Map(next.shows.map((s) => [s.title, s]));

  const added = next.shows
    .filter((s) => !prevMap.has(s.title))
    .map((s) => s.title);

  const removed = prev.shows
    .filter((s) => !nextMap.has(s.title))
    .map((s) => s.title);

  const timeChanges = [];
  for (const nextShow of next.shows) {
    const prevShow = prevMap.get(nextShow.title);
    if (!prevShow) continue;
    const changes = [];
    for (const day of DAYS) {
      const p = prevShow.schedule[day] ?? [];
      const n = nextShow.schedule[day] ?? [];
      if (!slotsEqual(p, n)) {
        changes.push({
          day: DAYS_LABEL[day],
          from: slotLabel(p),
          to: slotLabel(n),
        });
      }
    }
    if (changes.length) timeChanges.push({ title: nextShow.title, changes });
  }

  const openingNights = next.shows
    .filter((s) => DAYS.some((d) => s.schedule[d]?.includes("opening")))
    .map((s) => {
      const day = DAYS.find((d) => s.schedule[d]?.includes("opening"));
      return { title: s.title, day: DAYS_LABEL[day] };
    });

  return {
    prevWeekOf: prev.weekOf,
    nextWeekOf: next.weekOf,
    added,
    removed,
    timeChanges,
    openingNights,
  };
}

/** Render the diff as a Markdown summary for PR bodies / commit messages. */
function renderDiffMarkdown(diff) {
  const lines = [
    `## Broadway Showtimes: Week of ${diff.nextWeekOf}`,
    `_vs. previous week (${diff.prevWeekOf})_`,
    "",
  ];

  if (diff.openingNights.length) {
    lines.push("### 🎭 Opening Nights");
    for (const o of diff.openingNights) {
      lines.push(`- **${o.title}** opens ${o.day}`);
    }
    lines.push("");
  }

  if (diff.added.length) {
    lines.push("### ✅ Shows Added");
    for (const t of diff.added) lines.push(`- ${t}`);
    lines.push("");
  }

  if (diff.removed.length) {
    lines.push("### ❌ Shows Removed");
    for (const t of diff.removed) lines.push(`- ${t}`);
    lines.push("");
  }

  if (diff.timeChanges.length) {
    lines.push("### 🕐 Time Changes");
    for (const sc of diff.timeChanges) {
      lines.push(`- **${sc.title}**`);
      for (const c of sc.changes) {
        lines.push(`  - ${c.day}: ${c.from} → ${c.to}`);
      }
    }
    lines.push("");
  }

  if (
    !diff.openingNights.length &&
    !diff.added.length &&
    !diff.removed.length &&
    !diff.timeChanges.length
  ) {
    lines.push("_No changes from last week._");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------

function runQualityChecks(snapshot, prev) {
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

  // Show count shouldn't swing wildly (>10 in one week is suspicious)
  if (prev) {
    const delta = Math.abs(snapshot.shows.length - prev.shows.length);
    if (delta > 10) {
      warnings.push(
        `Show count changed by ${delta} (${prev.shows.length} → ${snapshot.shows.length}) — verify source`
      );
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`Starting (DRY_RUN=${DRY_RUN}, FORCE=${FORCE})`);

  // Load previous snapshot if it exists
  let prev = null;
  if (fs.existsSync(CURRENT_PATH)) {
    try {
      prev = JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8"));
      log(`Previous snapshot: weekOf=${prev.weekOf}, shows=${prev.shows.length}`);
    } catch {
      warn("Could not parse existing current.json — treating as no previous data");
    }
  }

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

  // Freshness check: if the scraped week matches what we already have, skip.
  if (!FORCE && prev && prev.weekOf === weekOf) {
    log(
      `weekOf=${weekOf} matches current.json — Playbill hasn't updated yet. Exiting with code 2 (retry later).`
    );
    process.exit(2);
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

  const snapshot = {
    weekOf,
    fetchedAt: new Date().toISOString(),
    showCount: shows.length,
    shows,
  };

  // Quality checks
  const { issues, warnings } = runQualityChecks(snapshot, prev);
  for (const w of warnings) warn(w);
  if (issues.length) {
    for (const issue of issues) console.error(`QUALITY ISSUE: ${issue}`);
    // Don't hard-fail on quality issues — write the data but surface them
  }

  // Diff
  let diff = null;
  let diffMarkdown = "";
  if (prev) {
    diff = computeDiff(prev, snapshot);
    diffMarkdown = renderDiffMarkdown(diff);
    log("Diff computed:");
    console.log(diffMarkdown);
  } else {
    diffMarkdown = `## Broadway Showtimes: Week of ${weekOf}\n\n_Initial snapshot — no previous data to diff._\n\n${shows.length} shows parsed.`;
  }

  if (DRY_RUN) {
    log("DRY RUN — no files written");
    log("Snapshot preview:");
    console.log(JSON.stringify(snapshot, null, 2).slice(0, 2000) + "\n...");
    return;
  }

  // Write files
  const snapshotPath = path.join(SHOWTIMES_DIR, `${weekOf}.json`);
  const diffPath = path.join(SHOWTIMES_DIR, `diff-${weekOf}.json`);
  const diffMdPath = path.join(SHOWTIMES_DIR, `diff-${weekOf}.md`);

  fs.mkdirSync(SHOWTIMES_DIR, { recursive: true });

  fs.writeFileSync(CURRENT_PATH, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  if (diff) {
    fs.writeFileSync(diffPath, JSON.stringify(diff, null, 2));
    fs.writeFileSync(diffMdPath, diffMarkdown);
  }

  log(`Wrote: data/showtimes/current.json`);
  log(`Wrote: data/showtimes/${weekOf}.json`);
  if (diff) log(`Wrote: data/showtimes/diff-${weekOf}.{json,md}`);

  // Write PR body to a temp file so the workflow can read it
  const prBodyPath = path.join(ROOT, ".github", "pr-body.md");
  fs.mkdirSync(path.dirname(prBodyPath), { recursive: true });
  fs.writeFileSync(prBodyPath, diffMarkdown);
  log(`Wrote: .github/pr-body.md`);

  // Output structured result for GitHub Actions
  const qualitySummary =
    issues.length || warnings.length
      ? `\n\n---\n**Quality:** ${issues.length} issues, ${warnings.length} warnings`
      : "";
  console.log(`\nDONE weekOf=${weekOf} shows=${shows.length}${qualitySummary}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
