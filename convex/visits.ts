import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";
import { removeShowFromSystemLists } from "./listRules";
import { normalizeShowName } from "./showNormalization";

const TIER_ORDER = ["loved", "liked", "okay", "disliked", "unranked"] as const;
type Tier = (typeof TIER_ORDER)[number];
type RankedTier = Exclude<Tier, "unranked">;

const tierValidator = v.union(
  v.literal("loved"),
  v.literal("liked"),
  v.literal("okay"),
  v.literal("disliked"),
  v.literal("unranked")
);

const rankedTierValidator = v.union(
  v.literal("loved"),
  v.literal("liked"),
  v.literal("okay"),
  v.literal("disliked")
);

function getTierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function getBottomInsertionIndexForTier(
  showIds: string[],
  tierByShowId: Map<string, Tier>,
  selectedTier: Tier
) {
  let lastSameTierIndex = -1;
  for (let i = 0; i < showIds.length; i += 1) {
    if (tierByShowId.get(showIds[i]) === selectedTier) {
      lastSameTierIndex = i;
    }
  }
  if (lastSameTierIndex !== -1) {
    return lastSameTierIndex + 1;
  }

  const selectedTierRank = getTierRank(selectedTier);
  for (let i = 0; i < showIds.length; i += 1) {
    const tier = tierByShowId.get(showIds[i]);
    if (!tier) continue;
    if (getTierRank(tier) > selectedTierRank) {
      return i;
    }
  }

  return showIds.length;
}

export const listByShow = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .collect();

    return visits.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const listAllWithShows = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const showCache = new Map<string, any>();
    const results = await Promise.all(
      visits.map(async (visit) => {
        let show = showCache.get(visit.showId);
        if (!show) {
          const raw = await ctx.db.get(visit.showId);
          if (raw) {
            show = {
              ...raw,
              images: await resolveImageUrls(ctx, raw.images),
            };
            showCache.set(visit.showId, show);
          }
        }
        return show ? { ...visit, show } : null;
      })
    );

    return results
      .filter(Boolean)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
});

export const create = mutation({
  args: {
    showId: v.id("shows"),
    productionId: v.optional(v.id("productions")),
    date: v.string(),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    district: v.optional(
      v.union(
        v.literal("broadway"),
        v.literal("off_broadway"),
        v.literal("off_off_broadway"),
        v.literal("west_end"),
        v.literal("touring"),
        v.literal("regional"),
        v.literal("other")
      )
    ),
    seat: v.optional(v.string()),
    isMatinee: v.optional(v.boolean()),
    isPreview: v.optional(v.boolean()),
    isFinalPerformance: v.optional(v.boolean()),
    cast: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    return await ctx.db.insert("visits", { userId, ...args });
  },
});

