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
    theatre: v.string(),
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
    const existing = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .filter((q) => q.eq(q.field("theatre"), args.theatre))
      .first();
    if (existing) return { skipped: true, id: existing._id };

    const id = await ctx.db.insert("productions", {
      ...args,
      isUserCreated: false,
    });
    return { skipped: false, id };
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
