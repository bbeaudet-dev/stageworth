import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  isLikelyLowQualityShowName,
  mapExternalTypeToShowType,
  normalizeShowName,
  type ShowType,
} from "./showNormalization";

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

// ─── One-time: clear curated playbill-banner images from all shows ───────────
// Run from dashboard: npx convex run seed:clearShowStorageImages
// After running, all shows will have images: [] and the enrichment pipeline
// (Wikipedia / Ticketmaster) will fill in hotlink URLs on the next backfill run.
export const clearShowStorageImages = internalMutation({
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    let cleared = 0;
    for (const show of shows) {
      if (show.images.length === 0) continue;
      for (const storageId of show.images) {
        await ctx.storage.delete(storageId);
      }
      await ctx.db.patch(show._id, { images: [] });
      cleared++;
    }
    return { cleared, total: shows.length };
  },
});

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

const PORTFOLIO_BASE_URL = "https://benbeaudet.com";

interface ShowEntry {
  name: string;
  type: ShowType;
  image: string;
}

const SHOWS_CATALOG: ShowEntry[] = [
  { name: "Hadestown", type: "musical", image: "/images-theatre/hadestown.jpg" },
  { name: "Maybe Happy Ending", type: "musical", image: "/images-theatre/maybe-happy-ending.jpg" },
  { name: "Les Misérables", type: "musical", image: "/images-theatre/les-miserables.jpg" },
  { name: "Hamilton", type: "musical", image: "/images-theatre/hamilton.jpg" },
  { name: "Mexodus", type: "musical", image: "/images-theatre/mexodus.webp" },
  { name: "Operation Mincemeat", type: "musical", image: "/images-theatre/operation-mincemeat.jpg" },
  { name: "Come From Away", type: "musical", image: "/images-theatre/come-from-away.jpg" },
  { name: "Death Becomes Her", type: "musical", image: "/images-theatre/death-becomes-her.jpg" },
  { name: "Phantom of the Opera", type: "musical", image: "/images-theatre/phantom-of-the-opera.jpg" },
  { name: "Two Strangers (Carry a Cake Across New York)", type: "musical", image: "/images-theatre/two-strangers.jpg" },
  { name: "Marcel on the Train", type: "play", image: "/images-theatre/marcel-on-the-train.jpg" },
  { name: "John Proctor is the Villain", type: "play", image: "/images-theatre/john-proctor.jpg" },
  { name: "Suffs", type: "musical", image: "/images-theatre/suffs.jpg" },
  { name: "Water for Elephants", type: "musical", image: "/images-theatre/water-for-elephants.jpg" },
  { name: "Oedipus", type: "play", image: "/images-theatre/oedipus.jpg" },
  { name: "Gypsy", type: "musical", image: "/images-theatre/gypsy.jpg" },
  { name: "Sunset Blvd.", type: "musical", image: "/images-theatre/sunset-blvd.jpg" },
  { name: "The 25th Annual Putnam County Spelling Bee", type: "musical", image: "/images-theatre/spelling-bee.jpg" },
  { name: "Punch", type: "play", image: "/images-theatre/punch.jpg" },
  { name: "Cabaret", type: "musical", image: "/images-theatre/cabaret.jpg" },
  { name: "Job", type: "play", image: "/images-theatre/job.jpg" },
  { name: "High Spirits", type: "musical", image: "/images-theatre/high-spirits.jpg" },
  { name: "Moulin Rouge", type: "musical", image: "/images-theatre/moulin-rouge.jpg" },
  { name: "POTUS", type: "play", image: "/images-theatre/potus.jpg" },
  { name: "Bug", type: "play", image: "/images-theatre/bug.jpg" },
  { name: "Wicked", type: "musical", image: "/images-theatre/wicked.jpg" },
  { name: "The Heart of Robin Hood", type: "play", image: "/images-theatre/the-heart-of-robin-hood.png" },
  { name: "Little Shop of Horrors", type: "musical", image: "/images-theatre/little-shop-of-horrors.jpg" },
  { name: "Floyd Collins", type: "musical", image: "/images-theatre/floyd-collins.jpg" },
  { name: "The Disappear", type: "play", image: "/images-theatre/the-disappear.jpg" },
  { name: "Some Like It Hot", type: "musical", image: "/images-theatre/some-like-it-hot.jpg" },
  { name: "Chicago", type: "musical", image: "/images-theatre/chicago.jpg" },
  { name: "Waiting For Godot", type: "play", image: "/images-theatre/waiting-for-godot.jpg" },
  { name: "Parade", type: "musical", image: "/images-theatre/parade.jpg" },
  { name: "The Other Place", type: "play", image: "/images-theatre/the-other-place.jpg" },
  { name: "RENT", type: "musical", image: "/images-theatre/rent.webp" },
  { name: "Mamma Mia!", type: "musical", image: "/images-theatre/mamma-mia.jpg" },
  { name: "Play That Goes Wrong", type: "play", image: "/images-theatre/play-that-goes-wrong.jpg" },
  { name: "Liberation", type: "play", image: "/images-theatre/liberation.jpg" },
  { name: "Chess", type: "musical", image: "/images-theatre/chess.jpg" },
  { name: "Dead Outlaw", type: "musical", image: "/images-theatre/dead-outlaw.jpg" },
  { name: "The Great Gatsby", type: "musical", image: "/images-theatre/great-gatsby.jpg" },
  { name: "The Outsiders", type: "musical", image: "/images-theatre/the-outsiders.jpg" },
  { name: "Hell's Kitchen", type: "musical", image: "/images-theatre/hells-kitchen.jpg" },
  { name: "& Juliet", type: "musical", image: "/images-theatre/and-juliet.jpg" },
  { name: "Call Me Izzy", type: "play", image: "/images-theatre/call-me-izzy.jpg" },
  { name: "The Last 5 Years", type: "musical", image: "/images-theatre/the-last-5-years.jpg" },
  { name: "Life of Pi", type: "play", image: "/images-theatre/life-of-pi.jpg" },
  { name: "Dear Evan Hansen", type: "musical", image: "/images-theatre/dear-evan-hansen.jpg" },
  { name: "Fiddler on the Roof", type: "musical", image: "/images-theatre/fiddler-on-the-roof.jpg" },
  { name: "In the Heights", type: "musical", image: "/images-theatre/in-the-heights.jpg" },
  { name: "Book of Mormon", type: "musical", image: "/images-theatre/book-of-mormon.jpg" },
  { name: "A Strange Loop", type: "musical", image: "/images-theatre/a-strange-loop.jpg" },
  { name: "Ginger Twinsies", type: "play", image: "/images-theatre/ginger-twinsies.jpg" },
  { name: "Pride & Prejudice", type: "play", image: "/images-theatre/pride-and-prejudice.webp" },
  { name: "Rockettes Christmas Spectacular", type: "dance", image: "/images-theatre/rockettes-christmas-spectacular.webp" },
  { name: "Pen Pals", type: "play", image: "/images-theatre/pen-pals.jpg" },
  { name: "The Notebook", type: "musical", image: "/images-theatre/the-notebook.jpg" },
  { name: "The Rocky Horror Show", type: "musical", image: "/images-theatre/rocky-horror.png" },
  { name: "The Bookstore", type: "play", image: "/images-theatre/the-bookstore.jpg" },
  { name: "Marjorie Prime", type: "play", image: "/images-theatre/marjorie-prime.jpg" },
  { name: "Company", type: "musical", image: "/images-theatre/company.jpg" },
  { name: "Harry Potter and the Cursed Child", type: "play", image: "/images-theatre/harry-potter-cursed-child.jpg" },
  { name: "Shucked", type: "musical", image: "/images-theatre/shucked.jpg" },
  { name: "Data", type: "play", image: "/images-theatre/data.jpg" },
  { name: "Stranger Things: The First Shadow", type: "play", image: "/images-theatre/stranger-things.jpg" },
  { name: "Oh, Mary!", type: "play", image: "/images-theatre/oh-mary.jpg" },
  { name: "Six", type: "musical", image: "/images-theatre/six.jpg" },
  { name: "Lord Nil: Seven Deadly Sins", type: "other", image: "/images-theatre/lord-nil.jpg" },
  { name: "André de Shields is Tartuffe", type: "play", image: "/images-theatre/tartuffe.webp" },
  { name: "An Ark", type: "play", image: "/images-theatre/an-ark.webp" },
  { name: "Perfect Crime", type: "play", image: "/images-theatre/perfect-crime.jpg" },
];

