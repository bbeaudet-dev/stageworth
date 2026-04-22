import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isCatalogPublished } from "./catalogVisibility";
import { requireConvexUserId } from "./auth";
import { resolveProductionPosterUrl, resolveShowImageUrls } from "./helpers";
import {
  getProductionStatus,
  upcomingProductionSortKey,
} from "../src/utils/productions";
import { addShowToAllUsersUncategorizedIfEligible } from "./listRules";

export { getProductionStatus } from "../src/utils/productions";

const today = () => new Date().toISOString().split("T")[0];

async function withShow(ctx: any, production: any) {
  if (!isCatalogPublished(production.dataStatus)) return null;
  const show = await ctx.db.get(production.showId);
  if (!show || !isCatalogPublished(show.dataStatus)) return null;
  const posterUrl = await resolveProductionPosterUrl(ctx, production);
  const showImages = await resolveShowImageUrls(ctx, show);
  return {
    ...production,
    posterUrl: posterUrl ?? null,
    show: {
      ...show,
      images: showImages,
    },
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const productions = await ctx.db.query("productions").collect();
    const results = await Promise.all(productions.map((p) => withShow(ctx, p)));
    return results.filter(Boolean);
  },
});

/** All productions that are currently running (in previews or open). */
export const listCurrent = query({
  args: {},
  handler: async (ctx) => {
    const t = today();
    const productions = await ctx.db.query("productions").collect();
    const current = productions.filter((p) => {
      const status = getProductionStatus(p, t);
      return status === "open" || status === "in_previews";
    });
    const results = await Promise.all(current.map((p) => withShow(ctx, p)));
    return results.filter(Boolean);
  },
});

/**
 * Productions not yet in full run: announced or in previews.
 * If `days` is set, only those whose next preview/opening milestone is on or before that horizon.
 * If `days` is omitted, returns all such productions (any distance in the future).
 */
export const listUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const t = today();
    let cutoffStr: string | null = null;
    if (args.days !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + args.days);
      cutoffStr = cutoff.toISOString().split("T")[0];
    }

    const productions = await ctx.db.query("productions").collect();
    const upcoming = productions.filter((p) => {
      const status = getProductionStatus(p, t);
      if (status !== "announced" && status !== "in_previews") return false;
      if (cutoffStr === null) return true;
      const startDate = p.previewDate ?? p.openingDate;
      return startDate !== undefined && startDate <= cutoffStr;
    });
    const results = await Promise.all(upcoming.map((p) => withShow(ctx, p)));
    const visible = results.filter(Boolean);
    visible.sort((a: NonNullable<(typeof visible)[number]>, b: NonNullable<(typeof visible)[number]>) =>
      upcomingProductionSortKey(a, t).localeCompare(upcomingProductionSortKey(b, t)),
    );
    return visible;
  },
});

/** Productions whose closing date is within the next `days` days (default 10 weeks). */
export const listClosingSoon = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const t = today();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (args.days ?? 70));
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const productions = await ctx.db.query("productions").collect();
    const closingSoon = productions.filter(
      (p) =>
        p.closingDate !== undefined &&
        p.closingDate >= t &&
        p.closingDate <= cutoffStr
    );
    const results = await Promise.all(closingSoon.map((p) => withShow(ctx, p)));
    const visible = results.filter(Boolean);
    /** Soonest closing first. */
    visible.sort((a: NonNullable<(typeof visible)[number]>, b: NonNullable<(typeof visible)[number]>) =>
      (a.closingDate ?? "").localeCompare(b.closingDate ?? ""),
    );
    return visible;
  },
});

function normalizeVenueMatchName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * All productions whose `theatre` string matches the given venue (by normalized
 * name, and city if available). Groups chronologically with poster URLs so the
 * venue page can show a list of shows that have played there.
 */
export const listByVenue = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) return [];

    const venueNames = new Set<string>([
      normalizeVenueMatchName(venue.name),
      ...(venue.aliases ?? []).map(normalizeVenueMatchName),
    ]);
    const venueCity = venue.city?.toLowerCase();

    const productions = await ctx.db.query("productions").collect();
    const matches = productions.filter((p) => {
      if (!isCatalogPublished(p.dataStatus)) return false;
      if (!p.theatre) return false;
      const normalized = normalizeVenueMatchName(p.theatre);
      if (!venueNames.has(normalized)) return false;
      if (venueCity && p.city) {
        return p.city.toLowerCase() === venueCity;
      }
      return true;
    });

    const results = await Promise.all(
      matches.map(async (p) => {
        const show = await ctx.db.get(p.showId);
        if (!show || !isCatalogPublished(show.dataStatus)) return null;
        const posterUrl = await resolveProductionPosterUrl(ctx, p);
        const showImages = await resolveShowImageUrls(ctx, show);
        return {
          _id: p._id,
          showId: p.showId,
          showName: show.name,
          showType: show.type,
          showImages,
          theatre: p.theatre ?? null,
          city: p.city ?? null,
          productionType: p.productionType,
          previewDate: p.previewDate ?? null,
          openingDate: p.openingDate ?? null,
          closingDate: p.closingDate ?? null,
          isOpenRun: p.isOpenRun ?? false,
          isClosed: p.isClosed ?? false,
          posterUrl,
        };
      }),
    );

    const visible = results.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    const today = new Date().toISOString().split("T")[0];
    const rank: Record<string, number> = {
      open: 0,
      open_run: 0,
      in_previews: 1,
      announced: 2,
      closed: 3,
    };
    return visible.sort((a, b) => {
      const statusA = getProductionStatus(a, today);
      const statusB = getProductionStatus(b, today);
      if (rank[statusA] !== rank[statusB]) return rank[statusA] - rank[statusB];
      const aKey = a.openingDate ?? a.previewDate ?? a.closingDate ?? "";
      const bKey = b.openingDate ?? b.previewDate ?? b.closingDate ?? "";
      return bKey.localeCompare(aKey);
    });
  },
});

/** All productions for a given show (raw, no image resolution). */
export const listByShow = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();
    return productions.filter((p) => isCatalogPublished(p.dataStatus));
  },
});

/** All productions for a given show with resolved poster images. */
export const listByShowWithImages = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();
    const visible = productions.filter((p) => isCatalogPublished(p.dataStatus));
    return Promise.all(
      visible.map(async (p) => ({
        ...p,
        posterUrl: await resolveProductionPosterUrl(ctx, p),
      }))
    );
  },
});

export const getById = query({
  args: { id: v.id("productions") },
  handler: async (ctx, args) => {
    const production = await ctx.db.get(args.id);
    if (!production) return null;
    return withShow(ctx, production);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
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
    posterImage: v.optional(v.id("_storage")),
    externalId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);
    const productionId = await ctx.db.insert("productions", {
      ...args,
      isUserCreated: true,
    });

    const todayDate = new Date().toISOString().split("T")[0];
    const status = getProductionStatus(
      {
        previewDate: args.previewDate,
        openingDate: args.openingDate,
        closingDate: args.closingDate,
      },
      todayDate
    );

    if (status !== "closed") {
      await addShowToAllUsersUncategorizedIfEligible(ctx, args.showId);
    }

    return productionId;
  },
});

export const update = mutation({
  args: {
    id: v.id("productions"),
    theatre: v.optional(v.string()),
    city: v.optional(v.string()),
    previewDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});
