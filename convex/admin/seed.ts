import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { normalizeShowName, type ShowType } from "../showNormalization";
import { fetchJson } from "./wikiApi";

type ProductionType =
  | "original"
  | "revival"
  | "transfer"
  | "touring"
  | "concert"
  | "workshop"
  | "other";

type DistrictType =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

interface ProductionEntry {
  showName: string;
  showType: ShowType;
  theatre: string;
  city: string;
  district: DistrictType;
  previewDate?: string;
  openingDate?: string;
  closingDate?: string;
  productionType: ProductionType;
}

// All dates sourced directly from Playbill.com on Mar 9, 2026.
// Long-running shows use original opening dates; current venue listed.
const BROADWAY_PRODUCTIONS: ProductionEntry[] = [
  // ── Long-running ─────────────────────────────────────────────────────────
  {
    showName: "Chicago",
    showType: "musical",
    theatre: "Ambassador Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "1996-10-29",
    openingDate: "1996-11-14",
    productionType: "revival",
  },
  {
    showName: "The Lion King",
    showType: "musical",
    theatre: "Minskoff Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "1997-10-15",
    openingDate: "1997-11-13",
    productionType: "original",
  },
  {
    showName: "Wicked",
    showType: "musical",
    theatre: "Gershwin Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2003-09-10",
    openingDate: "2003-10-30",
    productionType: "original",
  },
  {
    showName: "The Book of Mormon",
    showType: "musical",
    theatre: "Eugene O'Neill Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2011-02-24",
    openingDate: "2011-03-24",
    productionType: "original",
  },
  {
    showName: "Aladdin",
    showType: "musical",
    theatre: "New Amsterdam Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2014-02-26",
    openingDate: "2014-03-20",
    productionType: "original",
  },
  {
    showName: "Hamilton",
    showType: "musical",
    theatre: "Richard Rodgers Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2015-07-13",
    openingDate: "2015-08-06",
    productionType: "original",
  },
  {
    showName: "Harry Potter and the Cursed Child",
    showType: "play",
    theatre: "Lyric Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2018-03-16",
    openingDate: "2018-04-22",
    productionType: "original",
  },
  {
    showName: "Moulin Rouge! The Musical",
    showType: "musical",
    theatre: "Al Hirschfeld Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2018-06-25",
    openingDate: "2018-07-25",
    closingDate: "2026-07-26",
    productionType: "original",
  },
  {
    showName: "Hadestown",
    showType: "musical",
    theatre: "Walter Kerr Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2019-03-22",
    openingDate: "2019-04-17",
    productionType: "original",
  },
  {
    showName: "SIX: The Musical",
    showType: "musical",
    theatre: "Lena Horne Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2021-10-14",
    openingDate: "2022-01-25",
    productionType: "original",
  },
  {
    showName: "MJ The Musical",
    showType: "musical",
    theatre: "Neil Simon Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2021-11-30",
    openingDate: "2022-02-01",
    productionType: "original",
  },
  {
    showName: "& Juliet",
    showType: "musical",
    theatre: "Stephen Sondheim Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2022-10-28",
    openingDate: "2022-11-17",
    productionType: "original",
  },
  // ── 2024 ──────────────────────────────────────────────────────────────────
  {
    showName: "The Great Gatsby",
    showType: "musical",
    theatre: "Broadway Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2024-03-29",
    openingDate: "2024-04-25",
    productionType: "original",
  },
  {
    showName: "The Outsiders",
    showType: "musical",
    theatre: "Bernard B. Jacobs Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2024-03-14",
    openingDate: "2024-04-11",
    productionType: "original",
  },
  {
    showName: "Oh, Mary!",
    showType: "play",
    theatre: "Lyceum Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2024-06-26",
    openingDate: "2024-07-11",
    closingDate: "2026-07-05",
    productionType: "original",
  },
  {
    showName: "Maybe Happy Ending",
    showType: "musical",
    theatre: "Belasco Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2024-10-16",
    openingDate: "2024-11-12",
    productionType: "original",
  },
  {
    showName: "Death Becomes Her",
    showType: "musical",
    theatre: "Lunt-Fontanne Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2024-10-23",
    openingDate: "2024-11-21",
    productionType: "original",
  },
  // ── 2025 ──────────────────────────────────────────────────────────────────
  {
    showName: "Operation Mincemeat",
    showType: "musical",
    theatre: "John Golden Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-02-15",
    openingDate: "2025-03-20",
    productionType: "original",
  },
  {
    showName: "Buena Vista Social Club",
    showType: "musical",
    theatre: "Gerald Schoenfeld Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-02-21",
    openingDate: "2025-03-19",
    productionType: "original",
  },
  {
    showName: "Just in Time",
    showType: "musical",
    theatre: "Circle in the Square Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-03-31",
    openingDate: "2025-04-26",
    productionType: "original",
  },
  {
    showName: "Stranger Things: The First Shadow",
    showType: "play",
    theatre: "Marquis Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-03-28",
    openingDate: "2025-04-22",
    productionType: "original",
  },
  {
    showName: "Ragtime",
    showType: "musical",
    theatre: "Vivian Beaumont Theater",
    city: "New York",
    district: "broadway",
    previewDate: "2025-09-26",
    openingDate: "2025-10-16",
    productionType: "revival",
  },
  {
    showName: "Chess",
    showType: "musical",
    theatre: "Imperial Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-10-15",
    openingDate: "2025-11-16",
    productionType: "revival",
  },
  {
    showName: "Two Strangers (Carry a Cake Across New York)",
    showType: "musical",
    theatre: "Longacre Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2025-11-01",
    openingDate: "2025-11-20",
    productionType: "original",
  },
  // ── 2026 — In Previews / Just Opened ─────────────────────────────────────
  {
    showName: "Every Brilliant Thing",
    showType: "play",
    theatre: "Hudson Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2026-02-21",
    openingDate: "2026-03-12",
    productionType: "revival",
  },
  {
    showName: "Death of a Salesman",
    showType: "play",
    theatre: "Winter Garden Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2026-03-06",
    openingDate: "2026-04-09",
    productionType: "revival",
  },
];

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("other")
);

