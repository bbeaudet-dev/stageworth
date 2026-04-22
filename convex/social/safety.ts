import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireConvexUserId } from "../auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type BlockEdgeSets = {
  blockedByMe: Set<Id<"users">>;
  blockingMe: Set<Id<"users">>;
  hiddenIds: Set<Id<"users">>;
};

/**
 * Returns the set of users the viewer has blocked, the set of users that
 * have blocked the viewer, and the union of both. Callers filter any
 * cross-user surface against `hiddenIds` for symmetric block behavior.
 *
 * Safe to call in queries — read-only.
 */
export async function getBlockEdgeSets(
  ctx: any,
  viewerUserId: Id<"users"> | string | null
): Promise<BlockEdgeSets> {
  if (!viewerUserId) {
    return {
      blockedByMe: new Set(),
      blockingMe: new Set(),
      hiddenIds: new Set(),
    };
  }
  const [blocked, blocking] = await Promise.all([
    ctx.db
      .query("userBlocks")
      .withIndex("by_blocker", (q: any) =>
        q.eq("blockerUserId", viewerUserId)
      )
      .collect(),
    ctx.db
      .query("userBlocks")
      .withIndex("by_blocked", (q: any) =>
        q.eq("blockedUserId", viewerUserId)
      )
      .collect(),
  ]);

  const blockedByMe = new Set<Id<"users">>(
    blocked.map((r: any) => r.blockedUserId)
  );
  const blockingMe = new Set<Id<"users">>(
    blocking.map((r: any) => r.blockerUserId)
  );
  const hiddenIds = new Set<Id<"users">>([
    ...blockedByMe,
    ...blockingMe,
  ]);

  return { blockedByMe, blockingMe, hiddenIds };
}

/**
 * Returns true if user A has blocked user B or vice versa. Cheaper than
 * `getBlockEdgeSets` when you only need the answer for a single pair.
 */
export async function isBlockedEitherWay(
  ctx: any,
  a: Id<"users"> | string,
  b: Id<"users"> | string
): Promise<boolean> {
  if (a === b) return false;
  const [ab, ba] = await Promise.all([
    ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q: any) =>
        q.eq("blockerUserId", a).eq("blockedUserId", b)
      )
      .first(),
    ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q: any) =>
        q.eq("blockerUserId", b).eq("blockedUserId", a)
      )
      .first(),
  ]);
  return ab !== null || ba !== null;
}

// ─── Block / unblock ─────────────────────────────────────────────────────────

export const blockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    if (currentUserId === args.targetUserId) {
      throw new Error("You cannot block yourself");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("User not found");

    const existing = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q) =>
        q
          .eq("blockerUserId", currentUserId)
          .eq("blockedUserId", args.targetUserId)
      )
      .first();
    if (existing) return { blocked: false };

    await ctx.db.insert("userBlocks", {
      blockerUserId: currentUserId,
      blockedUserId: args.targetUserId,
      createdAt: Date.now(),
    });

    // Cascade: remove follows in both directions so blocked users truly
    // disconnect from each other.
    const [followAToB, followBToA] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_follower_following", (q) =>
          q
            .eq("followerUserId", currentUserId)
            .eq("followingUserId", args.targetUserId)
        )
        .first(),
      ctx.db
        .query("follows")
        .withIndex("by_follower_following", (q) =>
          q
            .eq("followerUserId", args.targetUserId)
            .eq("followingUserId", currentUserId)
        )
        .first(),
    ]);
    if (followAToB) await ctx.db.delete(followAToB._id);
    if (followBToA) await ctx.db.delete(followBToA._id);

    // Strip mutual tags on each other's visits and activityPosts. We only
    // touch rows that actually reference the other user, to keep the scan
    // cheap and idempotent.
    const visitsTaggingEitherDirection: Doc<"visits">[] = [];
    const actorVisits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();
    const targetVisits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .collect();

    for (const visit of actorVisits) {
      if (visit.taggedUserIds?.includes(args.targetUserId)) {
        visitsTaggingEitherDirection.push(visit);
      }
    }
    for (const visit of targetVisits) {
      if (visit.taggedUserIds?.includes(currentUserId)) {
        visitsTaggingEitherDirection.push(visit);
      }
    }

    await Promise.all(
      visitsTaggingEitherDirection.map((visit) => {
        const stripped = (visit.taggedUserIds ?? []).filter(
          (id) => id !== currentUserId && id !== args.targetUserId
        );
        return ctx.db.patch(visit._id, {
          taggedUserIds: stripped.length > 0 ? stripped : undefined,
        });
      })
    );

    const actorPosts = await ctx.db
      .query("activityPosts")
      .withIndex("by_actor_createdAt", (q) =>
        q.eq("actorUserId", currentUserId)
      )
      .collect();
    const targetPosts = await ctx.db
      .query("activityPosts")
      .withIndex("by_actor_createdAt", (q) =>
        q.eq("actorUserId", args.targetUserId)
      )
      .collect();

    const postsTaggingEitherDirection: Doc<"activityPosts">[] = [];
    for (const post of actorPosts) {
      if (post.taggedUserIds?.includes(args.targetUserId)) {
        postsTaggingEitherDirection.push(post);
      }
    }
    for (const post of targetPosts) {
      if (post.taggedUserIds?.includes(currentUserId)) {
        postsTaggingEitherDirection.push(post);
      }
    }

    await Promise.all(
      postsTaggingEitherDirection.map((post) => {
        const stripped = (post.taggedUserIds ?? []).filter(
          (id) => id !== currentUserId && id !== args.targetUserId
        );
        return ctx.db.patch(post._id, {
          taggedUserIds: stripped.length > 0 ? stripped : undefined,
        });
      })
    );

    return { blocked: true };
  },
});

