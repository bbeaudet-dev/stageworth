import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireConvexUserId } from "./auth";
import { resolveShowImageUrls } from "./helpers";
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
const mapScopeValidator = v.union(v.literal("mine"), v.literal("following"), v.literal("all"));

function getTierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function normalizeVenueName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveVenueIdForVisit(
  ctx: any,
  theatre: string | undefined,
  city: string | undefined
): Promise<Id<"venues"> | undefined> {
  const trimmedTheatre = theatre?.trim();
  if (!trimmedTheatre) return undefined;
  const normalizedName = normalizeVenueName(trimmedTheatre);
  if (!normalizedName) return undefined;

  const trimmedCity = city?.trim();
  const matchedVenue = trimmedCity
    ? await ctx.db
        .query("venues")
        .withIndex("by_city_normalized_name", (q: any) =>
          q.eq("city", trimmedCity).eq("normalizedName", normalizedName)
        )
        .first()
    : await ctx.db
        .query("venues")
        .withIndex("by_normalized_name", (q: any) => q.eq("normalizedName", normalizedName))
        .first();

  return matchedVenue?._id;
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

export const getById = query({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) return null;

    const show = await ctx.db.get(visit.showId);
    if (!show) return null;

    const images = await resolveShowImageUrls(ctx, show);
    return { ...visit, show: { ...show, images } };
  },
});

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
              images: await resolveShowImageUrls(ctx, raw),
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

export const listMapPins = query({
  args: { scope: mapScopeValidator },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    let visits: Array<{
      userId: string;
      venueId?: Id<"venues">;
      theatre?: string;
      city?: string;
    }> = [];

    if (args.scope === "mine") {
      visits = await ctx.db
        .query("visits")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } else if (args.scope === "following") {
      const followRows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
        .collect();
      const followingIds = followRows.map((row) => row.followingUserId);
      const groupedVisits = await Promise.all(
        followingIds.map((followingUserId) =>
          ctx.db
            .query("visits")
            .withIndex("by_user", (q) => q.eq("userId", followingUserId))
            .collect()
        )
      );
      visits = groupedVisits.flat();
    } else {
      visits = await ctx.db.query("visits").collect();
    }

    const rows = new Map<
      string,
      {
        mapKey: string;
        theatre: string;
        city?: string;
        visitCount: number;
        uniqueUserIds: Set<string>;
        latitude?: number;
        longitude?: number;
      }
    >();

    for (const visit of visits) {
      const theatre = visit.theatre?.trim();
      if (!theatre) continue;
      const city = visit.city?.trim();
      const mapKey = `${theatre.toLowerCase()}::${(city ?? "").toLowerCase()}`;
      const existing = rows.get(mapKey);
      if (existing) {
        existing.visitCount += 1;
        existing.uniqueUserIds.add(visit.userId);
        if (existing.latitude === undefined && visit.venueId) {
          const venue = await ctx.db.get(visit.venueId);
          if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
            existing.latitude = venue.latitude;
            existing.longitude = venue.longitude;
          }
        }
        continue;
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (visit.venueId) {
        const venue = await ctx.db.get(visit.venueId);
        if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
          latitude = venue.latitude;
          longitude = venue.longitude;
        }
      } else {
        const normalizedName = normalizeVenueName(theatre);
        const matchedVenue = city
          ? await ctx.db
              .query("venues")
              .withIndex("by_city_normalized_name", (q) =>
                q.eq("city", city).eq("normalizedName", normalizedName)
              )
              .first()
          : await ctx.db
              .query("venues")
              .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
              .first();
        if (matchedVenue?.latitude !== undefined && matchedVenue?.longitude !== undefined) {
          latitude = matchedVenue.latitude;
          longitude = matchedVenue.longitude;
        }
      }

      rows.set(mapKey, {
        mapKey,
        theatre,
        city,
        visitCount: 1,
        uniqueUserIds: new Set([visit.userId]),
        latitude,
        longitude,
      });
    }

    return Array.from(rows.values())
      .map(({ uniqueUserIds, ...row }) => ({
        ...row,
        uniqueUserCount: uniqueUserIds.size,
      }))
      .sort((a, b) => b.visitCount - a.visitCount || a.theatre.localeCompare(b.theatre));
  },
});

