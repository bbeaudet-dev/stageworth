import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { normalizeShowName } from "./showNormalization";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklySchedule = {
  weekOf: string;
  mon: string[];
  tue: string[];
  wed: string[];
  thu: string[];
  fri: string[];
  sat: string[];
  sun: string[];
};

type PlaybillShow = {
  title: string;
  schedule: {
    mon: string[];
    tue: string[];
    wed: string[];
    thu: string[];
    fri: string[];
    sat: string[];
    sun: string[];
  };
};

const dayScheduleValidator = v.object({
  mon: v.array(v.string()),
  tue: v.array(v.string()),
  wed: v.array(v.string()),
  thu: v.array(v.string()),
  fri: v.array(v.string()),
  sat: v.array(v.string()),
  sun: v.array(v.string()),
});

const playbillShowValidator = v.object({
  title: v.string(),
  schedule: dayScheduleValidator,
});

const PLAYBILL_URL =
  "https://playbill.com/article/weekly-schedule-of-current-broadway-shows";
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// ─── Title normalization helpers (mirrors src/lib/broadwayShowtimes.ts) ───────

function stripParentheticalContent(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function stripTourishSuffix(s: string): string {
  return s
    .replace(/\s*[—–-]\s*(tour|touring|non[- ]equity|n\s*[/\u2215]y|national tour).*/i, "")
    .trim();
}

/**
 * Generate all normalized key variants for a Playbill title so we can match
 * against show.normalizedName in our database.
 */
function indexKeysForPlaybillTitle(title: string): string[] {
  const keys = new Set<string>();

  const stripped = stripParentheticalContent(title);
  const noTour = stripTourishSuffix(title);
  const strippedNoTour = stripTourishSuffix(stripped);

  for (const base of [title, stripped, noTour, strippedNoTour]) {
    if (!base) continue;
    let s = base.trim();
    keys.add(normalizeShowName(s));
    s = s.replace(/\s*[,-]?\s*the musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
    s = s.replace(/\s+a new musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
    // Also try appending "The Musical" for titles that omit it in Playbill
    keys.add(normalizeShowName(`${base} The Musical`));
  }

  return [...keys].filter(Boolean);
}

function parseCell(raw: string): string[] {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed === "DARK") return [];
  if (trimmed === "OPENING") return ["opening"];

  return trimmed.split(",").map((t) => {
    const clean = t.trim().toLowerCase();
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
    if (!match) return t.trim();
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3];
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim();
}

function extractWeekOf(html: string): string {
  const months: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const metaMatch = html.match(
    /<meta[^>]+(?:property="article:published_time"|name="publish-date")[^>]+content="(\d{4}-\d{2}-\d{2})/i
  );
  if (metaMatch) {
    const d = new Date(`${metaMatch[1]}T12:00:00Z`);
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const bylineMatch = html.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(20\d{2})/);
  if (bylineMatch) {
    const month = months[bylineMatch[1].toLowerCase()];
    if (month) {
      const d = new Date(
        Date.UTC(parseInt(bylineMatch[3], 10), month - 1, parseInt(bylineMatch[2], 10))
      );
      if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    }
  }
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + daysOffset);
  return monday.toISOString().slice(0, 10);
}

function getExpectedWeekOf(): string {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysBack = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysBack);
  return monday.toISOString().slice(0, 10);
}

function parseShowtimesTable(html: string): PlaybillShow[] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tableMatch) throw new Error("No <table> found in page HTML");

  let showtimesTable: string | null = null;
  for (const table of tableMatch) {
    if (/Mon\./i.test(table)) {
      showtimesTable = table;
      break;
    }
  }
  if (!showtimesTable) throw new Error("Could not find schedule table (no Mon. header)");

  const rows = [...showtimesTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const headerRow = rows[0];
  const headerCells = [...headerRow.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
    stripTags(m[1]).trim()
  );

  const dayIndex: Record<string, number> = {};
  for (const [i, cell] of headerCells.entries()) {
    for (const day of DAYS) {
      if (cell.toLowerCase().startsWith(day)) {
        dayIndex[day] = i;
        break;
      }
    }
  }

  const shows: PlaybillShow[] = [];
  for (const row of rows.slice(1)) {
    const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      stripTags(m[1]).trim()
    );
    if (cells.length < 2) continue;
    const title = cells[0].replace(/\s+/g, " ").trim();
    if (!title) continue;
    const schedule = {
      mon: [] as string[],
      tue: [] as string[],
      wed: [] as string[],
      thu: [] as string[],
      fri: [] as string[],
      sat: [] as string[],
      sun: [] as string[],
    };
    for (const day of DAYS) {
      const idx = dayIndex[day];
      schedule[day] = idx !== undefined && cells[idx] !== undefined ? parseCell(cells[idx]) : [];
    }
    shows.push({ title, schedule });
  }
  return shows;
}

