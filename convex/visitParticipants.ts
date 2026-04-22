import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireConvexUserId } from "./auth";
import { notifyUser } from "./notificationDispatch";
import { applyRankingForVisit } from "./visits";

const rankedTierValidator = v.union(
  v.literal("loved"),
  v.literal("liked"),
  v.literal("okay"),
  v.literal("disliked"),
);

async function requireMyParticipant(
  ctx: any,
  visitId: Id<"visits">,
  userId: Id<"users">,
) {
  const participant = await ctx.db
    .query("visitParticipants")
    .withIndex("by_visit_user", (q: any) =>
      q.eq("visitId", visitId).eq("userId", userId),
    )
    .first();
  if (!participant) throw new Error("You're not tagged on this visit");
  return participant;
}

async function actorLabelFor(ctx: any, userId: Id<"users">) {
  const actor = await ctx.db.get(userId);
  return actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";
}

/** List participants for a visit. Visible to the creator and any participant. */
export const listByVisit = query({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const viewerId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) return [];

    const participants = await ctx.db
      .query("visitParticipants")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();
    const isOwner = visit.userId === viewerId;
    const isParticipant = participants.some((p) => p.userId === viewerId);
    if (!isOwner && !isParticipant) return [];

    return await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const avatarUrl = user?.avatarImage
          ? await ctx.storage.getUrl(user.avatarImage)
          : null;
        return {
          _id: p._id,
          userId: p.userId,
          status: p.status,
          notes: p.notes ?? null,
          respondedAt: p.respondedAt ?? null,
          user: user
            ? { _id: user._id, name: user.name, username: user.username, avatarUrl }
            : null,
        };
      }),
    );
  },
});

/** Count of pending visit-tag invites for the current user (for badges/UI). */
export const countMyPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const pending = await ctx.db
      .query("visitParticipants")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .collect();
    return pending.length;
  },
});

/**
 * Accept a visit tag. Creates (or upgrades) a participant row to "accepted",
 * runs the participant through the same ranking path as createVisit, posts
 * to their feed, and notifies the creator. The first time this is called is
 * the effective "I've joined this visit" action — before that, the creator's
 * tag + notification is the only artifact.
 */
export const acceptVisitTag = mutation({
  args: {
    visitId: v.id("visits"),
    notes: v.optional(v.string()),
    keepCurrentRanking: v.optional(v.boolean()),
    selectedTier: v.optional(rankedTierValidator),
    completedInsertionIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.userId === userId) throw new Error("Creators can't accept their own tag");

    const participant = await requireMyParticipant(ctx, args.visitId, userId);
    if (participant.status === "accepted") return { alreadyAccepted: true };

    const { finalRankingShowIds } = await applyRankingForVisit(ctx, {
      userId,
      showId: visit.showId,
      selectedTier: args.selectedTier,
      completedInsertionIndex: args.completedInsertionIndex,
      keepCurrentRanking: args.keepCurrentRanking,
    });

    const trimmedNotes = args.notes?.trim();
    await ctx.db.patch(participant._id, {
      status: "accepted",
      notes: trimmedNotes && trimmedNotes.length > 0 ? trimmedNotes : undefined,
      respondedAt: Date.now(),
    });

    const rankingIndex = finalRankingShowIds.indexOf(visit.showId);
    await ctx.db.insert("activityPosts", {
      actorUserId: userId,
      type: "visit_created",
      visitId: args.visitId,
      showId: visit.showId,
      productionId: visit.productionId,
      visitDate: visit.date,
      notes: trimmedNotes && trimmedNotes.length > 0 ? trimmedNotes : undefined,
      city: visit.city,
      theatre: visit.theatre,
      rankAtPost: rankingIndex === -1 ? undefined : rankingIndex + 1,
      taggedUserIds: visit.taggedUserIds,
      createdAt: Date.now(),
    });

    // Notify creator that we accepted.
    const show = await ctx.db.get(visit.showId);
    const showName = show?.name ?? "a show";
    const actorLabel = await actorLabelFor(ctx, userId);
    await notifyUser(ctx, {
      recipientUserId: visit.userId,
      actorKind: "user",
      actorUserId: userId,
      type: "visit_tag_accepted",
      visitId: args.visitId,
      showId: visit.showId,
      push: {
        title: "Your tag was accepted",
        body: `${actorLabel} accepted your tag on ${showName}`,
        data: { type: "visit_tag_accepted", visitId: args.visitId },
      },
    });

    return { alreadyAccepted: false };
  },
});

