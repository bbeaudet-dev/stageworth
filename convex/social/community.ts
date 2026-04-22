import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireConvexUserId } from "../auth";
import { resolveShowImageUrls } from "../helpers";
import { getBlockEdgeSets } from "./safety";

const MAX_LIMIT = 200;

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

async function hydratePosts(
  ctx: any,
  posts: any[],
  viewerUserId: string,
  hiddenIds: Set<string>
) {
  const hydrated = await Promise.all(
    posts.map(async (post) => {
      const [actor, show, rankings, viewerFollowRow, visit, viewerLikeRow] =
        await Promise.all([
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
          ctx.db
            .query("postLikes")
            .withIndex("by_post_user", (q: any) =>
              q.eq("postId", post._id).eq("userId", viewerUserId),
            )
            .first(),
        ]);

      if (!actor) return null;
      // visit_created posts always need a show; challenge posts may not have one.
      if (post.type === "visit_created" && !show) return null;

      const taggedUsers: { _id: string; username: string; name?: string | null }[] = [];
      for (const uid of post.taggedUserIds ?? []) {
        if (hiddenIds.has(uid)) continue;
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
        likeCount: post.likeCount ?? 0,
        likedByViewer: viewerLikeRow !== null,
        challengeYear: post.challengeYear ?? null,
        challengeTarget: post.challengeTarget ?? null,
        challengeProgress: post.challengeProgress ?? null,
        actor,
        show,
        taggedUsers,
        // Fall back to the visit's guest names for posts created before
        // activityPosts carried them inline.
        taggedGuestNames:
          post.taggedGuestNames ?? visit?.taggedGuestNames ?? [],
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
    const { hiddenIds } = await getBlockEdgeSets(ctx, currentUserId);
    // Overfetch so the filter doesn't starve the feed when a viewer has
    // blocked several active posters.
    const recent = await ctx.db
      .query("activityPosts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(MAX_LIMIT * 5);
    const filtered = recent
      .filter((post) => !hiddenIds.has(post.actorUserId))
      .slice(0, limit);
    return await hydratePosts(ctx, filtered, currentUserId, hiddenIds);
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

    const { hiddenIds } = await getBlockEdgeSets(ctx, currentUserId);

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
      .filter(
        (post) =>
          actorIds.has(post.actorUserId) && !hiddenIds.has(post.actorUserId)
      )
      .slice(0, limit);

    return await hydratePosts(ctx, filtered, currentUserId, hiddenIds);
  },
});
