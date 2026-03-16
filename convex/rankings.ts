import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";

const TIER_ORDER = ["loved", "liked", "okay", "disliked"] as const;
type Tier = (typeof TIER_ORDER)[number];

function getTierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function getTierBoundaries(
  showIds: string[],
  tierByShowId: Map<string, Tier>,
  tier: Tier
) {
  let start = -1;
  let end = -1;

  for (let i = 0; i < showIds.length; i += 1) {
    if (tierByShowId.get(showIds[i]) !== tier) continue;
    if (start === -1) start = i;
    end = i;
  }

  return { start, end };
}

function getBottomInsertionIndexForTier(
  showIds: string[],
  tierByShowId: Map<string, Tier>,
  selectedTier: Tier
) {
  const sameTierBounds = getTierBoundaries(showIds, tierByShowId, selectedTier);
  if (sameTierBounds.end !== -1) return sameTierBounds.end + 1;

  let insertAt = showIds.length;
  const selectedTierRank = getTierRank(selectedTier);
  for (let i = 0; i < showIds.length; i += 1) {
    const existingTier = tierByShowId.get(showIds[i]);
    if (!existingTier) continue;
    if (getTierRank(existingTier) > selectedTierRank) {
      insertAt = i;
      break;
    }
  }

  return insertAt;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return rankings;
  },
});

export const getRankedShows = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) return [];

    const shows = await Promise.all(
      rankings.showIds.map(async (showId) => {
        const show = await ctx.db.get(showId);
        if (!show) return null;
        const [userShow, visits] = await Promise.all([
          ctx.db
            .query("userShows")
            .withIndex("by_user_show", (q) =>
              q.eq("userId", userId).eq("showId", showId)
            )
            .first(),
          ctx.db
            .query("visits")
            .withIndex("by_user_show", (q) =>
              q.eq("userId", userId).eq("showId", showId)
            )
            .collect(),
        ]);
        return {
          ...show,
          images: await resolveImageUrls(ctx, show.images),
          tier: userShow?.tier,
          visitCount: visits.length,
        };
      })
    );

    return shows.filter(
      (s): s is NonNullable<typeof s> => s !== null
    );
  },
});

const tierValidator = v.union(
  v.literal("loved"),
  v.literal("liked"),
  v.literal("okay"),
  v.literal("disliked")
);

export const addShow = mutation({
  args: {
    showId: v.id("shows"),
    tier: tierValidator,
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    if (rankings.showIds.includes(args.showId)) {
      throw new Error("Show already in rankings");
    }

    const newShowIds = [...rankings.showIds];
    const clampedPosition = Math.max(
      0,
      Math.min(args.position, newShowIds.length)
    );
    newShowIds.splice(clampedPosition, 0, args.showId);

    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    await ctx.db.insert("userShows", {
      userId,
      showId: args.showId,
      tier: args.tier,
      addedAt: Date.now(),
    });

    return { rank: clampedPosition + 1 };
  },
});

export const removeShow = mutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const newShowIds = rankings.showIds.filter((id) => id !== args.showId);
    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    const userShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .first();

    if (userShow) await ctx.db.delete(userShow._id);

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .collect();

    await Promise.all(visits.map((v) => ctx.db.delete(v._id)));
  },
});

export const reorder = mutation({
  args: {
    showId: v.id("shows"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const currentIndex = rankings.showIds.indexOf(args.showId);
    if (currentIndex === -1) throw new Error("Show not in rankings");

    const newShowIds = [...rankings.showIds];
    newShowIds.splice(currentIndex, 1);
    const clampedPosition = Math.max(
      0,
      Math.min(args.newPosition, newShowIds.length)
    );
    newShowIds.splice(clampedPosition, 0, args.showId);

    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    const movedUserShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .first();

    if (movedUserShow) {
      const allUserShows = await ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const tierByShowId = new Map(
        allUserShows.map((userShow) => [userShow.showId, userShow.tier as Tier])
      );

      const previousShowId =
        clampedPosition > 0 ? newShowIds[clampedPosition - 1] : null;
      const nextShowId =
        clampedPosition < newShowIds.length - 1
          ? newShowIds[clampedPosition + 1]
          : null;

      const nextTier = nextShowId ? tierByShowId.get(nextShowId) : undefined;
      const previousTier = previousShowId
        ? tierByShowId.get(previousShowId)
        : undefined;

      const targetTier = nextTier ?? previousTier ?? movedUserShow.tier;
      if (targetTier !== movedUserShow.tier) {
        await ctx.db.patch(movedUserShow._id, { tier: targetTier });
      }
    }

    return { rank: clampedPosition + 1 };
  },
});

export const updateTier = mutation({
  args: {
    showId: v.id("shows"),
    tier: tierValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const userShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .first();

    if (!userShow) throw new Error("Show not found in user's list");

    await ctx.db.patch(userShow._id, { tier: args.tier });
  },
});

const specialLineValidator = v.union(
  v.literal("wouldSeeAgain"),
  v.literal("stayedHome")
);

export const updateSpecialLinePosition = mutation({
  args: {
    line: specialLineValidator,
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const clampedPosition = Math.max(
      0,
      Math.min(args.position, rankings.showIds.length)
    );

    if (args.line === "wouldSeeAgain") {
      await ctx.db.patch(rankings._id, { wouldSeeAgainLineIndex: clampedPosition });
      return;
    }

    await ctx.db.patch(rankings._id, { stayedHomeLineIndex: clampedPosition });
  },
});

export const getInsertionPreview = query({
  args: {
    selectedTier: tierValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const userShows = await ctx.db
      .query("userShows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tierByShowId = new Map(
      userShows.map((userShow) => [userShow.showId, userShow.tier as Tier])
    );
    const { start, end } = getTierBoundaries(
      rankings.showIds,
      tierByShowId,
      args.selectedTier
    );
    const defaultInsertionIndex = getBottomInsertionIndexForTier(
      rankings.showIds,
      tierByShowId,
      args.selectedTier
    );

    return {
      totalRanked: rankings.showIds.length,
      tierStartIndex: start,
      tierEndIndex: end,
      defaultInsertionIndex,
    };
  },
});