export const declineVisitTag = mutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    const participant = await requireMyParticipant(ctx, args.visitId, userId);
    if (participant.status === "accepted") {
      throw new Error("Use leaveVisit to undo an accepted visit");
    }

    await ctx.db.patch(participant._id, {
      status: "declined",
      respondedAt: Date.now(),
    });

    // Drop from the creator's tagged list (keeps UI tidy; declines are silent there).
    const nextTagged = (visit.taggedUserIds ?? []).filter((id) => id !== userId);
    await ctx.db.patch(args.visitId, {
      taggedUserIds: nextTagged.length > 0 ? nextTagged : undefined,
    });

    const show = await ctx.db.get(visit.showId);
    const showName = show?.name ?? "a show";
    const actorLabel = await actorLabelFor(ctx, userId);
    await notifyUser(ctx, {
      recipientUserId: visit.userId,
      actorKind: "user",
      actorUserId: userId,
      type: "visit_tag_declined",
      visitId: args.visitId,
      showId: visit.showId,
      push: {
        title: "Tag declined",
        body: `${actorLabel} declined your tag on ${showName}`,
        data: { type: "visit_tag_declined", visitId: args.visitId },
      },
    });
  },
});

/**
 * Leave a visit after having accepted it. Removes the participant row, drops
 * the user from `taggedUserIds`, and deletes the participant's feed post.
 * Does NOT remove the show from the participant's rankings/userShows — those
 * may have non-shared history they care about.
 */
export const leaveVisit = mutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    const participant = await requireMyParticipant(ctx, args.visitId, userId);

    await ctx.db.delete(participant._id);

    const nextTagged = (visit.taggedUserIds ?? []).filter((id) => id !== userId);
    await ctx.db.patch(args.visitId, {
      taggedUserIds: nextTagged.length > 0 ? nextTagged : undefined,
    });

    const myPosts = await ctx.db
      .query("activityPosts")
      .withIndex("by_actor_createdAt", (q) => q.eq("actorUserId", userId))
      .collect();
    for (const post of myPosts) {
      if (post.visitId === args.visitId) {
        const likes = await ctx.db
          .query("postLikes")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();
        await Promise.all(likes.map((l) => ctx.db.delete(l._id)));
        await ctx.db.delete(post._id);
      }
    }
  },
});

/** Update just the current user's notes for a shared visit they've accepted. */
export const updateMyParticipantNotes = mutation({
  args: {
    visitId: v.id("visits"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const participant = await requireMyParticipant(ctx, args.visitId, userId);
    if (participant.status !== "accepted") {
      throw new Error("Accept the visit before editing notes");
    }
    const trimmed = args.notes?.trim();
    await ctx.db.patch(participant._id, {
      notes: trimmed && trimmed.length > 0 ? trimmed : undefined,
    });

    // Keep the participant's activity post in sync so the feed reflects edits.
    const myPosts = await ctx.db
      .query("activityPosts")
      .withIndex("by_actor_createdAt", (q) => q.eq("actorUserId", userId))
      .collect();
    for (const post of myPosts) {
      if (post.visitId === args.visitId) {
        await ctx.db.patch(post._id, {
          notes: trimmed && trimmed.length > 0 ? trimmed : undefined,
        });
      }
    }
  },
});
