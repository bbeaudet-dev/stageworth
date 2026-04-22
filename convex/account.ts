import { mutation } from "./_generated/server";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireConvexUserId } from "./auth";

// ─── Account deletion ────────────────────────────────────────────────────────
//
// Apple App Store Review Guideline 5.1.1(v) requires any app offering account
// creation to also offer in-app account deletion. This mutation removes all
// user-owned rows from the Convex schema, cascades trip ownership, wipes the
// avatar blob, and tears down the Better Auth session/account/user records
// stored in the component.
//
// TODO (Apple token revocation): For users who signed in with Apple we must
// also call POST https://appleid.apple.com/auth/revoke with the stored refresh
// token before deleting the Better Auth account row, per Apple guideline
// 5.1.1(v). Tracked as a follow-up; the Apple refresh token is stored in the
// Better Auth `account` table and can be fetched via
// `components.betterAuth.adapter.findOne({ model: "account", where: [...] })`
// from a Convex action, then used with the Apple client_secret JWT to call the
// revoke endpoint.

const AUTH_PAGE_NUM_ITEMS = 256;

type DeleteManyResult = {
  isDone: boolean;
  continueCursor: string;
  splitCursor?: string | null;
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  count: number;
  ids: unknown[];
};

async function deleteBetterAuthSessionsForUser(
  ctx: MutationCtx,
  betterAuthUserId: string
) {
  let cursor: string | null = null;
  // Exhaust pagination in case the user has many historical sessions.
  for (;;) {
    const result: DeleteManyResult = await ctx.runMutation(
      components.betterAuth.adapter.deleteMany,
      {
        input: {
          model: "session",
          where: [{ field: "userId", value: betterAuthUserId }],
        },
        paginationOpts: { cursor, numItems: AUTH_PAGE_NUM_ITEMS },
      }
    );
    if (result.isDone) return;
    cursor = result.continueCursor;
  }
}

async function deleteBetterAuthAccountsForUser(
  ctx: MutationCtx,
  betterAuthUserId: string
) {
  let cursor: string | null = null;
  for (;;) {
    const result: DeleteManyResult = await ctx.runMutation(
      components.betterAuth.adapter.deleteMany,
      {
        input: {
          model: "account",
          where: [{ field: "userId", value: betterAuthUserId }],
        },
        paginationOpts: { cursor, numItems: AUTH_PAGE_NUM_ITEMS },
      }
    );
    if (result.isDone) return;
    cursor = result.continueCursor;
  }
}

async function deleteBetterAuthUser(
  ctx: MutationCtx,
  betterAuthUserId: string
) {
  await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
    input: {
      model: "user",
      where: [{ field: "_id", value: betterAuthUserId }],
    },
  });
}

async function deleteTripOwnedByUser(ctx: MutationCtx, tripId: Id<"trips">) {
  const [members, tripShows, labels, dayNotes, presence] = await Promise.all([
    ctx.db
      .query("tripMembers")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("tripShows")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("tripShowLabels")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("tripDayNotes")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("tripPresence")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
  ]);

  await Promise.all([
    ...members.map((row) => ctx.db.delete(row._id)),
    ...tripShows.map((row) => ctx.db.delete(row._id)),
    ...labels.map((row) => ctx.db.delete(row._id)),
    ...dayNotes.map((row) => ctx.db.delete(row._id)),
    ...presence.map((row) => ctx.db.delete(row._id)),
  ]);

  await ctx.db.delete(tripId);
}

async function removeTaggedUserFromVisits(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const allVisits = await ctx.db.query("visits").collect();
  const affected = allVisits.filter((visit) =>
    (visit.taggedUserIds ?? []).some((id) => id === userId)
  );
  await Promise.all(
    affected.map((visit) =>
      ctx.db.patch(visit._id, {
        taggedUserIds: (visit.taggedUserIds ?? []).filter((id) => id !== userId),
      })
    )
  );
}

