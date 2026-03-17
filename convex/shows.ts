import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveImageUrls } from "./helpers";
import { normalizeShowName } from "./showNormalization";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    return Promise.all(
      shows.map(async (show) => ({
        ...show,
        images: await resolveImageUrls(ctx, show.images),
      }))
    );
  },
});

export const getById = query({
  args: { id: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.id);
    if (!show) return null;
    return { ...show, images: await resolveImageUrls(ctx, show.images) };
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("shows")) },
  handler: async (ctx, args) => {
    const shows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const presentShows = shows.filter(
      (show): show is NonNullable<typeof show> => show !== null
    );
    return Promise.all(
      presentShows.map(async (show) => ({
        ...show,
        images: await resolveImageUrls(ctx, show.images),
      }))
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("musical"),
      v.literal("play"),
      v.literal("opera"),
      v.literal("dance"),
      v.literal("other")
    ),
    subtype: v.optional(v.string()),
    images: v.array(v.id("_storage")),
    isUserCreated: v.boolean(),
    externalSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedName = normalizeShowName(args.name);
    if (!normalizedName) {
      throw new Error("Show name is required");
    }

    if (args.externalSource && args.externalId) {
      const { externalSource, externalId } = args;
      const existingByExternal = await ctx.db
        .query("shows")
        .withIndex("by_external_source_id", (q) =>
          q.eq("externalSource", externalSource).eq("externalId", externalId)
        )
        .first();
      if (existingByExternal) {
        throw new Error("A show with this external identifier already exists");
      }
    }

    const existingByNormalizedName = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (existingByNormalizedName) {
      throw new Error("A show with this name already exists");
    }

    return await ctx.db.insert("shows", { ...args, normalizedName });
  },
});