export const getMapCoverageStats = query({
  args: { scope: mapScopeValidator },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    let visits: Array<{
      userId: string;
      showId: Id<"shows">;
      venueId?: Id<"venues">;
      theatre?: string;
    }> = [];

    if (args.scope === "mine") {
      visits = await ctx.db
        .query("visits")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } else if (args.scope === "following") {
      const followRows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
        .collect();
      const followingIds = followRows.map((row) => row.followingUserId);
      const groupedVisits = await Promise.all(
        followingIds.map((followingUserId) =>
          ctx.db
            .query("visits")
            .withIndex("by_user", (q) => q.eq("userId", followingUserId))
            .collect()
        )
      );
      visits = groupedVisits.flat();
    } else {
      visits = await ctx.db.query("visits").collect();
    }

    let visitsWithValidLocation = 0;
    const missingShowIds = new Set<Id<"shows">>();

    for (const visit of visits) {
      const hasTheatre = Boolean(visit.theatre?.trim());
      let hasVenueCoordinates = false;
      if (visit.venueId) {
        const venue = await ctx.db.get(visit.venueId);
        hasVenueCoordinates = Boolean(
          venue?.latitude !== undefined && venue?.longitude !== undefined
        );
      }

      if (hasVenueCoordinates || hasTheatre) {
        visitsWithValidLocation += 1;
      } else {
        missingShowIds.add(visit.showId);
      }
    }

    return {
      totalVisits: visits.length,
      visitsWithValidLocation,
      visitsMissingLocation: visits.length - visitsWithValidLocation,
      uniqueShowsMissingLocation: missingShowIds.size,
    };
  },
});

export const create = mutation({
  args: {
    showId: v.id("shows"),
    productionId: v.optional(v.id("productions")),
    venueId: v.optional(v.id("venues")),
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
    const production = args.productionId ? await ctx.db.get(args.productionId) : null;
    const theatre = args.theatre?.trim() || production?.theatre?.trim();
    const city = args.city?.trim() || production?.city?.trim();
    const district = args.district ?? production?.district;
    const venueId = args.venueId ?? (await resolveVenueIdForVisit(ctx, theatre, city));

    return await ctx.db.insert("visits", {
      userId,
      showId: args.showId,
      productionId: args.productionId,
      venueId,
      date: args.date,
      city,
      theatre,
      district,
      seat: args.seat,
      isMatinee: args.isMatinee,
      isPreview: args.isPreview,
      isFinalPerformance: args.isFinalPerformance,
      cast: args.cast,
      notes: args.notes,
    });
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
    venueId: v.optional(v.id("venues")),
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
    taggedUserIds: v.optional(v.array(v.id("users"))),
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

    const validTaggedUserIds = (args.taggedUserIds ?? []).filter(
      (id) => id !== userId
    );
    const production = args.productionId ? await ctx.db.get(args.productionId) : null;
    const theatre = args.theatre?.trim() || production?.theatre?.trim();
    const city = args.city?.trim() || production?.city?.trim();
    const district = args.district ?? production?.district;
    const venueId = args.venueId ?? (await resolveVenueIdForVisit(ctx, theatre, city));

    const visitId = await ctx.db.insert("visits", {
      userId,
      showId,
      productionId: args.productionId,
      venueId,
      date: args.date,
      city,
      theatre,
      district,
      notes: args.notes,
      taggedUserIds: validTaggedUserIds.length > 0 ? validTaggedUserIds : undefined,
    });

    const now = Date.now();
    const show = await ctx.db.get(showId);
    const showName = show?.name ?? "a show";
    const actor = await ctx.db.get(userId);
    const actorLabel = actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";

    await Promise.all(
      validTaggedUserIds.flatMap((recipientId) => [
        ctx.db.insert("notifications", {
          recipientUserId: recipientId,
          actorKind: "user",
          actorUserId: userId,
          type: "visit_tag",
          visitId,
          showId,
          isRead: false,
          createdAt: now,
        }),
        ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
          recipientUserId: recipientId,
          title: "You were tagged in a visit",
          body: `${actorLabel} tagged you in their visit to ${showName}`,
          data: { type: "visit_tag", visitId },
        }),
      ])
    );

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
      city,
      theatre,
      rankAtPost: rankingIndex === -1 ? undefined : rankingIndex + 1,
      taggedUserIds: validTaggedUserIds.length > 0 ? validTaggedUserIds : undefined,
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

// One-time utility: backfill visits missing theatre/city from linked production.
// Run: npx convex run visits:backfillVisitVenueData '{"limit":500}'
export const backfillVisitVenueData = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allVisits = await ctx.db.query("visits").collect();
    const limit = Math.max(1, Math.min(args.limit ?? allVisits.length, allVisits.length));
    let scanned = 0;
    let patched = 0;
    let skipped = 0;

    for (const visit of allVisits.slice(0, limit)) {
      scanned += 1;
      if (!visit.productionId) {
        skipped += 1;
        continue;
      }
      const production = await ctx.db.get(visit.productionId);
      if (!production) {
        skipped += 1;
        continue;
      }

      const theatre = visit.theatre?.trim() || production.theatre?.trim();
      const city = visit.city?.trim() || production.city?.trim();
      const district = visit.district ?? production.district;
      const venueId = visit.venueId ?? (await resolveVenueIdForVisit(ctx, theatre, city));

      const changed =
        theatre !== visit.theatre ||
        city !== visit.city ||
        district !== visit.district ||
        venueId !== visit.venueId;

      if (!changed) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(visit._id, {
        theatre,
        city,
        district,
        venueId,
      });
      patched += 1;
    }

    return { scanned, patched, skipped };
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