// ─── Matching helpers ────────────────────────────────────────────────────────

/**
 * Build { playbillTitleLookupKey → productionId } for all currently-open
 * Broadway productions. Shared by sync + diff + per-show approval so we apply
 * identical matching rules everywhere.
 */
async function buildBroadwayTitleIndex(ctx: any): Promise<Map<string, string>> {
  const today = new Date().toISOString().slice(0, 10);
  const broadwayProductions = await ctx.db
    .query("productions")
    .withIndex("by_district", (q: any) => q.eq("district", "broadway"))
    .collect();

  const titleToProductionId = new Map<string, string>();
  for (const prod of broadwayProductions) {
    if (prod.isClosed) continue;
    if (prod.closingDate && prod.closingDate < today) continue;
    const show = await ctx.db.get(prod.showId);
    if (!show) continue;
    titleToProductionId.set(show.normalizedName, prod._id);
    for (const key of indexKeysForPlaybillTitle(show.name)) {
      if (!titleToProductionId.has(key)) titleToProductionId.set(key, prod._id);
    }
  }
  return titleToProductionId;
}

function findProductionIdForPlaybillTitle(
  index: Map<string, string>,
  playbillTitle: string
): string | undefined {
  for (const key of indexKeysForPlaybillTitle(playbillTitle)) {
    const id = index.get(key);
    if (id) return id;
  }
  return undefined;
}

// ─── Internal mutation ────────────────────────────────────────────────────────

export const syncWeeklyShowtimes = internalMutation({
  args: {
    weekOf: v.string(),
    shows: v.array(playbillShowValidator),
  },
  handler: async (ctx, { weekOf, shows }) => {
    const titleIndex = await buildBroadwayTitleIndex(ctx);

    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const playbillShow of shows as PlaybillShow[]) {
      const productionId = findProductionIdForPlaybillTitle(titleIndex, playbillShow.title);
      if (!productionId) {
        unmatched.push(playbillShow.title);
        continue;
      }
      await ctx.db.patch(productionId as never, {
        weeklySchedule: { weekOf, ...playbillShow.schedule },
      });
      matched.push(playbillShow.title);
    }

    console.log(
      `[showtimes] weekOf=${weekOf} matched=${matched.length} unmatched=${unmatched.length}`
    );
    if (unmatched.length > 0) {
      console.warn(`[showtimes] Unmatched Playbill titles: ${unmatched.join(", ")}`);
    }

    return { weekOf, matched, unmatched };
  },
});

async function estimateShowtimeMatches(
  ctx: any,
  shows: PlaybillShow[]
): Promise<{ matchedCount: number; unmatchedTitles: string[] }> {
  const titleIndex = await buildBroadwayTitleIndex(ctx);
  const unmatchedTitles: string[] = [];
  let matchedCount = 0;
  for (const row of shows) {
    if (findProductionIdForPlaybillTitle(titleIndex, row.title)) matchedCount += 1;
    else unmatchedTitles.push(row.title);
  }
  return { matchedCount, unmatchedTitles };
}

export const createProposal = mutation({
  args: {
    weekOf: v.string(),
    fetchedAt: v.optional(v.number()),
    shows: v.array(playbillShowValidator),
  },
  handler: async (ctx, args) => {
    // Keep one pending proposal per week; replace if retried.
    const existing = await ctx.db
      .query("showtimesReviews")
      .withIndex("by_weekOf", (q) => q.eq("weekOf", args.weekOf))
      .collect();
    for (const row of existing) {
      if (row.status === "pending") await ctx.db.delete(row._id);
    }

    const estimate = await estimateShowtimeMatches(ctx, args.shows as PlaybillShow[]);
    const proposalId = await ctx.db.insert("showtimesReviews", {
      weekOf: args.weekOf,
      fetchedAt: args.fetchedAt ?? Date.now(),
      source: "playbill",
      status: "pending",
      shows: args.shows,
      matchedCount: estimate.matchedCount,
      unmatchedTitles: estimate.unmatchedTitles,
    });

    return {
      proposalId,
      weekOf: args.weekOf,
      matched: estimate.matchedCount,
      unmatched: estimate.unmatchedTitles,
    };
  },
});

