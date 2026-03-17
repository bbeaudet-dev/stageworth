import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";

const MAX_LIMIT = 50;

async function resolveActor(ctx: any, userId: string) {
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

async function resolveShow(ctx: any, showId: string) {
  const show = await ctx.db.get(showId);
  if (!show) return null;
  return {
    _id: show._id,
    name: show.name,
    images: await resolveImageUrls(ctx, show.images),
  };
}

async function hydratePosts(ctx: any, posts: any[], viewerUserId: string) {
  const hydrated = await Promise.all(
    posts.map(async (post) => {
      const [actor, show, rankings, viewerFollowRow] = await Promise.all([
        resolveActor(ctx, post.actorUserId),
        resolveShow(ctx, post.showId),
        ctx.db
          .query("userRankings")
          .withIndex("by_user", (q: any) => q.eq("userId", post.actorUserId))
          .first(),
        post.actorUserId === viewerUserId
          ? Promise.resolve(null)
          : ctx.db
              .query("follows")
              .withIndex("by_follower_following", (q: any) =>
                q.eq("followerUserId", viewerUserId).eq("followingUserId", post.actorUserId)
              )
              .first(),
      ]);
      if (!actor || !show) return null;
      return {
        _id: post._id,
        createdAt: post.createdAt,
        type: post.type,
        visitDate: post.visitDate,
        notes: post.notes,
        city: post.city,
        theatre: post.theatre,
        rankAtPost: post.rankAtPost,
        rankingTotal: rankings?.showIds.length ?? 0,
        viewerFollowsActor: viewerFollowRow !== null,
        actor,
        show,
      };
    })
  );

  return hydrated.filter((post): post is NonNullable<typeof post> => post !== null);
}

export const getGlobalFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 30, MAX_LIMIT));
    const posts = await ctx.db
      .query("activityPosts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    return await hydratePosts(ctx, posts, currentUserId);
  },
});

export const getFollowingFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 30, MAX_LIMIT));

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", currentUserId))
      .collect();
    const actorIds = new Set([
      currentUserId,
      ...followRows.map((row) => row.followingUserId),
    ]);

    const recent = await ctx.db
      .query("activityPosts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(MAX_LIMIT * 5);

    const filtered = recent
      .filter((post) => actorIds.has(post.actorUserId))
      .slice(0, limit);

    return await hydratePosts(ctx, filtered, currentUserId);
  },
});
