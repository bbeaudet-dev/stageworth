import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireConvexUserId } from "../auth";
import { resolveShowImageUrls } from "../helpers";

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
    images: await resolveShowImageUrls(ctx, show),
  };
}

async function hydratePosts(ctx: any, posts: any[], viewerUserId: string) {
  const hydrated = await Promise.all(
    posts.map(async (post) => {
      const [actor, show, rankings, viewerFollowRow, visit] = await Promise.all([
        resolveActor(ctx, post.actorUserId),
        post.showId ? resolveShow(ctx, post.showId) : Promise.resolve(null),
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
        post.visitId ? ctx.db.get(post.visitId) : Promise.resolve(null),
      ]);

      if (!actor) return null;
      // visit_created posts always need a show; challenge posts may not have one.
      if (post.type === "visit_created" && !show) return null;

      const taggedUsers: { _id: string; username: string; name?: string | null }[] = [];
      for (const uid of post.taggedUserIds ?? []) {
        const user = await ctx.db.get(uid);
        if (user) taggedUsers.push({ _id: user._id, username: user.username, name: user.name });
      }

      return {
        _id: post._id,
        createdAt: post.createdAt,
        type: post.type,
        visitId: post.visitId ?? null,
        venueId: visit?.venueId ?? null,
        visitDate: post.visitDate ?? null,
        notes: post.notes ?? null,
        city: post.city ?? null,
        theatre: post.theatre ?? null,
        rankAtPost: post.rankAtPost ?? null,
        rankingTotal: rankings?.showIds.length ?? 0,
        viewerFollowsActor: viewerFollowRow !== null,
        challengeYear: post.challengeYear ?? null,
        challengeTarget: post.challengeTarget ?? null,
        challengeProgress: post.challengeProgress ?? null,
        actor,
        show,
        taggedUsers,
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

export const deleteMyPost = mutation({
  args: { postId: v.id("activityPosts") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.actorUserId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.postId);
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