export const unblockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    const existing = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q) =>
        q
          .eq("blockerUserId", currentUserId)
          .eq("blockedUserId", args.targetUserId)
      )
      .first();
    if (!existing) return { unblocked: false };
    await ctx.db.delete(existing._id);
    return { unblocked: true };
  },
});

export const listMyBlocks = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await requireConvexUserId(ctx);
    const rows = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", currentUserId))
      .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    const enriched = await Promise.all(
      sorted.map(async (row) => {
        const user = await ctx.db.get(row.blockedUserId);
        if (!user) return null;
        const avatarUrl = user.avatarImage
          ? await ctx.storage.getUrl(user.avatarImage)
          : null;
        return {
          _id: user._id,
          username: user.username,
          name: user.name,
          avatarUrl,
          blockedAt: row.createdAt,
        };
      })
    );
    return enriched.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

// ─── Reports ─────────────────────────────────────────────────────────────────

const MAX_DETAILS_LEN = 1000;
const MAX_SNAPSHOT_LEN = 2000;

const reasonValidator = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("hate"),
  v.literal("sexual"),
  v.literal("violence"),
  v.literal("self_harm"),
  v.literal("impersonation"),
  v.literal("other")
);

function clampDetails(details: string | undefined): string | undefined {
  const trimmed = details?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_DETAILS_LEN) {
    throw new Error(`Details must be ${MAX_DETAILS_LEN} characters or fewer`);
  }
  return trimmed;
}

function clampSnapshot(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, MAX_SNAPSHOT_LEN);
}

export const reportUser = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: reasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporterUserId = await requireConvexUserId(ctx);
    if (reporterUserId === args.targetUserId) {
      throw new Error("You cannot report yourself");
    }
    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("User not found");

    const snapshot = clampSnapshot(
      [target.username, target.name, target.bio, target.location]
        .filter((v) => typeof v === "string" && v.length > 0)
        .join(" · ")
    );

    return await ctx.db.insert("userReports", {
      reporterUserId,
      targetKind: "user",
      targetUserId: args.targetUserId,
      reason: args.reason,
      details: clampDetails(args.details),
      status: "open",
      contentSnapshot: snapshot,
      createdAt: Date.now(),
    });
  },
});

export const reportActivityPost = mutation({
  args: {
    postId: v.id("activityPosts"),
    reason: reasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporterUserId = await requireConvexUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.actorUserId === reporterUserId) {
      throw new Error("You cannot report your own post");
    }

    const snapshot = clampSnapshot(
      [post.notes, post.theatre, post.city].filter(Boolean).join(" · ")
    );

    return await ctx.db.insert("userReports", {
      reporterUserId,
      targetKind: "activityPost",
      targetUserId: post.actorUserId,
      targetPostId: post._id,
      targetVisitId: post.visitId,
      reason: args.reason,
      details: clampDetails(args.details),
      status: "open",
      contentSnapshot: snapshot,
      createdAt: Date.now(),
    });
  },
});

export const reportVisit = mutation({
  args: {
    visitId: v.id("visits"),
    reason: reasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporterUserId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.userId === reporterUserId) {
      throw new Error("You cannot report your own visit");
    }

    const snapshot = clampSnapshot(
      [visit.notes, visit.theatre, visit.city].filter(Boolean).join(" · ")
    );

    return await ctx.db.insert("userReports", {
      reporterUserId,
      targetKind: "visit",
      targetUserId: visit.userId,
      targetVisitId: visit._id,
      reason: args.reason,
      details: clampDetails(args.details),
      status: "open",
      contentSnapshot: snapshot,
      createdAt: Date.now(),
    });
  },
});