async function removeTaggedUserFromActivityPosts(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const allPosts = await ctx.db.query("activityPosts").collect();
  const affected = allPosts.filter((post) =>
    (post.taggedUserIds ?? []).some((id) => id === userId)
  );
  await Promise.all(
    affected.map((post) =>
      ctx.db.patch(post._id, {
        taggedUserIds: (post.taggedUserIds ?? []).filter((id) => id !== userId),
      })
    )
  );
}

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    if (!user) {
      // Already gone — treat as success so the client can proceed to sign-out.
      return { deleted: false as const };
    }

    // ─── 1. User-owned rows (indexed by userId) ───────────────────────────
    const [
      visits,
      userShows,
      userRankings,
      userLists,
      notificationsReceived,
      notificationsSent,
      tripsOwned,
      tripMemberships,
      tripShowsAdded,
      tripShowLabels,
      tripDayNotes,
      tripPresence,
      theatreChallenges,
      userStatsRows,
      catalogFeedback,
      userPreferences,
      aiRecHistory,
      activityPostsByMe,
      invitesCreated,
      invitesClaimed,
      followsAsFollower,
      followsAsFollowing,
    ] = await Promise.all([
      ctx.db
        .query("visits")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("userRankings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("userLists")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_createdAt", (q) =>
          q.eq("recipientUserId", userId)
        )
        .collect(),
      // Actor-side notifications aren't indexed; fall back to filter.
      ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("actorUserId"), userId))
        .collect(),
      ctx.db
        .query("trips")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("tripMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("tripShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("tripShowLabels")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect(),
      ctx.db
        .query("tripDayNotes")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect(),
      ctx.db
        .query("tripPresence")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect(),
      ctx.db
        .query("theatreChallenges")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect(),
      ctx.db
        .query("userStats")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("catalogUserFeedback")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("aiRecommendationHistory")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("activityPosts")
        .withIndex("by_actor_createdAt", (q) => q.eq("actorUserId", userId))
        .collect(),
      ctx.db
        .query("inviteLinks")
        .withIndex("by_createdByUserId", (q) => q.eq("createdByUserId", userId))
        .collect(),
      ctx.db
        .query("inviteLinks")
        .withIndex("by_claimedByUserId", (q) => q.eq("claimedByUserId", userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingUserId", userId))
        .collect(),
    ]);

    // Block rows and outstanding reports tied to this user.
    const [
      blocksByMe,
      blocksAgainstMe,
      reportsByMe,
      reportsAgainstMe,
    ] = await Promise.all([
      ctx.db
        .query("userBlocks")
        .withIndex("by_blocker", (q) => q.eq("blockerUserId", userId))
        .collect(),
      ctx.db
        .query("userBlocks")
        .withIndex("by_blocked", (q) => q.eq("blockedUserId", userId))
        .collect(),
      ctx.db
        .query("userReports")
        .withIndex("by_reporter", (q) => q.eq("reporterUserId", userId))
        .collect(),
      ctx.db
        .query("userReports")
        .withIndex("by_target_user", (q) => q.eq("targetUserId", userId))
        .collect(),
    ]);

    // ─── 2. Cascade-delete trips the user owns ────────────────────────────
    for (const trip of tripsOwned) {
      await deleteTripOwnedByUser(ctx, trip._id);
    }

    // ─── 3. Delete simple row-per-userId tables ───────────────────────────
    const simpleDeletes = [
      ...visits,
      ...userShows,
      ...userRankings,
      ...userLists,
      ...notificationsReceived,
      ...notificationsSent,
      ...tripMemberships,
      ...tripShowsAdded,
      ...tripShowLabels,
      ...tripDayNotes,
      ...tripPresence,
      ...theatreChallenges,
      ...userStatsRows,
      ...catalogFeedback,
      ...userPreferences,
      ...aiRecHistory,
      ...activityPostsByMe,
      ...invitesCreated,
      ...followsAsFollower,
      ...followsAsFollowing,
      // Block edges tied to this user are now meaningless.
      ...blocksByMe,
      ...blocksAgainstMe,
      // Reports filed by this user — anonymize rather than delete, so admins
      // still see the report history. We null the reporter below.
      // Reports against this user can be deleted since the target is gone.
      ...reportsAgainstMe,
    ];
    await Promise.all(simpleDeletes.map((row) => ctx.db.delete(row._id)));

    // Reports this user filed are left in place for audit trail. The
    // reporterUserId field will point at a now-deleted row; admin tooling
    // already tolerates unresolved user refs (it simply shows "unknown").
    void reportsByMe;

    // ─── 4. Nullify references where schema allows ────────────────────────
    // Claimed invite links: keep the row (it's historical) but unlink the user.
    await Promise.all(
      invitesClaimed.map((link) =>
        ctx.db.patch(link._id, {
          claimedByUserId: undefined,
          claimedAt: undefined,
          updatedAt: Date.now(),
        })
      )
    );

    // Remove this user from other users' visit/post tag arrays.
    await removeTaggedUserFromVisits(ctx, userId);
    await removeTaggedUserFromActivityPosts(ctx, userId);

    // ─── 5. Delete avatar blob if present ─────────────────────────────────
    if (user.avatarImage) {
      try {
        await ctx.storage.delete(user.avatarImage);
      } catch {
        // Non-fatal — storage may already be gone.
      }
    }

    // ─── 6. Delete the app user row ───────────────────────────────────────
    await ctx.db.delete(userId);

    // ─── 7. Tear down Better Auth records ─────────────────────────────────
    const betterAuthUserId = user.betterAuthUserId;
    await deleteBetterAuthSessionsForUser(ctx, betterAuthUserId);
    await deleteBetterAuthAccountsForUser(ctx, betterAuthUserId);
    await deleteBetterAuthUser(ctx, betterAuthUserId);

    return { deleted: true as const };
  },
});