export const insertShow = internalMutation({
  args: {
    name: v.string(),
    type: showTypeValidator,
    storageId: v.id("_storage"),
    isUserCreated: v.boolean(),
  },
  handler: async (ctx, args) => {
    const normalizedName = normalizeShowName(args.name);
    if (!normalizedName) {
      throw new Error("Show name is required");
    }

    const existing = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("shows", {
      name: args.name,
      normalizedName,
      type: args.type,
      images: [args.storageId],
      isUserCreated: args.isUserCreated,
      externalSource: "seed",
    });
  },
});

// Finds a show by name, or creates it (without image) if it doesn't exist.
export const findOrCreateShow = internalMutation({
  args: { name: v.string(), type: showTypeValidator },
  handler: async (ctx, args) => {
    const normalizedName = normalizeShowName(args.name);
    if (!normalizedName) {
      throw new Error("Show name is required");
    }

    const existingByNormalizedName = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (existingByNormalizedName) return existingByNormalizedName._id;

    const existing = await ctx.db
      .query("shows")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("shows", {
      name: args.name,
      normalizedName,
      type: args.type,
      images: [],
      isUserCreated: false,
      externalSource: "seed",
    });
  },
});

export const insertProduction = internalMutation({
  args: {
    showId: v.id("shows"),
    theatre: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.union(
      v.literal("broadway"),
      v.literal("off_broadway"),
      v.literal("off_off_broadway"),
      v.literal("west_end"),
      v.literal("touring"),
      v.literal("regional"),
      v.literal("other")
    ),
    previewDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    productionType: v.union(
      v.literal("original"),
      v.literal("revival"),
      v.literal("transfer"),
      v.literal("touring"),
      v.literal("concert"),
      v.literal("workshop"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    // Skip if a production for this show at this theatre already exists.
    if (args.theatre) {
      const existing = await ctx.db
        .query("productions")
        .withIndex("by_show", (q) => q.eq("showId", args.showId))
        .filter((q) => q.eq(q.field("theatre"), args.theatre))
        .first();
      if (existing) return { skipped: true, id: existing._id };
    }

    const id = await ctx.db.insert("productions", {
      ...args,
      isUserCreated: false,
    });
    return { skipped: false, id };
  },
});

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/** True if `needle` appears in `haystack` as a full token (not e.g. "noon" inside "afternoon"). */
function isPhraseOrWordBoundaryMatch(needle: string, haystack: string): boolean {
  if (!needle || !haystack || needle.length > haystack.length) return false;
  if (!haystack.includes(needle)) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${esc}(\\s|$)`).test(haystack);
}

/** 0–1 score for matching a Playbill-style name to an existing show.normalizedName. */
function similarityForShowMatch(queryNorm: string, showNorm: string): number {
  if (queryNorm === showNorm) return 1;
  if (!queryNorm || !showNorm) return 0;
  if (queryNorm.length >= 3 && showNorm.startsWith(`${queryNorm} `)) {
    return 0.93 + 0.06 * (queryNorm.length / showNorm.length);
  }
  if (showNorm.length >= 3 && queryNorm.startsWith(`${showNorm} `)) {
    return 0.93 + 0.06 * (showNorm.length / queryNorm.length);
  }
  const qInS = isPhraseOrWordBoundaryMatch(queryNorm, showNorm);
  const sInQ = isPhraseOrWordBoundaryMatch(showNorm, queryNorm);
  if (qInS || sInQ) {
    const shorter = Math.min(queryNorm.length, showNorm.length);
    const longer = Math.max(queryNorm.length, showNorm.length);
    if (shorter < 4) {
      // Avoid "da", "art", etc. matching inside longer titles unless exact prefix rule above applied.
      return Math.max(
        1 - levenshteinDistance(queryNorm, showNorm) / longer,
        0
      );
    }
    return 0.86 + 0.13 * (shorter / longer);
  }
  const maxLen = Math.max(queryNorm.length, showNorm.length);
  const lev = 1 - levenshteinDistance(queryNorm, showNorm) / maxLen;
  const wordsQ = new Set(queryNorm.split(" ").filter((w) => w.length > 1));
  const wordsS = new Set(showNorm.split(" ").filter((w) => w.length > 1));
  let inter = 0;
  for (const w of wordsQ) {
    if (wordsS.has(w)) inter += 1;
  }
  const union = wordsQ.size + wordsS.size - inter || 1;
  const jacc = inter / union;
  return Math.max(lev, jacc > 0.25 ? jacc * 0.97 : 0);
}

// Fuzzy match Playbill / paste names to existing shows (same normalization as applyPlaybillProductionPaste).
// Run: npx convex run admin/seed:suggestShowMatchesForNames '{"names":["Aladdin","Wicked"],"limitPerName":8}'
export const suggestShowMatchesForNames = internalQuery({
  args: {
    names: v.array(v.string()),
    limitPerName: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shows = await ctx.db.query("shows").collect();
    const limit = args.limitPerName ?? 8;
    return args.names.map((name) => {
      const qn = normalizeShowName(name);
      const matches = shows
        .map((s) => ({
          showId: s._id,
          name: s.name,
          normalizedName: s.normalizedName,
          score: similarityForShowMatch(qn, s.normalizedName),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return { query: name, normalizedQuery: qn, matches };
    });
  },
});

// Create missing catalog shows (empty images, externalSource seed). Safe to re-run: skips duplicates by normalized name.
// Run after you decide type (musical vs play) per title.
export const bulkFindOrCreateShows = internalMutation({
  args: {
    entries: v.array(
      v.object({
        name: v.string(),
        type: showTypeValidator,
      })
    ),
  },
  handler: async (ctx, args) => {
    const created: string[] = [];
    const alreadyExisted: string[] = [];

    for (const e of args.entries) {
      const normalizedName = normalizeShowName(e.name);
      if (!normalizedName) continue;

      const byNorm = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", normalizedName)
        )
        .first();
      if (byNorm) {
        alreadyExisted.push(e.name);
        continue;
      }

      const byName = await ctx.db
        .query("shows")
        .withIndex("by_name", (q) => q.eq("name", e.name))
        .first();
      if (byName) {
        alreadyExisted.push(e.name);
        continue;
      }

      await ctx.db.insert("shows", {
        name: e.name,
        normalizedName,
        type: e.type,
        images: [],
        isUserCreated: false,
        externalSource: "seed",
      });
      created.push(e.name);
    }

    return { created, alreadyExisted };
  },
});

const playbillPasteDistrict = v.union(
  v.literal("broadway"),
  v.literal("off_broadway"),
  v.literal("off_off_broadway"),
  v.literal("west_end"),
  v.literal("touring"),
  v.literal("regional"),
  v.literal("other")
);

const playbillPasteProductionType = v.union(
  v.literal("original"),
  v.literal("revival"),
  v.literal("transfer"),
  v.literal("touring"),
  v.literal("concert"),
  v.literal("workshop"),
  v.literal("other")
);

// Paste JSON from data/convex-paste-playbill-productions.json (Convex dashboard → Run function).
// Resolves show by normalizeShowName(showName); skips if same showId + theatre already exists.
export const applyPlaybillProductionPaste = internalMutation({
  args: {
    items: v.array(
      v.object({
        showName: v.string(),
        theatre: v.optional(v.string()),
        city: v.optional(v.string()),
        district: playbillPasteDistrict,
        previewDate: v.optional(v.string()),
        openingDate: v.optional(v.string()),
        closingDate: v.optional(v.string()),
        productionType: v.optional(playbillPasteProductionType),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const inserted: string[] = [];
    const skippedDuplicate: string[] = [];
    const missingShow: string[] = [];

    for (const item of args.items) {
      const normalizedName = normalizeShowName(item.showName);
      if (!normalizedName) {
        missingShow.push(`${item.showName} (empty normalized name)`);
        continue;
      }
      const show = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", normalizedName)
        )
        .first();
      if (!show) {
        missingShow.push(item.showName);
        continue;
      }

      if (item.theatre) {
        const existing = await ctx.db
          .query("productions")
          .withIndex("by_show", (q) => q.eq("showId", show._id))
          .filter((q) => q.eq(q.field("theatre"), item.theatre))
          .first();
        if (existing) {
          skippedDuplicate.push(item.showName);
          continue;
        }
      }

      await ctx.db.insert("productions", {
        showId: show._id,
        theatre: item.theatre,
        city: item.city ?? "New York",
        district: item.district,
        previewDate: item.previewDate,
        openingDate: item.openingDate,
        closingDate: item.closingDate,
        productionType: item.productionType ?? "other",
        isUserCreated: false,
        notes: item.notes,
      });
      inserted.push(item.showName);
    }

    return { inserted, skippedDuplicate, missingShow };
  },
});

// Broadway shows missed in the initial seed (also from Playbill.com, Mar 9 2026).
const BROADWAY_ADDITIONS: ProductionEntry[] = [
  {
    showName: "Giant",
    showType: "play",
    theatre: "Music Box Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2026-03-11",
    openingDate: "2026-03-23",
    productionType: "transfer",
  },
  {
    showName: "Cats: The Jellicle Ball",
    showType: "musical",
    theatre: "Broadhurst Theatre",
    city: "New York",
    district: "broadway",
    previewDate: "2026-03-18",
    openingDate: "2026-04-07",
    productionType: "revival",
  },
  {
    showName: "Becky Shaw",
    showType: "play",
    theatre: "Helen Hayes Theater",
    city: "New York",
    district: "broadway",
    previewDate: "2026-03-18",
    openingDate: "2026-04-08",
    closingDate: "2026-06-14",
    productionType: "revival",
  },
];

// Off-Broadway productions. Dates from Playbill.com on Mar 9, 2026.
const OFF_BROADWAY_PRODUCTIONS: ProductionEntry[] = [
  // Long-running
  {
    showName: "Little Shop of Horrors",
    showType: "musical",
    theatre: "Westside Theatre (Upstairs)",
    city: "New York",
    district: "off_broadway",
    previewDate: "2019-09-17",
    openingDate: "2019-10-17",
    productionType: "revival",
  },
  // Current
  {
    showName: "11 to Midnight",
    showType: "dance",
    theatre: "Orpheum Theatre",
    city: "New York",
    district: "off_broadway",
    previewDate: "2026-01-28",
    openingDate: "2026-02-11",
    closingDate: "2026-04-19",
    productionType: "original",
  },
  {
    showName: "Spare Parts",
    showType: "play",
    theatre: "Theatre Three @ Theatre Row",
    city: "New York",
    district: "off_broadway",
    previewDate: "2026-02-26",
    openingDate: "2026-03-08",
    closingDate: "2026-04-10",
    productionType: "original",
  },
  // Just opened
  {
    showName: "No Singing in the Navy",
    showType: "musical",
    theatre: "Playwrights Horizons/Peter Jay Sharp Theater",
    city: "New York",
    district: "off_broadway",
    previewDate: "2026-03-18",
    openingDate: "2026-03-29",
    closingDate: "2026-04-19",
    productionType: "original",
  },
];

// Seeds the productions table with all current & upcoming Broadway shows.
// Dates sourced from Playbill.com on Mar 9, 2026.
// Safe to run multiple times — skips already-existing productions.
// Run: npx convex run admin/seed:seedBroadwayProductions
export const seedBroadwayProductions = internalAction({
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of BROADWAY_PRODUCTIONS) {
      try {
        const showId = await ctx.runMutation(internal.admin.seed.findOrCreateShow, {
          name: entry.showName,
          type: entry.showType,
        });

        const result = await ctx.runMutation(internal.admin.seed.insertProduction, {
          showId,
          theatre: entry.theatre,
          city: entry.city,
          district: entry.district,
          previewDate: entry.previewDate,
          openingDate: entry.openingDate,
          closingDate: entry.closingDate,
          productionType: entry.productionType,
        });

        if (result.skipped) skipped++;
        else created++;
      } catch (e) {
        errors.push(
          `${entry.showName}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return { created, skipped, errors };
  },
});

