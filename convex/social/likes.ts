import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireConvexUserId } from "../auth";
import { notifyUser } from "../notificationDispatch";
import { getBlockEdgeSets } from "./safety";

/**
 * Toggle a like on a community feed post. Returns the new (liked, likeCount)
 * so optimistic UI can confirm or roll back without waiting for a feed refetch.
 *
 * Design:
 *   - `postLikes` is the source of truth; insert = liked, delete = unliked.
 *   - `activityPosts.likeCount` is denormalized and updated atomically so feed
 *     queries don't have to aggregate on every read.
 *   - Self-likes are allowed (consistent with most feeds) but never notify.
 *   - Notifications are created on new likes from other users. Consecutive
 *     like-unlike-like cycles produce at most one notification until read, by
 *     checking for an existing unread row for the same (post, liker).
 */
export const togglePostLike = mutation({
  args: { postId: v.id("activityPosts") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", userId),
      )
      .first();

    const currentCount = post.likeCount ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const nextCount = Math.max(0, currentCount - 1);
      await ctx.db.patch(args.postId, { likeCount: nextCount });
      return { liked: false, likeCount: nextCount };
    }

    await ctx.db.insert("postLikes", {
      postId: args.postId,
      userId,
      createdAt: Date.now(),
    });
    const nextCount = currentCount + 1;
    await ctx.db.patch(args.postId, { likeCount: nextCount });

    // Notify the post author (but not for self-likes). Dedupe: only create a
    // notification if the author doesn't already have an unread `post_like`
    // from this same user on this post.
    if (post.actorUserId !== userId) {
      const existingNotif = await ctx.db
        .query("notifications")
        .withIndex("by_recipient_isRead", (q) =>
          q.eq("recipientUserId", post.actorUserId).eq("isRead", false),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "post_like"),
            q.eq(q.field("actorUserId"), userId),
            q.eq(q.field("postId"), args.postId),
          ),
        )
        .first();

      if (!existingNotif) {
        const [actor, show] = await Promise.all([
          ctx.db.get(userId),
          post.showId ? ctx.db.get(post.showId) : Promise.resolve(null),
        ]);
        const actorLabel =
          actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";
        const body = show?.name
          ? `${actorLabel} liked your post about ${show.name}`
          : `${actorLabel} liked your post`;

        await notifyUser(ctx, {
          recipientUserId: post.actorUserId,
          actorKind: "user",
          actorUserId: userId,
          type: "post_like",
          postId: args.postId,
          visitId: post.visitId,
          showId: post.showId,
          push: {
            title: "New like",
            body,
            data: {
              type: "post_like",
              postId: String(args.postId),
              ...(post.visitId ? { visitId: String(post.visitId) } : {}),
            },
          },
        });
      }
    }

    return { liked: true, likeCount: nextCount };
  },
});

/**
 * List the users who liked a given post. Excludes blocked users, newest first.
 */
export const listPostLikers = query({
  args: { postId: v.id("activityPosts"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const { hiddenIds } = await getBlockEdgeSets(ctx, userId);
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));

    const rows = await ctx.db
      .query("postLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(limit * 2);

    const likers = await Promise.all(
      rows
        .filter((row) => !hiddenIds.has(row.userId))
        .slice(0, limit)
        .map(async (row) => {
          const user = await ctx.db.get(row.userId);
          if (!user) return null;
          const avatarUrl = user.avatarImage
            ? await ctx.storage.getUrl(user.avatarImage)
            : null;
          return {
            _id: user._id,
            username: user.username,
            name: user.name,
            avatarUrl,
            likedAt: row.createdAt,
          };
        }),
    );
    return likers.filter((l): l is NonNullable<typeof l> => l !== null);
  },
});
