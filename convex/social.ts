import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getConvexUserId, requireConvexUserId } from "./auth";

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

    const now = Date.now();
    await ctx.db.insert("follows", {
      followerUserId: currentUserId,
      followingUserId: args.userId,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      recipientUserId: args.userId,
      actorKind: "user",
      actorUserId: currentUserId,
      type: "new_follow",
      isRead: false,
      createdAt: now,
    });

    const actor = await ctx.db.get(currentUserId);
    const actorLabel = actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";

    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      recipientUserId: args.userId,
      title: "New follower",
      body: `${actorLabel} started following you`,
      data: { type: "new_follow", actorUsername: actor?.username ?? "" },
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

async function enrichWithViewerFollow(
  ctx: any,
  userId: string,
  viewerUserId: string | null
): Promise<{ viewerFollows: boolean; viewerIsSelf: boolean }> {
  const viewerIsSelf = viewerUserId === userId;
  if (!viewerUserId || viewerIsSelf) return { viewerFollows: false, viewerIsSelf };
  const row = await ctx.db
    .query("follows")
    .withIndex("by_follower_following", (q: any) =>
      q.eq("followerUserId", viewerUserId).eq("followingUserId", userId)
    )
    .first();
  return { viewerFollows: row !== null, viewerIsSelf };
}

export const listFollowers = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingUserId", args.userId))
      .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    const users = await Promise.all(
      sorted.map(async (row) => {
        const user = await resolveFollowUserRow(ctx, row.followerUserId);
        if (!user) return null;
        const follow = await enrichWithViewerFollow(ctx, user._id, viewerUserId);
        return { ...user, followedAt: row.createdAt, ...follow };
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
    const viewerUserId = await getConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", args.userId))
      .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    const users = await Promise.all(
      sorted.map(async (row) => {
        const user = await resolveFollowUserRow(ctx, row.followingUserId);
        if (!user) return null;
        const follow = await enrichWithViewerFollow(ctx, user._id, viewerUserId);
        return { ...user, followedAt: row.createdAt, ...follow };
      })
    );
    return users.filter((user): user is NonNullable<typeof user> => user !== null);
  },
});

export const listMyFollowing = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", currentUserId))
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