// Seeds missed Broadway shows + Off-Broadway productions.
// Dates sourced from Playbill.com on Mar 9, 2026.
// Safe to run multiple times — skips already-existing productions.
// Run: npx convex run admin/seed:seedAdditionalProductions
export const seedAdditionalProductions = internalAction({
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of [...BROADWAY_ADDITIONS, ...OFF_BROADWAY_PRODUCTIONS]) {
      try {
        const showId = await ctx.runMutation(internal.admin.seed.findOrCreateShow, {
          name: entry.showName,
          type: entry.showType,
        });

        const result = await ctx.runMutation(internal.admin.seed.insertProduction, {
          showId,
          theatre: entry.theatre,
          city: entry.city,
          district: entry.district,
          previewDate: entry.previewDate,
          openingDate: entry.openingDate,
          closingDate: entry.closingDate,
          productionType: entry.productionType,
        });

        if (result.skipped) skipped++;
        else created++;
      } catch (e) {
        errors.push(
          `${entry.showName}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return { created, skipped, errors };
  },
});

function toWikimediaUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const clean = filename.trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    clean
  )}`;
}

function inferDistrictFromText(text: string): DistrictType {
  const lower = text.toLowerCase();
  if (lower.includes("off-broadway")) return "off_broadway";
  if (lower.includes("broadway")) return "broadway";
  if (lower.includes("west end")) return "west_end";
  if (lower.includes("tour")) return "touring";
  if (lower.includes("regional")) return "regional";
  return "other";
}

function extractYears(text: string): {
  approxStartYear: number | null;
  approxEndYear: number | null;
} {
  const matches = Array.from(text.matchAll(/\b(19|20)\d{2}\b/g));
  const years = matches.map((m) => Number(m[0]));
  if (years.length === 0) return { approxStartYear: null, approxEndYear: null };
  if (years.length === 1) {
    return { approxStartYear: years[0], approxEndYear: null };
  }
  return {
    approxStartYear: Math.min(...years),
    approxEndYear: Math.max(...years),
  };
}

function extractInfoboxProductionsField(wikitext: string): string | null {
  const infoboxMatch = wikitext.match(/\{\{Infobox[^]*?\n\}\}/i);
  if (!infoboxMatch) return null;
  const box = infoboxMatch[0];
  const lines = box.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const match = line.match(/^\|\s*productions\s*=\s*(.*)$/i);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function splitUblProductions(raw: string): string[] {
  const trimmed = raw.trim();
  const ublMatch = trimmed.match(/^\{\{ubl?i?\s*\|([\s\S]*?)\}\}$/i);
  if (!ublMatch) return [raw];
  const inner = ublMatch[1];
  return inner
    .split("|")
    .map((part) => part.replace(/<!--.*?-->/g, "").trim())
    .filter((part) => part.length > 0);
}

function extractProductionCandidatesFromInfoboxProductions(raw: string) {
  const out: Array<{
    district: DistrictType;
    approxStartYear: number | null;
    approxEndYear: number | null;
    theatreName: string | null;
    city: string | null;
    source: string;
    raw: string;
  }> = [];

  // Handle both simple <br>-separated lists and {{ubl|...}} / {{ubli|...}} templates.
  const baseParts = raw
    .split(/<br\s*\/?>/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const parts: string[] = [];
  for (const part of baseParts) {
    for (const sub of splitUblProductions(part)) {
      parts.push(sub);
    }
  }

  for (const part of parts) {
    const district = inferDistrictFromText(part);
    const { approxStartYear, approxEndYear } = extractYears(part);
    out.push({
      district,
      approxStartYear,
      approxEndYear,
      theatreName: null,
      city: null,
      source: "wikipedia_infobox_productions",
      raw: part,
    });
  }

  return out;
}

export const previewWikipediaProductionsForShow = internalAction({
  args: {
    title: v.string(),
  },
  handler: async (_ctx, args) => {
    const { title } = args;

    // 1) Basic page data
    const query = await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops|info&inprop=url&titles=${encodeURIComponent(
        title
      )}&format=json`
    );
    const pages = query?.query?.pages ?? {};
    const page: any = Object.values(pages)[0];
    if (!page) {
      return {
        requestedTitle: title,
        found: false as const,
        reason: "page-missing",
      };
    }

    // 2) Parse with wikitext + sections + categories
    const parse = await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
        title
      )}&prop=wikitext|sections|categories&format=json`
    );
    const wikitext: string = parse?.parse?.wikitext?.["*"] ?? "";
    const sections: any[] = parse?.parse?.sections ?? [];
    const categories: any[] = parse?.parse?.categories ?? [];

    const productionsField = extractInfoboxProductionsField(wikitext);
    const productions = productionsField
      ? extractProductionCandidatesFromInfoboxProductions(productionsField)
      : [];

    const infoboxImageFromPageProps =
      (page.pageprops && page.pageprops.page_image) || null;

    const wikibaseId: string | null = page.pageprops?.wikibase_item ?? null;
    let wikidataImageFile: string | null = null;
    if (wikibaseId) {
      try {
        const wd = await fetchJson(
          `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
            wikibaseId
          )}.json`
        );
        const entity = wd?.entities?.[wikibaseId];
        const claims = entity?.claims ?? {};
        const p18 = Array.isArray(claims.P18) ? claims.P18[0] : null;
        const val = p18?.mainsnak?.datavalue?.value;
        if (typeof val === "string") {
          wikidataImageFile = val;
        }
      } catch (err) {
        console.log(
          `[wikidata-image-error] id=${wikibaseId} :: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    const imageFileName = infoboxImageFromPageProps || wikidataImageFile || null;
    const imageSource = infoboxImageFromPageProps
      ? "wikipedia_page_image"
      : wikidataImageFile
      ? "wikidata_p18"
      : null;

    return {
      requestedTitle: title,
      found: true as const,
      wikipediaUrl: page.fullurl,
      wikipediaPageId: page.pageid,
      wikipediaTitle: page.title,
      wikidataId: wikibaseId,
      imageFileName,
      imageUrl: toWikimediaUrl(imageFileName),
      imageSource,
      categories: categories.map((c: any) => c["*"]),
      sectionHeadings: sections.map((s: any) => ({
        index: s.index,
        number: s.number,
        level: s.level,
        line: s.line,
      })),
      productions,
    };
  },
});

export const importWikipediaProductionsForShow = internalAction({
  args: {
    showName: v.string(),
    showType: showTypeValidator,
    wikipediaTitle: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    showName: string;
    wikipediaTitle: string;
    created: number;
    skipped: number;
    reason?: string;
    errors?: string[];
    imageUrl?: string | null;
  }> => {
    const { showName, showType, wikipediaTitle } = args;

    // Resolve or create the show first.
    const showId = await ctx.runMutation(internal.admin.seed.findOrCreateShow, {
      name: showName,
      type: showType,
    });

    const preview = await ctx.runAction(
      internal.admin.seed.previewWikipediaProductionsForShow,
      { title: wikipediaTitle }
    );

    if (!preview.found) {
      return {
        showName,
        wikipediaTitle,
        created: 0,
        skipped: 0,
        reason: preview.reason ?? "not-found",
      };
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const candidate of preview.productions) {
      try {
        const district = candidate.district as DistrictType;

        // For now we do NOT try to infer exact theatre names from Wikipedia;
        // district carries the primary signal. Leave theatre undefined.
        const theatre: string | undefined = undefined;
        const city: string | undefined = undefined;

        // Derive rough dates from years, if present.
        const openingDate =
          candidate.approxStartYear != null
            ? `${candidate.approxStartYear}-01-01`
            : undefined;
        const closingDate =
          candidate.approxEndYear != null
            ? `${candidate.approxEndYear}-12-31`
            : undefined;

        const result = await ctx.runMutation(internal.admin.seed.insertProduction, {
          showId,
          theatre,
          city,
          district,
          previewDate: openingDate,
          openingDate,
          closingDate,
          productionType: "original",
        });

        if (result.skipped) skipped += 1;
        else created += 1;
      } catch (e) {
        errors.push(
          `${candidate.raw}: ${
            e instanceof Error ? e.message : String(e)
          }`.slice(0, 500)
        );
      }
    }

    return {
      showName,
      wikipediaTitle,
      created,
      skipped,
      errors,
      imageUrl: preview.imageUrl,
    };
  },
});
