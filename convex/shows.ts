import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveImageUrls } from "./helpers";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shows", args);
  },
});