export const checkShowsEmpty = internalQuery({
  handler: async (ctx) => {
    const first = await ctx.db.query("shows").first();
    return !first;
  },
});

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

const wikidataImportEntryValidator = v.object({
  name: v.string(),
  wikidataId: v.string(),
  type: v.optional(showTypeValidator),
  rawType: v.optional(v.string()),
  sourceConfidence: v.optional(v.number()),
});

type ImportReason =
  | "empty_name"
  | "invalid_wikidata_id"
  | "low_quality_name"
  | "unmappable_type"
  | "duplicate_external"
  | "duplicate_normalized";

function addReasonCount(reasonCounts: Record<string, number>, reason: ImportReason) {
  reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
}

// Validated bulk import for historical shows from Wikidata exports.
// Safe to re-run: duplicate checks happen by external ID and normalized name.
// Run: npx convex run seed:importWikidataShows '{"entries":[...], "dryRun": true}'
export const importWikidataShows = internalMutation({
  args: {
    entries: v.array(wikidataImportEntryValidator),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const reasonCounts: Record<string, number> = {};
    const possibleDuplicates: Array<{
      incomingName: string;
      existingName: string;
      wikidataId: string;
      existingShowId: string;
    }> = [];

    type ShowLookup = {
      _id: Id<"shows">;
      name: string;
      normalizedName: string;
      externalSource?: string;
      externalId?: string;
    };

    const existingShows = await ctx.db.query("shows").collect();
    const existingByExternal = new Map<string, ShowLookup>();
    const existingByNormalized = new Map<string, ShowLookup>();
    const batchByExternal = new Map<string, { name: string }>();
    const batchByNormalized = new Map<string, { name: string }>();

    for (const show of existingShows) {
      if (show.externalSource && show.externalId) {
        existingByExternal.set(`${show.externalSource}:${show.externalId}`, show);
      }
      existingByNormalized.set(show.normalizedName, show);
    }

    let inserted = 0;
    let patched = 0;
    let quarantined = 0;
    let skipped = 0;

    for (const entry of args.entries) {
      const normalizedName = normalizeShowName(entry.name);
      if (!normalizedName) {
        quarantined += 1;
        addReasonCount(reasonCounts, "empty_name");
        continue;
      }
      if (!/^Q\d+$/.test(entry.wikidataId)) {
        quarantined += 1;
        addReasonCount(reasonCounts, "invalid_wikidata_id");
        continue;
      }
      if (isLikelyLowQualityShowName(entry.name)) {
        quarantined += 1;
        addReasonCount(reasonCounts, "low_quality_name");
        continue;
      }

      const mappedType =
        entry.type ?? (entry.rawType ? mapExternalTypeToShowType(entry.rawType) : null);
      if (!mappedType) {
        quarantined += 1;
        addReasonCount(reasonCounts, "unmappable_type");
        continue;
      }

      const externalKey = `wikidata:${entry.wikidataId}`;
      const batchExternal = batchByExternal.get(externalKey);
      if (batchExternal) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_external");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: batchExternal.name,
          wikidataId: entry.wikidataId,
          existingShowId: "batch",
        });
        continue;
      }

      const existingExternal = existingByExternal.get(externalKey);
      if (existingExternal) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_external");
        continue;
      }

      const existingNormalized = existingByNormalized.get(normalizedName);
      if (existingNormalized) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_normalized");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: existingNormalized.name,
          wikidataId: entry.wikidataId,
          existingShowId: existingNormalized._id,
        });

        if (
          !dryRun &&
          !existingNormalized.externalSource &&
          !existingNormalized.externalId
        ) {
          const patchData: {
            normalizedName: string;
            externalSource: string;
            externalId: string;
            sourceConfidence?: number;
          } = {
            normalizedName,
            externalSource: "wikidata",
            externalId: entry.wikidataId,
          };
          if (entry.sourceConfidence !== undefined) {
            patchData.sourceConfidence = Math.max(
              0,
              Math.min(1, entry.sourceConfidence)
            );
          }

          await ctx.db.patch(existingNormalized._id, {
            ...patchData,
          });
          existingNormalized.externalSource = "wikidata";
          existingNormalized.externalId = entry.wikidataId;
          existingNormalized.normalizedName = normalizedName;
          patched += 1;
          existingByExternal.set(externalKey, existingNormalized);
        }
        continue;
      }

      const batchNormalized = batchByNormalized.get(normalizedName);
      if (batchNormalized) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_normalized");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: batchNormalized.name,
          wikidataId: entry.wikidataId,
          existingShowId: "batch",
        });
        continue;
      }

      if (!dryRun) {
        const sourceConfidence =
          entry.sourceConfidence !== undefined
            ? Math.max(0, Math.min(1, entry.sourceConfidence))
            : undefined;
        const createdId = await ctx.db.insert("shows", {
          name: entry.name.trim(),
          normalizedName,
          type: mappedType,
          images: [],
          isUserCreated: false,
          externalSource: "wikidata",
          externalId: entry.wikidataId,
          sourceConfidence,
        });

        const created = await ctx.db.get(createdId);
        if (created) {
          existingByExternal.set(externalKey, created);
          existingByNormalized.set(normalizedName, created);
        }
      }
      batchByExternal.set(externalKey, { name: entry.name.trim() });
      batchByNormalized.set(normalizedName, {
        name: entry.name.trim(),
      });
      inserted += 1;
    }

    return {
      dryRun,
      processed: args.entries.length,
      inserted,
      patched,
      skipped,
      quarantined,
      reasonCounts,
      possibleDuplicates,
    };
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
// Run: npx convex run seed:suggestShowMatchesForNames '{"names":["Aladdin","Wicked"],"limitPerName":8}'
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

