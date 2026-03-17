import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";

async function resolveFollowUserRow(ctx: any, userId: string) {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const avatarUrl = user.avatarImage
    ? await ctx.storage.getUrl(user.avatarImage)
    : null;
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    avatarUrl,
  };
}

export const followUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    if (currentUserId === args.userId) {
      throw new Error("You cannot follow yourself");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerUserId", currentUserId).eq("followingUserId", args.userId)
      )
      .first();
    if (existing) return { followed: false };

    await ctx.db.insert("follows", {
      followerUserId: currentUserId,
      followingUserId: args.userId,
      createdAt: Date.now(),
    });
    return { followed: true };
  },
});

export const unfollowUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerUserId", currentUserId).eq("followingUserId", args.userId)
      )
      .first();
    if (!existing) return { unfollowed: false };
    await ctx.db.delete(existing._id);
    return { unfollowed: true };
  },
});

export const listFollowers = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingUserId", args.userId))
      .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    const users = await Promise.all(
      sorted.map(async (row) => {
        const user = await resolveFollowUserRow(ctx, row.followerUserId);
        return user ? { ...user, followedAt: row.createdAt } : null;
      })
    );
    return users.filter((user): user is NonNullable<typeof user> => user !== null);
  },
});

export const listFollowing = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", args.userId))
      .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    const users = await Promise.all(
      sorted.map(async (row) => {
        const user = await resolveFollowUserRow(ctx, row.followingUserId);
        return user ? { ...user, followedAt: row.createdAt } : null;
      })
    );
    return users.filter((user): user is NonNullable<typeof user> => user !== null);
  },
});