export const listProposals = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = args.status
      ? await ctx.db
          .query("showtimesReviews")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("showtimesReviews").collect();
    const sorted = rows.sort((a, b) => b.fetchedAt - a.fetchedAt);
    return sorted.slice(0, Math.min(args.limit ?? 50, 200));
  },
});

export const approveProposal = mutation({
  args: { proposalId: v.id("showtimesReviews") },
  handler: async (ctx, args): Promise<{ ok: true; status: string; weekOf?: string; matched?: string[]; unmatched?: string[] }> => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Showtimes proposal not found");
    if (proposal.status !== "pending") {
      return { ok: true, status: proposal.status };
    }

    const result: { weekOf: string; matched: string[]; unmatched: string[] } = await ctx.runMutation((internal as any).showtimes.syncWeeklyShowtimes, {
      weekOf: proposal.weekOf,
      shows: proposal.shows,
    });
    await ctx.db.patch(args.proposalId, {
      status: "approved",
      reviewedAt: Date.now(),
      applyResult: { matched: result.matched, unmatched: result.unmatched },
    });
    return { ok: true, status: "approved", ...result };
  },
});

export const rejectProposal = mutation({
  args: { proposalId: v.id("showtimesReviews"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Showtimes proposal not found");
    if (proposal.status !== "pending") {
      return { ok: true, status: proposal.status };
    }
    await ctx.db.patch(args.proposalId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewNote: args.note?.trim() || undefined,
    });
    return { ok: true, status: "rejected" };
  },
});

// ─── Diff + per-show approval ────────────────────────────────────────────────

type DiffStatus = "new" | "updated" | "unchanged" | "unmatched";

export type ShowDiff = {
  title: string;
  status: DiffStatus;
  productionId?: string;
  showName?: string;
  showId?: string;
  applied: boolean;
  current: Omit<WeeklySchedule, "weekOf"> | null;
  currentWeekOf: string | null;
  proposed: Omit<WeeklySchedule, "weekOf">;
  // Days where proposed differs from current (ignoring weekOf). Empty for
  // unchanged/new/unmatched.
  dayDiffs: Array<{ day: (typeof DAYS)[number]; from: string[]; to: string[] }>;
};

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const getProposalDiff = query({
  args: { proposalId: v.id("showtimesReviews") },
  handler: async (
    ctx,
    args
  ): Promise<{
    proposalId: string;
    weekOf: string;
    status: string;
    fetchedAt: number;
    counts: { new: number; updated: number; unchanged: number; unmatched: number };
    diffs: ShowDiff[];
  }> => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Showtimes proposal not found");

    const titleIndex = await buildBroadwayTitleIndex(ctx);
    const applied = new Set(proposal.appliedTitles ?? []);
    const diffs: ShowDiff[] = [];
    const counts = { new: 0, updated: 0, unchanged: 0, unmatched: 0 };

    for (const row of proposal.shows as PlaybillShow[]) {
      const productionId = findProductionIdForPlaybillTitle(titleIndex, row.title);
      if (!productionId) {
        diffs.push({
          title: row.title,
          status: "unmatched",
          applied: false,
          current: null,
          currentWeekOf: null,
          proposed: row.schedule,
          dayDiffs: [],
        });
        counts.unmatched += 1;
        continue;
      }

      const production = await ctx.db.get(productionId as never);
      const show = production ? await ctx.db.get((production as any).showId) : null;
      const current = (production as any)?.weeklySchedule ?? null;

      if (!current) {
        diffs.push({
          title: row.title,
          status: "new",
          productionId,
          showName: (show as any)?.name,
          showId: (show as any)?._id,
          applied: applied.has(row.title),
          current: null,
          currentWeekOf: null,
          proposed: row.schedule,
          dayDiffs: [],
        });
        counts.new += 1;
        continue;
      }

      const dayDiffs: ShowDiff["dayDiffs"] = [];
      for (const day of DAYS) {
        const from = (current[day] ?? []) as string[];
        const to = row.schedule[day] ?? [];
        if (!arraysEqual(from, to)) dayDiffs.push({ day, from, to });
      }
      const status: DiffStatus = dayDiffs.length === 0 ? "unchanged" : "updated";
      const currentCopy: Omit<WeeklySchedule, "weekOf"> = {
        mon: current.mon,
        tue: current.tue,
        wed: current.wed,
        thu: current.thu,
        fri: current.fri,
        sat: current.sat,
        sun: current.sun,
      };
      diffs.push({
        title: row.title,
        status,
        productionId,
        showName: (show as any)?.name,
        showId: (show as any)?._id,
        applied: applied.has(row.title),
        current: currentCopy,
        currentWeekOf: current.weekOf ?? null,
        proposed: row.schedule,
        dayDiffs,
      });
      counts[status] += 1;
    }

    return {
      proposalId: proposal._id,
      weekOf: proposal.weekOf,
      status: proposal.status,
      fetchedAt: proposal.fetchedAt,
      counts,
      diffs,
    };
  },
});

