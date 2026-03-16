import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";
import { getProductionStatus } from "../src/utils/productions";
import { addShowToAllUsersUncategorizedIfEligible } from "./listRules";

export { getProductionStatus } from "../src/utils/productions";

const today = () => new Date().toISOString().split("T")[0];

// Attach the parent show (with resolved image URLs) to a production document.
async function withShow(ctx: any, production: any) {
  const show = await ctx.db.get(production.showId);
  if (!show) return null;
  return {
    ...production,
    show: {
      ...show,
      images: await resolveImageUrls(ctx, show.images),
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

/** Productions opening within the next `days` days (not yet open). */
export const listUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const t = today();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (args.days ?? 90));
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const productions = await ctx.db.query("productions").collect();
    const upcoming = productions.filter((p) => {
      const status = getProductionStatus(p, t);
      if (status !== "announced" && status !== "in_previews") return false;
      // Include if previewDate (or openingDate) is within the window
      const startDate = p.previewDate ?? p.openingDate;
      return startDate !== undefined && startDate <= cutoffStr;
    });
    const results = await Promise.all(upcoming.map((p) => withShow(ctx, p)));
    return results.filter(Boolean);
  },
});

/** Productions whose closing date is within the next `days` days. */
export const listClosingSoon = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const t = today();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (args.days ?? 30));
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const productions = await ctx.db.query("productions").collect();
    const closingSoon = productions.filter(
      (p) =>
        p.closingDate !== undefined &&
        p.closingDate >= t &&
        p.closingDate <= cutoffStr
    );
    const results = await Promise.all(closingSoon.map((p) => withShow(ctx, p)));
    return results.filter(Boolean);
  },
});

/** All productions for a given show. */
export const listByShow = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();
    return productions;
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
