import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shows").collect();
  },
});

export const getById = query({
  args: { id: v.id("shows") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("shows")) },
  handler: async (ctx, args) => {
    const shows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return shows.filter(Boolean);
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
    images: v.array(v.string()),
    isUserCreated: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shows", args);
  },
});
