import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

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

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

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
    return await ctx.db.insert("shows", {
      name: args.name,
      type: args.type,
      images: [args.storageId],
      isUserCreated: args.isUserCreated,
    });
  },
});

// Finds a show by name, or creates it (without image) if it doesn't exist.
export const findOrCreateShow = internalMutation({
  args: { name: v.string(), type: showTypeValidator },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shows")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("shows", {
      name: args.name,
      type: args.type,
      images: [],
      isUserCreated: false,
    });
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