export const getAddVisitContext = query({
  args: { showId: v.optional(v.id("shows")) },
  handler: async (ctx, args) => {
    if (!args.showId) return { hasRanking: false, hasVisit: false };

    const userId = await requireConvexUserId(ctx);
    const [rankings, existingVisit] = await Promise.all([
      ctx.db
        .query("userRankings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db
        .query("visits")
        .withIndex("by_user_show", (q) =>
          q.eq("userId", userId).eq("showId", args.showId!)
        )
        .first(),
    ]);

    return {
      hasRanking: rankings?.showIds.includes(args.showId) ?? false,
      hasVisit: existingVisit !== null,
    };
  },
});

export const createVisit = mutation({
  args: {
    showId: v.optional(v.id("shows")),
    customShowName: v.optional(v.string()),
    date: v.string(),
    productionId: v.optional(v.id("productions")),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    district: v.optional(
      v.union(
        v.literal("broadway"),
        v.literal("off_broadway"),
        v.literal("off_off_broadway"),
        v.literal("west_end"),
        v.literal("touring"),
        v.literal("regional"),
        v.literal("other")
      )
    ),
    notes: v.optional(v.string()),
    keepCurrentRanking: v.optional(v.boolean()),
    selectedTier: v.optional(rankedTierValidator),
    completedInsertionIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const trimmedCustomShowName = args.customShowName?.trim();
    const hasShowId = args.showId !== undefined;
    const hasCustomShow = Boolean(trimmedCustomShowName);

    if (!hasShowId && !hasCustomShow) {
      throw new Error("A show must be selected");
    }

    if (hasShowId && hasCustomShow) {
      throw new Error("Pass either showId or customShowName, not both");
    }

    let showId = args.showId;

    if (!showId && trimmedCustomShowName) {
      const normalizedName = normalizeShowName(trimmedCustomShowName);
      if (!normalizedName) {
        throw new Error("Show name is required");
      }

      const existing = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", normalizedName)
        )
        .first();

      if (existing) {
        showId = existing._id;
      } else {
        showId = await ctx.db.insert("shows", {
          name: trimmedCustomShowName,
          normalizedName,
          type: "other",
          images: [],
          isUserCreated: true,
        });
      }
    }

    if (!showId) throw new Error("Unable to resolve show");

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!rankings) throw new Error("Rankings not found");
    let finalRankingShowIds = [...rankings.showIds];

    const alreadyRanked = rankings.showIds.includes(showId);
    const selectedTier = args.selectedTier as RankedTier | undefined;
    const allUserShows = await ctx.db
      .query("userShows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tierByShowId = new Map(
      allUserShows.map((userShow) => [userShow.showId, userShow.tier as Tier])
    );
    const existingUserShow = allUserShows.find((userShow) => userShow.showId === showId);
    const shouldRank = selectedTier !== undefined || args.completedInsertionIndex !== undefined;

    if (!alreadyRanked) {
      if (!shouldRank) {
        if (!existingUserShow) {
          await ctx.db.insert("userShows", {
            userId,
            showId,
            tier: "unranked",
            addedAt: Date.now(),
          });
        } else if (existingUserShow.tier !== "unranked") {
          await ctx.db.patch(existingUserShow._id, { tier: "unranked" });
        }
      } else {
        const effectiveTier = selectedTier ?? "liked";
        const defaultInsertionIndex = getBottomInsertionIndexForTier(
          rankings.showIds,
          tierByShowId,
          effectiveTier
        );
        const insertionIndex = Math.max(
          0,
          Math.min(
            args.completedInsertionIndex ?? defaultInsertionIndex,
            rankings.showIds.length
          )
        );
        const nextShowIds = [...rankings.showIds];
        nextShowIds.splice(insertionIndex, 0, showId);

        await ctx.db.patch(rankings._id, {
          showIds: nextShowIds,
        });
        finalRankingShowIds = nextShowIds;
        if (!existingUserShow) {
          await ctx.db.insert("userShows", {
            userId,
            showId,
            tier: effectiveTier,
            addedAt: Date.now(),
          });
        } else if (existingUserShow.tier !== effectiveTier) {
          await ctx.db.patch(existingUserShow._id, { tier: effectiveTier });
        }
      }
    } else if (args.keepCurrentRanking) {
      // Intentionally no-op for now. Ranking comparison flow arrives in issue #15.
    } else {
      const effectiveTier = selectedTier ?? "liked";
      const nextShowIds = rankings.showIds.filter((id) => id !== showId);
      const tierByShowIdWithoutCurrent = new Map(tierByShowId);
      tierByShowIdWithoutCurrent.delete(showId);

      const defaultInsertionIndex = getBottomInsertionIndexForTier(
        nextShowIds,
        tierByShowIdWithoutCurrent,
        effectiveTier
      );
      const insertionIndex = Math.max(
        0,
        Math.min(args.completedInsertionIndex ?? defaultInsertionIndex, nextShowIds.length)
      );

      nextShowIds.splice(insertionIndex, 0, showId);
      await ctx.db.patch(rankings._id, { showIds: nextShowIds });
      finalRankingShowIds = nextShowIds;
      if (existingUserShow && existingUserShow.tier !== effectiveTier) {
        await ctx.db.patch(existingUserShow._id, { tier: effectiveTier });
      }
    }

    const visitId = await ctx.db.insert("visits", {
      userId,
      showId,
      productionId: args.productionId,
      date: args.date,
      city: args.city,
      theatre: args.theatre,
      district: args.district,
      notes: args.notes,
    });

    const rankingIndex = finalRankingShowIds.indexOf(showId);
    const trimmedNotes = args.notes?.trim();
    await ctx.db.insert("activityPosts", {
      actorUserId: userId,
      type: "visit_created",
      visitId,
      showId,
      productionId: args.productionId,
      visitDate: args.date,
      notes: trimmedNotes && trimmedNotes.length > 0 ? trimmedNotes : undefined,
      city: args.city,
      theatre: args.theatre,
      rankAtPost: rankingIndex === -1 ? undefined : rankingIndex + 1,
      createdAt: Date.now(),
    });

    await removeShowFromSystemLists(ctx, userId, showId, [
      "want_to_see",
      "look_into",
      "uncategorized",
    ]);

    return { showId, visitId, alreadyRanked };
  },
});

export const remove = mutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.visitId);
  },
});