// Cleanup synthetic theatre labels from early Wikipedia imports.
// Run: npx convex run seed:cleanupSyntheticWikipediaProductions
export const cleanupSyntheticWikipediaProductions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const syntheticLabels = [
      "Wikipedia production",
      "Broadway",
      "Off-Broadway",
      "West End",
      "Tour",
    ];

    const all = await ctx.db.query("productions").collect();
    const toDelete = all.filter((p: any) => {
      if (p.isUserCreated) return false;
      if (!p.theatre) return false;
      if (!syntheticLabels.includes(p.theatre)) return false;
      // Heuristic: our synthetic imports used whole-year dates when present.
      const isSyntheticDate = (d?: string) =>
        !d || /^\d{4}-0?1-0?1$/.test(d) || /^\d{4}-1?2-3?1$/.test(d);
      return isSyntheticDate(p.previewDate) && isSyntheticDate(p.openingDate);
    });

    for (const p of toDelete) {
      await ctx.db.delete(p._id);
    }

    return { removed: toDelete.length, total: all.length };
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
// Run: npx convex run seed:seedBroadwayProductions
export const seedBroadwayProductions = internalAction({
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of BROADWAY_PRODUCTIONS) {
      try {
        const showId = await ctx.runMutation(internal.seed.findOrCreateShow, {
          name: entry.showName,
          type: entry.showType,
        });

        const result = await ctx.runMutation(internal.seed.insertProduction, {
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
// Run: npx convex run seed:seedAdditionalProductions
export const seedAdditionalProductions = internalAction({
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of [...BROADWAY_ADDITIONS, ...OFF_BROADWAY_PRODUCTIONS]) {
      try {
        const showId = await ctx.runMutation(internal.seed.findOrCreateShow, {
          name: entry.showName,
          type: entry.showType,
        });

        const result = await ctx.runMutation(internal.seed.insertProduction, {
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

// Populates the shows table with playbill images from benbeaudet.com.
// Run: npx convex run seed:populateShows
export const populateShows = internalAction({
  handler: async (ctx) => {
    const isEmpty = await ctx.runQuery(internal.seed.checkShowsEmpty);
    if (!isEmpty) {
      throw new Error(
        "Shows table already has entries — clear it first to re-seed"
      );
    }

    const BATCH_SIZE = 10;
    let count = 0;
    const errors: string[] = [];

    for (let i = 0; i < SHOWS_CATALOG.length; i += BATCH_SIZE) {
      const batch = SHOWS_CATALOG.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (show) => {
          try {
            const url = `${PORTFOLIO_BASE_URL}${show.image}`;
            const response = await fetch(url);
            if (!response.ok) {
              errors.push(`${show.name}: HTTP ${response.status}`);
              return;
            }
            const blob = await response.blob();
            const storageId = await ctx.storage.store(blob);

            await ctx.runMutation(internal.seed.insertShow, {
              name: show.name,
              type: show.type,
              storageId,
              isUserCreated: false,
            });
            count++;
          } catch (e) {
            errors.push(
              `${show.name}: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        })
      );
    }

    return { populated: count, errors };
  },
});

function dedupeShowIdList(ids: Id<"shows">[]): Id<"shows">[] {
  const seen = new Set<string>();
  const out: Id<"shows">[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function getShowByName(ctx: any, name: string) {
  return ctx.db
    .query("shows")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .first();
}

async function mergeShowIntoCanonical(
  ctx: any,
  sourceShowId: Id<"shows">,
  targetShowId: Id<"shows">
) {
  // productions.showId
  const sourceProductions = await ctx.db
    .query("productions")
    .withIndex("by_show", (q: any) => q.eq("showId", sourceShowId))
    .collect();
  for (const production of sourceProductions) {
    const existingTargetProduction = await ctx.db
      .query("productions")
      .withIndex("by_show", (q: any) => q.eq("showId", targetShowId))
      .filter((q: any) => q.eq(q.field("theatre"), production.theatre))
      .first();
    if (existingTargetProduction) {
      await ctx.db.delete(production._id);
    } else {
      await ctx.db.patch(production._id, { showId: targetShowId });
    }
  }

  // visits.showId
  const visits = await ctx.db.query("visits").collect();
  for (const visit of visits) {
    if (visit.showId === sourceShowId) {
      await ctx.db.patch(visit._id, { showId: targetShowId });
    }
  }

  // userShows.showId
  const sourceUserShows = await ctx.db
    .query("userShows")
    .collect();
  for (const userShow of sourceUserShows) {
    if (userShow.showId !== sourceShowId) continue;
    const targetUserShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q: any) =>
        q.eq("userId", userShow.userId).eq("showId", targetShowId)
      )
      .first();
    if (targetUserShow) {
      await ctx.db.delete(userShow._id);
    } else {
      await ctx.db.patch(userShow._id, { showId: targetShowId });
    }
  }

  // userRankings.showIds
  const rankings = await ctx.db.query("userRankings").collect();
  for (const ranking of rankings) {
    if (!ranking.showIds.includes(sourceShowId)) continue;
    const remapped = ranking.showIds.map((id: Id<"shows">) =>
      id === sourceShowId ? targetShowId : id
    );
    await ctx.db.patch(ranking._id, { showIds: dedupeShowIdList(remapped) });
  }

  // userLists.showIds
  const lists = await ctx.db.query("userLists").collect();
  for (const list of lists) {
    if (!list.showIds.includes(sourceShowId)) continue;
    const remapped = list.showIds.map((id: Id<"shows">) =>
      id === sourceShowId ? targetShowId : id
    );
    await ctx.db.patch(list._id, { showIds: dedupeShowIdList(remapped) });
  }

  // activityPosts.showId
  const activityPosts = await ctx.db.query("activityPosts").collect();
  for (const post of activityPosts) {
    if (post.showId === sourceShowId) {
      await ctx.db.patch(post._id, { showId: targetShowId });
    }
  }

  await ctx.db.delete(sourceShowId);
}

async function hasShowReferences(ctx: any, showId: Id<"shows">) {
  const [productions, visits, userShows, rankings, lists, posts] = await Promise.all([
    ctx.db
      .query("productions")
      .withIndex("by_show", (q: any) => q.eq("showId", showId))
      .first(),
    ctx.db.query("visits").collect(),
    ctx.db.query("userShows").collect(),
    ctx.db.query("userRankings").collect(),
    ctx.db.query("userLists").collect(),
    ctx.db.query("activityPosts").collect(),
  ]);

  if (productions) return true;
  if (visits.some((v: any) => v.showId === showId)) return true;
  if (userShows.some((u: any) => u.showId === showId)) return true;
  if (rankings.some((r: any) => r.showIds.includes(showId))) return true;
  if (lists.some((l: any) => l.showIds.includes(showId))) return true;
  if (posts.some((p: any) => p.showId === showId)) return true;
  return false;
}

// Cleanup helper for imported catalog noise and known title merges.
// Run:
// npx convex run seed:cleanupShowCatalog '{"canonicalName":"SIX: The Musical","aliasNames":["Six"],"removeNames":["balugrastim"]}'
export const cleanupShowCatalog = internalMutation({
  args: {
    canonicalName: v.string(),
    aliasNames: v.array(v.string()),
    removeNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const merged: string[] = [];
    const removed: string[] = [];
    const skipped: string[] = [];

    const canonical = await getShowByName(ctx, args.canonicalName);
    if (!canonical) {
      throw new Error(`Canonical show not found: ${args.canonicalName}`);
    }

    for (const aliasName of args.aliasNames) {
      const alias = await getShowByName(ctx, aliasName);
      if (!alias) {
        skipped.push(`${aliasName} (not found)`);
        continue;
      }
      if (alias._id === canonical._id) {
        skipped.push(`${aliasName} (same as canonical)`);
        continue;
      }
      await mergeShowIntoCanonical(ctx, alias._id, canonical._id);
      merged.push(aliasName);
    }

    for (const name of args.removeNames) {
      const show = await getShowByName(ctx, name);
      if (!show) {
        skipped.push(`${name} (not found)`);
        continue;
      }
      const referenced = await hasShowReferences(ctx, show._id);
      if (referenced) {
        skipped.push(`${name} (has references)`);
        continue;
      }
      await ctx.db.delete(show._id);
      removed.push(name);
    }

    return { canonical: canonical.name, merged, removed, skipped };
  },
});

// Remove duplicate show rows when a Wikidata-backed canonical exists for the same normalizedName.
// Keeps one Wikidata-backed row per normalizedName and deletes non-Wikidata duplicates
// that have no references anywhere else in the system.
// Run: npx convex run seed:cleanupNonWikidataDuplicateShows
export const cleanupNonWikidataDuplicateShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();

    const byNormalized = new Map<
      string,
      Array<{ _id: Id<"shows">; name: string; externalSource?: string | null }>
    >();
    for (const s of shows) {
      const key = s.normalizedName;
      if (!byNormalized.has(key)) byNormalized.set(key, []);
      byNormalized.get(key)!.push({
        _id: s._id,
        name: s.name,
        externalSource: s.externalSource,
      });
    }

    const removed: string[] = [];
    const kept: string[] = [];
    const skipped: string[] = [];

    for (const [norm, group] of byNormalized.entries()) {
      if (group.length <= 1) continue;

      const wikidataRows = group.filter((g) => g.externalSource === "wikidata");
      if (wikidataRows.length === 0) continue;

      // Prefer the first Wikidata-backed row as canonical.
      const canonical = wikidataRows[0];
      kept.push(`${canonical.name} [${norm}]`);

      for (const row of group) {
        if (row._id === canonical._id) continue;
        const referenced = await hasShowReferences(ctx, row._id);
        if (referenced) {
          skipped.push(`${row.name} (has references)`);
          continue;
        }
        await ctx.db.delete(row._id);
        removed.push(row.name);
      }
    }

    return {
      totalShows: shows.length,
      groupsWithDuplicates: Array.from(byNormalized.values()).filter(
        (g) => g.length > 1
      ).length,
      kept,
      removed,
      skipped,
    };
  },
});

// Hard wipe of all shows that do NOT have externalSource === "wikidata",
// along with their dependent data (productions, visits, userShows, rankings,
// lists, activityPosts). This is destructive and will break references;
// only run when you're explicitly rebuilding from Wikidata.
// Run: npx convex run seed:wipeNonWikidataShows
export const wipeNonWikidataShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const keep: string[] = [];
    const removed: string[] = [];

    for (const show of shows) {
      if (show.externalSource === "wikidata") {
        keep.push(show.name);
        continue;
      }

      const showId = show._id as Id<"shows">;

      // productions
      const prods = await ctx.db
        .query("productions")
        .withIndex("by_show", (q: any) => q.eq("showId", showId))
        .collect();
      for (const p of prods) {
        await ctx.db.delete(p._id);
      }

      // visits
      const visits = await ctx.db.query("visits").collect();
      for (const v of visits) {
        if (v.showId === showId) {
          await ctx.db.delete(v._id);
        }
      }

      // userShows
      const userShows = await ctx.db.query("userShows").collect();
      for (const us of userShows) {
        if (us.showId === showId) {
          await ctx.db.delete(us._id);
        }
      }

      // userRankings.showIds
      const rankings = await ctx.db.query("userRankings").collect();
      for (const ranking of rankings) {
        if (!ranking.showIds.includes(showId)) continue;
        const filtered = ranking.showIds.filter((id: Id<"shows">) => id !== showId);
        await ctx.db.patch(ranking._id, { showIds: dedupeShowIdList(filtered) });
      }

      // userLists.showIds
      const lists = await ctx.db.query("userLists").collect();
      for (const list of lists) {
        if (!list.showIds.includes(showId)) continue;
        const filtered = list.showIds.filter((id: Id<"shows">) => id !== showId);
        await ctx.db.patch(list._id, { showIds: dedupeShowIdList(filtered) });
      }

      // activityPosts
      const posts = await ctx.db.query("activityPosts").collect();
      for (const post of posts) {
        if (post.showId === showId) {
          await ctx.db.delete(post._id);
        }
      }

      await ctx.db.delete(showId);
      removed.push(show.name);
    }

    return {
      keptCount: keep.length,
      removedCount: removed.length,
      keptSample: keep.slice(0, 20),
      removedSample: removed.slice(0, 20),
    };
  },
});

// Re-import a fixed set of important shows directly from Wikidata via their Wikipedia pages.
// This targets shows we previously wiped when removing non-Wikidata rows.
// Run: npx convex run seed:importSpecificWikidataShows
export const importSpecificWikidataShows = internalAction({
  args: {},
  handler: async (ctx) => {
    const targets: Array<{
      showName: string;
      showType: ShowType;
      wikipediaTitle: string;
    }> = [
      { showName: "Mexodus", showType: "musical", wikipediaTitle: "Mexodus (musical)" },
      {
        showName: "The Phantom of the Opera",
        showType: "musical",
        wikipediaTitle: "The Phantom of the Opera (1986 musical)",
      },
      {
        showName: "Operation Mincemeat",
        showType: "musical",
        wikipediaTitle: "Operation Mincemeat (musical)",
      },
      {
        showName: "Death Becomes Her",
        showType: "musical",
        wikipediaTitle: "Death Becomes Her (musical)",
      },
      {
        showName: "Les Misérables",
        showType: "musical",
        wikipediaTitle: "Les Misérables (musical)",
      },
      {
        showName: "Hamilton",
        showType: "musical",
        wikipediaTitle: "Hamilton (musical)",
      },
      {
        showName: "Two Strangers (Carry a Cake Across New York)",
        showType: "musical",
        wikipediaTitle: "Two Strangers (Carry a Cake Across New York)",
      },
      {
        showName: "Sunset Blvd.",
        showType: "musical",
        wikipediaTitle: "Sunset Boulevard (musical)",
      },
      {
        showName: "Marcel on the Train",
        showType: "play",
        wikipediaTitle: "Marcel on the Train",
      },
      {
        showName: "Cabaret",
        showType: "musical",
        wikipediaTitle: "Cabaret (musical)",
      },
      { showName: "Gypsy", showType: "musical", wikipediaTitle: "Gypsy (musical)" },
      { showName: "Punch", showType: "play", wikipediaTitle: "Punch (play)" },
      { showName: "Oedipus", showType: "play", wikipediaTitle: "Oedipus" },
      {
        showName: "Water for Elephants",
        showType: "musical",
        wikipediaTitle: "Water for Elephants (musical)",
      },
      {
        showName: "High Spirits",
        showType: "musical",
        wikipediaTitle: "High Spirits (musical)",
      },
      {
        showName: "POTUS",
        showType: "play",
        wikipediaTitle:
          "POTUS: Or, Behind Every Great Dumbass Are Seven Women Trying to Keep Him Alive",
      },
      {
        showName: "The Heart of Robin Hood",
        showType: "play",
        wikipediaTitle: "The Heart of Robin Hood",
      },
      {
        showName: "Floyd Collins",
        showType: "musical",
        wikipediaTitle: "Floyd Collins (musical)",
      },
      { showName: "The Disappear", showType: "play", wikipediaTitle: "The Disappear" },
      {
        showName: "Moulin Rouge!",
        showType: "musical",
        wikipediaTitle: "Moulin Rouge! (musical)",
      },
    ];

    const entries: Array<{
      name: string;
      wikidataId: string;
      type: ShowType;
      rawType?: string;
    }> = [];
    const missing: Array<{ showName: string; wikipediaTitle: string; reason: string }> = [];

    for (const t of targets) {
      try {
        const query = await fetchJson(
          `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(
            t.wikipediaTitle
          )}&format=json`
        );
        const pages = query?.query?.pages ?? {};
        const page: any = Object.values(pages)[0];
        if (!page || page.missing) {
          missing.push({
            showName: t.showName,
            wikipediaTitle: t.wikipediaTitle,
            reason: "page-missing",
          });
          continue;
        }
        const qid: string | undefined = page.pageprops?.wikibase_item;
        if (!qid || !/^Q\d+$/i.test(qid)) {
          missing.push({
            showName: t.showName,
            wikipediaTitle: t.wikipediaTitle,
            reason: "no-wikibase-item",
          });
          continue;
        }
        entries.push({
          name: t.showName,
          wikidataId: qid,
          type: t.showType,
        });
      } catch (err) {
        missing.push({
          showName: t.showName,
          wikipediaTitle: t.wikipediaTitle,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let importResult: any = null;
    if (entries.length > 0) {
      importResult = await ctx.runMutation(internal.seed.importWikidataShows, {
        entries,
        dryRun: false,
      });
    }

    return {
      requested: targets.length,
      prepared: entries.length,
      importResult,
      missing,
    };
  },
});

function stripGenericTypeTag(name: string): string {
  return name
    .replace(/\s*\((musical|play|opera|operetta|revue|film)\)\s*$/i, "")
    .trim();
}

interface CleanupDecision {
  showId: Id<"shows">;
  oldName: string;
  newName: string;
  type: string;
  action: "rename" | "keep_disambiguated";
}

function buildShowTitleCleanupDecisions(shows: any[]) {
  const byId = new Map<string, any>(shows.map((s) => [s._id, s]));
  const strippedById = new Map<string, string>();
  for (const show of shows) {
    strippedById.set(show._id, stripGenericTypeTag(show.name));
  }

  const strippedNameToTypes = new Map<string, Set<string>>();
  for (const show of shows) {
    const stripped = strippedById.get(show._id)!;
    if (!strippedNameToTypes.has(stripped)) {
      strippedNameToTypes.set(stripped, new Set<string>());
    }
    strippedNameToTypes.get(stripped)!.add(show.type);
  }

  const decisions: CleanupDecision[] = [];
  for (const show of shows) {
    const stripped = strippedById.get(show._id)!;
    if (stripped === show.name) continue;
    const typeSet = strippedNameToTypes.get(stripped) ?? new Set([show.type]);
    const hasCrossTypeCollision = typeSet.size > 1;
    if (hasCrossTypeCollision) {
      decisions.push({
        showId: show._id,
        oldName: show.name,
        newName: show.name,
        type: show.type,
        action: "keep_disambiguated",
      });
    } else {
      decisions.push({
        showId: show._id,
        oldName: show.name,
        newName: stripped,
        type: show.type,
        action: "rename",
      });
    }
  }

  const decisionById = new Map<string, CleanupDecision>();
  for (const d of decisions) {
    decisionById.set(d.showId, d);
  }

  const finalNameById = new Map<string, string>();
  for (const show of shows) {
    const decision = decisionById.get(show._id);
    finalNameById.set(show._id, decision ? decision.newName : show.name);
  }

  const mergeGroups = new Map<string, any[]>();
  for (const show of shows) {
    const finalName = finalNameById.get(show._id)!;
    const key = `${show.type}::${finalName.toLowerCase()}`;
    if (!mergeGroups.has(key)) mergeGroups.set(key, []);
    mergeGroups.get(key)!.push(show);
  }

  const mergePlans: Array<{
    canonicalShowId: Id<"shows">;
    canonicalName: string;
    sourceShowIds: Id<"shows">[];
    sourceNames: string[];
    type: string;
  }> = [];

  for (const group of mergeGroups.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => a._creationTime - b._creationTime);
    const canonical = sorted[0];
    const sources = sorted.slice(1);
    mergePlans.push({
      canonicalShowId: canonical._id,
      canonicalName: finalNameById.get(canonical._id)!,
      sourceShowIds: sources.map((s) => s._id),
      sourceNames: sources.map((s) => s.name),
      type: canonical.type,
    });
  }

  return {
    decisions,
    mergePlans,
    finalNameById,
    byId,
  };
}

// Dry-run cleanup preview for generic "(musical)/(play)/(opera)/(revue)" suffixes.
// Run: npx convex run seed:previewShowTitleCleanup
export const previewShowTitleCleanup = internalQuery({
  args: {
    sampleLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shows = await ctx.db.query("shows").collect();
    const { decisions, mergePlans } = buildShowTitleCleanupDecisions(shows);

    const renameDecisions = decisions.filter((d) => d.action === "rename");
    const keepDisambiguated = decisions.filter(
      (d) => d.action === "keep_disambiguated"
    );
    const sampleLimit = args.sampleLimit ?? 30;

    return {
      totalShows: shows.length,
      decisionsTotal: decisions.length,
      renameCount: renameDecisions.length,
      keepDisambiguatedCount: keepDisambiguated.length,
      mergeGroupCount: mergePlans.length,
      mergeSourceCount: mergePlans.reduce(
        (acc, group) => acc + group.sourceShowIds.length,
        0
      ),
      renameSamples: renameDecisions.slice(0, sampleLimit),
      keepDisambiguatedSamples: keepDisambiguated.slice(0, sampleLimit),
      mergeSamples: mergePlans.slice(0, sampleLimit),
    };
  },
});

// Apply cleanup/merge for generic "(musical)/(play)/(opera)/(revue)" suffixes.
// Run: npx convex run seed:applyShowTitleCleanup
export const applyShowTitleCleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const { decisions, mergePlans, finalNameById, byId } =
      buildShowTitleCleanupDecisions(shows);

    for (const plan of mergePlans) {
      for (const sourceShowId of plan.sourceShowIds) {
        await mergeShowIntoCanonical(ctx, sourceShowId, plan.canonicalShowId);
      }
    }

    const mergedSourceIds = new Set<string>(
      mergePlans.flatMap((p) => p.sourceShowIds.map((id) => String(id)))
    );

    let renamed = 0;
    let normalizedPatched = 0;
    for (const [showId, finalName] of finalNameById.entries()) {
      if (mergedSourceIds.has(showId)) continue;
      const show = byId.get(showId);
      if (!show) continue;
      const normalizedName = normalizeShowName(finalName);
      const patch: { name?: string; normalizedName?: string } = {};
      if (show.name !== finalName) {
        patch.name = finalName;
        renamed += 1;
      }
      if (show.normalizedName !== normalizedName) {
        patch.normalizedName = normalizedName;
        normalizedPatched += 1;
      }
      if (patch.name !== undefined || patch.normalizedName !== undefined) {
        await ctx.db.patch(show._id, patch);
      }
    }

    const keepDisambiguatedCount = decisions.filter(
      (d) => d.action === "keep_disambiguated"
    ).length;

    return {
      totalShowsAnalyzed: shows.length,
      mergedGroups: mergePlans.length,
      mergedSourceRows: mergedSourceIds.size,
      renamed,
      normalizedPatched,
      keepDisambiguatedCount,
    };
  },
});

async function fetchJson(url: string): Promise<any> {
  const full = url.includes("?") ? `${url}&origin=*` : `${url}?origin=*`;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(full, {
        headers: {
          "User-Agent":
            "theatre-diary/1.0 (show/production seeding via Convex; contact: benbeaudet.com)",
        },
      });
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith("You are making too many requests")) {
        const waitMs = 4000 * attempt;
        console.log(
          `[wikipedia-rate-limit] attempt=${attempt}/4 waiting=${waitMs}ms`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${trimmed.slice(0, 200)}`);
      }
      if (trimmed.startsWith("<")) {
        throw new Error("Non-JSON HTML response body");
      }
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const waitMs = 2000 * attempt;
      console.log(
        `[wikipedia-fetch-retry] attempt=${attempt}/4 waiting=${waitMs}ms :: ${message}`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Wikipedia request failed for ${full.slice(0, 200)}... :: ${message}`);
}

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
  handler: async (ctx, args) => {
    const { showName, showType, wikipediaTitle } = args;

    // Resolve or create the show first.
    const showId = await ctx.runMutation(internal.seed.findOrCreateShow, {
      name: showName,
      type: showType,
    });

    const preview = await ctx.runAction(
      internal.seed.previewWikipediaProductionsForShow,
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

        const result = await ctx.runMutation(internal.seed.insertProduction, {
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