/**
 * Apply a subset of a proposal's shows and record them on appliedTitles. When
 * every non-unmatched Playbill title has been applied, the proposal status
 * auto-flips to "approved".
 */
export const approveShows = mutation({
  args: {
    proposalId: v.id("showtimesReviews"),
    titles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Showtimes proposal not found");
    if (proposal.status !== "pending") {
      return { ok: true, status: proposal.status, applied: [], skipped: [] };
    }

    const selected = new Set(args.titles);
    const titleIndex = await buildBroadwayTitleIndex(ctx);
    const applied = new Set(proposal.appliedTitles ?? []);
    const newlyApplied: string[] = [];
    const skipped: string[] = [];

    for (const row of proposal.shows as PlaybillShow[]) {
      if (!selected.has(row.title)) continue;
      if (applied.has(row.title)) {
        skipped.push(row.title);
        continue;
      }
      const productionId = findProductionIdForPlaybillTitle(titleIndex, row.title);
      if (!productionId) {
        skipped.push(row.title);
        continue;
      }
      await ctx.db.patch(productionId as never, {
        weeklySchedule: { weekOf: proposal.weekOf, ...row.schedule },
      });
      applied.add(row.title);
      newlyApplied.push(row.title);
    }

    // Does every matchable (non-unmatched) title now have a schedule applied?
    const allMatchedTitles = (proposal.shows as PlaybillShow[])
      .map((s) => s.title)
      .filter((t) => findProductionIdForPlaybillTitle(titleIndex, t));
    const fullyApplied = allMatchedTitles.every((t) => applied.has(t));

    const patch: Record<string, unknown> = {
      appliedTitles: [...applied],
    };
    if (fullyApplied) {
      patch.status = "approved";
      patch.reviewedAt = Date.now();
      patch.applyResult = {
        matched: [...applied],
        unmatched: proposal.unmatchedTitles,
      };
    }
    await ctx.db.patch(args.proposalId, patch as never);

    return {
      ok: true,
      status: fullyApplied ? "approved" : "pending",
      applied: newlyApplied,
      skipped,
    };
  },
});

export const syncFromPlaybill = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }): Promise<
    | { status: "stale"; weekOf: string; expectedWeek: string }
    | {
        status: "synced";
        showCount: number;
        weekOf: string;
        matched: string[];
        unmatched: string[];
      }
  > => {
    const res = await fetch(PLAYBILL_URL, {
      headers: {
        "User-Agent":
          "stageworth-showtimes-bot/1.0 (+https://github.com/benbeau/stageworth)",
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    const weekOf = extractWeekOf(html);
    const expectedWeek = getExpectedWeekOf();
    if (!force && weekOf < expectedWeek) {
      return { status: "stale", weekOf, expectedWeek };
    }

    const shows = parseShowtimesTable(html);
    if (shows.length === 0) {
      throw new Error("Parsed 0 shows from Playbill");
    }

    const result: { weekOf: string; matched: string[]; unmatched: string[] } = await ctx.runMutation(
      (internal as any).showtimes.syncWeeklyShowtimes,
      { weekOf, shows }
    );
    return { status: "synced", showCount: shows.length, ...result };
  },
});
