import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";
import { resolveShowImageUrls } from "./helpers";
import { removeShowFromSystemLists } from "./listRules";
import { notifyUser } from "./notificationDispatch";
import { normalizeShowName, normalizeCityName } from "./showNormalization";
import { computeTheatreScore } from "./scoreUtils";
import { getBlockEdgeSets } from "./social/safety";

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

const MAX_GUEST_NAME_LENGTH = 40;
const MAX_GUEST_NAMES_PER_VISIT = 20;

// Trim, drop empties, cap length, and de-dupe (case-insensitive) while
// preserving caller's casing/ordering for display purposes.
function sanitizeGuestNames(
  raw: readonly string[] | undefined
): string[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of raw) {
    const trimmed = name.trim().slice(0, MAX_GUEST_NAME_LENGTH);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_GUEST_NAMES_PER_VISIT) break;
  }
  return out;
}

/**
 * Recompute a user's stats and bump theatre-challenge progress after a visit
 * action (create or accepted-tag). Mirrors the inline logic in createVisit so
 * accepted participants get the same score/challenge/streak treatment.
 */
export async function applyPostVisitUpdatesForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    visitDate: string;
    showId: Id<"shows">;
    visitId: Id<"visits">;
    uniqueShowCount: number;
  },
) {
  const { userId, visitDate, showId, visitId, uniqueShowCount } = args;
  const userVisits = await collectVisitsForUser(ctx, userId);
  const totalVisits = userVisits.length;
  const visitsWithNotes = userVisits.filter((vis) => vis.notes?.trim()).length;
  const visitTagCounts = userVisits.map(
    (vis) => vis.taggedUserIds?.length ?? 0,
  );
  const [followerRows, followingRows, existingStats] = await Promise.all([
    ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingUserId", userId))
      .collect(),
    ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
      .collect(),
    ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first(),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const visitIsInFuture = visitDate > todayIso;

  const visitWeekObj = new Date(visitDate + "T00:00:00Z");
  const thursday = new Date(visitWeekObj);
  thursday.setUTCDate(visitWeekObj.getUTCDate() + (3 - ((visitWeekObj.getUTCDay() + 6) % 7)));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const currentWeek = `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;

  let streakWeeks = existingStats?.currentStreakWeeks ?? 0;
  let longestStreak = existingStats?.longestStreakWeeks ?? 0;
  let lastActiveWeek = existingStats?.lastActiveWeek ?? "";
  if (!visitIsInFuture) {
    if (lastActiveWeek === "") {
      streakWeeks = 1;
      lastActiveWeek = currentWeek;
    } else if (currentWeek !== lastActiveWeek && currentWeek > lastActiveWeek) {
      streakWeeks = currentWeek <= lastActiveWeek ? streakWeeks : 1;
      lastActiveWeek = currentWeek;
    }
    if (streakWeeks > longestStreak) longestStreak = streakWeeks;
  }

  const theatreScore = computeTheatreScore({
    uniqueShows: uniqueShowCount,
    totalVisits,
    visitsWithNotes,
    visitTagCounts,
    followerCount: followerRows.length,
    followingCount: followingRows.length,
    currentStreakWeeks: streakWeeks,
  });

  if (existingStats) {
    await ctx.db.patch(existingStats._id, {
      theatreScore,
      currentStreakWeeks: streakWeeks,
      longestStreakWeeks: longestStreak,
      lastActiveWeek,
      updatedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("userStats", {
      userId,
      theatreScore,
      currentStreakWeeks: streakWeeks,
      longestStreakWeeks: longestStreak,
      lastActiveWeek,
      updatedAt: Date.now(),
    });
  }

  const visitYear = new Date(visitDate + "T00:00:00Z").getUTCFullYear();
  const yearVisits = userVisits.filter((vis) => {
    const visYear = new Date(vis.date + "T00:00:00Z").getUTCFullYear();
    return visYear === visitYear && vis.showId === showId;
  });
  if (!visitIsInFuture && yearVisits.length === 1) {
    const challenge = await ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", visitYear),
      )
      .first();
    if (challenge) {
      const newCount = challenge.currentCount + 1;
      await ctx.db.patch(challenge._id, {
        currentCount: newCount,
        updatedAt: Date.now(),
      });

      const milestones = [0.25, 0.5, 0.75, 1.0];
      const progress = newCount / challenge.targetCount;
      const prevProgress = (newCount - 1) / challenge.targetCount;
      for (const milestone of milestones) {
        if (prevProgress < milestone && progress >= milestone) {
          const isCompleted = milestone === 1.0;
          await ctx.db.insert("activityPosts", {
            actorUserId: userId,
            type: isCompleted ? "challenge_completed" : "challenge_milestone",
            visitId,
            showId,
            visitDate,
            challengeYear: visitYear,
            challengeTarget: challenge.targetCount,
            challengeProgress: newCount,
            createdAt: Date.now(),
          });
          break;
        }
      }
    }
  }
}

/**
 * Unions visits owned by the user with visits the user has accepted as a
 * shared-visit participant. Use this for stats/counts that should reflect
 * both "I ran this visit" and "I accepted an invite to this visit".
 *
 * NOTE: This intentionally ignores pending/declined participant rows.
 */
export async function collectVisitsForUser(
  ctx: any,
  userId: Id<"users">,
): Promise<Doc<"visits">[]> {
  const [owned, participations] = await Promise.all([
    ctx.db
      .query("visits")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("visitParticipants")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", userId).eq("status", "accepted"),
      )
      .collect(),
  ]);
  const ownedIds = new Set(owned.map((v: any) => v._id));
  const sharedVisits = (
    await Promise.all(
      participations.map(async (p: any) => {
        if (ownedIds.has(p.visitId)) return null;
        return (await ctx.db.get(p.visitId)) as Doc<"visits"> | null;
      }),
    )
  ).filter((v): v is Doc<"visits"> => v !== null);
  return [...owned, ...sharedVisits];
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

function getBigrams(value: string) {
  const normalized = value.replace(/\s+/g, " ");
  if (normalized.length < 2) return new Set([normalized]);
  const grams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i += 1) {
    grams.add(normalized.slice(i, i + 2));
  }
  return grams;
}

function stringSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aGrams = getBigrams(a);
  const bGrams = getBigrams(b);
  let overlap = 0;
  for (const gram of aGrams) {
    if (bGrams.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (aGrams.size + bGrams.size);
}

export async function resolveVenueIdForVisit(
  ctx: any,
  theatre: string | undefined,
  city: string | undefined
): Promise<Id<"venues"> | undefined> {
  const trimmedTheatre = theatre?.trim();
  if (!trimmedTheatre) return undefined;
  const normalizedName = normalizeVenueName(trimmedTheatre);
  if (!normalizedName) return undefined;

  const normalizedCity = city?.trim() ? normalizeCityName(city.trim()) : undefined;
  const exactByName = normalizedCity
    ? await ctx.db
        .query("venues")
        .withIndex("by_city_normalized_name", (q: any) =>
          q.eq("city", normalizedCity).eq("normalizedName", normalizedName)
        )
        .first()
    : await ctx.db
        .query("venues")
        .withIndex("by_normalized_name", (q: any) => q.eq("normalizedName", normalizedName))
        .first();
  if (exactByName?._id) return exactByName._id;

  const cityCandidates = normalizedCity
    ? await ctx.db
        .query("venues")
        .withIndex("by_city", (q: any) => q.eq("city", normalizedCity))
        .collect()
    : await ctx.db.query("venues").collect();

  // Alias exact match
  for (const venue of cityCandidates) {
    const aliases = venue.aliases ?? [];
    for (const alias of aliases) {
      if (normalizeVenueName(alias) === normalizedName) {
        return venue._id;
      }
    }
  }

  // Fuzzy fallback with confidence gap check.
  let best: { id: Id<"venues">; score: number } | null = null;
  let secondBestScore = 0;
  for (const venue of cityCandidates) {
    const aliasScores = (venue.aliases ?? []).map((alias: string) =>
      stringSimilarity(normalizedName, normalizeVenueName(alias))
    );
    const score = Math.max(
      stringSimilarity(normalizedName, venue.normalizedName),
      ...aliasScores,
    );
    if (!best || score > best.score) {
      secondBestScore = best?.score ?? 0;
      best = { id: venue._id, score };
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (!best) return undefined;
  if (best.score < 0.86) return undefined;
  if (best.score - secondBestScore < 0.06) return undefined;
  return best.id;
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

/**
 * Shared ranking application for visit create / accept. Mirrors the behavior
 * of the original inline block in createVisit — centralizing so the
 * accept-tag flow uses identical semantics (keep-current / new-rank / re-rank).
 */
export async function applyRankingForVisit(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    showId: Id<"shows">;
    selectedTier?: RankedTier;
    completedInsertionIndex?: number;
    keepCurrentRanking?: boolean;
  },
): Promise<{ finalRankingShowIds: Id<"shows">[] }> {
  const { userId, showId, selectedTier, completedInsertionIndex, keepCurrentRanking } = args;
  let rankings = await ctx.db
    .query("userRankings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!rankings) {
    const newId = await ctx.db.insert("userRankings", { userId, showIds: [] });
    rankings = (await ctx.db.get(newId))!;
  }
  let finalRankingShowIds: Id<"shows">[] = [...rankings.showIds];

  const alreadyRanked = rankings.showIds.includes(showId);
  const allUserShows = await ctx.db
    .query("userShows")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const tierByShowId = new Map(
    allUserShows.map((userShow) => [userShow.showId, userShow.tier as Tier]),
  );
  const existingUserShow = allUserShows.find((userShow) => userShow.showId === showId);
  const shouldRank = selectedTier !== undefined || completedInsertionIndex !== undefined;

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
        effectiveTier,
      );
      const insertionIndex = Math.max(
        0,
        Math.min(
          completedInsertionIndex ?? defaultInsertionIndex,
          rankings.showIds.length,
        ),
      );
      const nextShowIds = [...rankings.showIds];
      nextShowIds.splice(insertionIndex, 0, showId);

      await ctx.db.patch(rankings._id, { showIds: nextShowIds });
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
  } else if (keepCurrentRanking) {
    // Intentional no-op — preserve existing ranking position.
  } else {
    const effectiveTier = selectedTier ?? "liked";
    const nextShowIds = rankings.showIds.filter((id) => id !== showId);
    const tierByShowIdWithoutCurrent = new Map(tierByShowId);
    tierByShowIdWithoutCurrent.delete(showId);

    const defaultInsertionIndex = getBottomInsertionIndexForTier(
      nextShowIds,
      tierByShowIdWithoutCurrent,
      effectiveTier,
    );
    const insertionIndex = Math.max(
      0,
      Math.min(completedInsertionIndex ?? defaultInsertionIndex, nextShowIds.length),
    );

    nextShowIds.splice(insertionIndex, 0, showId);
    await ctx.db.patch(rankings._id, { showIds: nextShowIds });
    finalRankingShowIds = nextShowIds;
    if (existingUserShow && existingUserShow.tier !== effectiveTier) {
      await ctx.db.patch(existingUserShow._id, { tier: effectiveTier });
    }
  }

  return { finalRankingShowIds };
}

export const getById = query({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const viewerId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) return null;

    const isOwner = visit.userId === viewerId;
    const isTagged = visit.taggedUserIds?.includes(viewerId) ?? false;
    const myParticipant = await ctx.db
      .query("visitParticipants")
      .withIndex("by_visit_user", (q) =>
        q.eq("visitId", args.visitId).eq("userId", viewerId),
      )
      .first();
    const isParticipant = Boolean(myParticipant);

    if (!isOwner && !isTagged && !isParticipant) {
      // Visits are only visible to non-owners/non-tagged viewers when they've
      // been promoted to the activity feed. This matches what the client is
      // already allowed to see via the community feed.
      const post = await ctx.db
        .query("activityPosts")
        .withIndex("by_actor_createdAt", (q) =>
          q.eq("actorUserId", visit.userId)
        )
        .filter((q) => q.eq(q.field("visitId"), args.visitId))
        .first();
      if (!post) return null;

      // Respect symmetric blocks: blocked users shouldn't see each other's
      // visits even through a feed deep-link.
      const { hiddenIds } = await getBlockEdgeSets(ctx, viewerId);
      if (hiddenIds.has(visit.userId)) return null;
    }

    const show = await ctx.db.get(visit.showId);
    if (!show) return null;

    const images = await resolveShowImageUrls(ctx, show);
    return {
      ...visit,
      show: { ...show, images },
      viewerParticipantStatus: myParticipant?.status ?? null,
      viewerParticipantNotes: myParticipant?.notes ?? null,
    };
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
    const ownedVisits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Also include visits the viewer has accepted via shared-visit tag.
    const acceptedParticipations = await ctx.db
      .query("visitParticipants")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "accepted"),
      )
      .collect();
    const seen = new Set(ownedVisits.map((v) => v._id));
    const participantVisits: Doc<"visits">[] = [];
    for (const p of acceptedParticipations) {
      if (seen.has(p.visitId)) continue;
      const v = await ctx.db.get(p.visitId);
      if (v) {
        participantVisits.push(v);
        seen.add(v._id);
      }
    }
    const visits = [...ownedVisits, ...participantVisits];

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
        if (!show) return null;
        const isSharedGuest = visit.userId !== userId;
        return { ...visit, show, isSharedGuest };
      })
    );

    return results
      .filter(Boolean)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  },
});

async function resolveVisitCoordinates(
  ctx: any,
  visit: { venueId?: Id<"venues">; theatre?: string; city?: string }
): Promise<{ latitude?: number; longitude?: number }> {
  if (visit.venueId) {
    const venue = await ctx.db.get(visit.venueId);
    if (venue?.latitude !== undefined && venue?.longitude !== undefined) {
      return { latitude: venue.latitude, longitude: venue.longitude };
    }
  }
  const theatre = visit.theatre?.trim();
  if (!theatre) return {};
  const normalizedName = normalizeVenueName(theatre);
  if (!normalizedName) return {};
  const city = visit.city?.trim();
  const matched = city
    ? await ctx.db
        .query("venues")
        .withIndex("by_city_normalized_name", (q: any) =>
          q.eq("city", city).eq("normalizedName", normalizedName),
        )
        .first()
    : await ctx.db
        .query("venues")
        .withIndex("by_normalized_name", (q: any) =>
          q.eq("normalizedName", normalizedName),
        )
        .first();
  if (matched?.latitude !== undefined && matched?.longitude !== undefined) {
    return { latitude: matched.latitude, longitude: matched.longitude };
  }
  return {};
}

async function loadVisitsForMapScope(
  ctx: any,
  scope: "mine" | "following" | "all",
  userId: Id<"users">,
  hiddenIds: Set<string>,
) {
  if (scope === "mine") {
    return await ctx.db
      .query("visits")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  }
  if (scope === "following") {
    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q: any) => q.eq("followerUserId", userId))
      .collect();
    const followingIds = followRows
      .map((row: any) => row.followingUserId)
      .filter((id: string) => !hiddenIds.has(id));
    const groups = await Promise.all(
      followingIds.map((followingUserId: Id<"users">) =>
        ctx.db
          .query("visits")
          .withIndex("by_user", (q: any) => q.eq("userId", followingUserId))
          .collect(),
      ),
    );
    return groups.flat();
  }
  const all = await ctx.db.query("visits").collect();
  return all.filter((v: any) => !hiddenIds.has(v.userId));
}

export const listMapPins = query({
  args: { scope: mapScopeValidator },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) {
      return [];
    }
    const { hiddenIds } = await getBlockEdgeSets(ctx, userId);
    const visits: Doc<"visits">[] = await loadVisitsForMapScope(
      ctx,
      args.scope,
      userId,
      hiddenIds,
    );

    const rows = new Map<
      string,
      {
        mapKey: string;
        theatre: string;
        city?: string;
        visitCount: number;
        uniqueUserIds: Set<string>;
        showIds: Set<Id<"shows">>;
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
        existing.showIds.add(visit.showId);
        if (existing.latitude === undefined) {
          const { latitude, longitude } = await resolveVisitCoordinates(ctx, visit);
          if (latitude !== undefined && longitude !== undefined) {
            existing.latitude = latitude;
            existing.longitude = longitude;
          }
        }
        continue;
      }

      const { latitude, longitude } = await resolveVisitCoordinates(ctx, visit);

      rows.set(mapKey, {
        mapKey,
        theatre,
        city,
        visitCount: 1,
        uniqueUserIds: new Set([visit.userId]),
        showIds: new Set([visit.showId]),
        latitude,
        longitude,
      });
    }
    const showImageCache = new Map<Id<"shows">, string | null>();
    const enriched = await Promise.all(
      Array.from(rows.values()).map(async ({ uniqueUserIds, showIds, ...row }) => {
        const previewImages: string[] = [];
        for (const showId of showIds) {
          if (showImageCache.has(showId)) {
            const cached = showImageCache.get(showId);
            if (cached) previewImages.push(cached);
            continue;
          }
          const show = await ctx.db.get(showId);
          if (!show) {
            showImageCache.set(showId, null);
            continue;
          }
          const images = await resolveShowImageUrls(ctx, show);
          const first = images[0] ?? null;
          showImageCache.set(showId, first);
          if (first) previewImages.push(first);
        }
        return {
          ...row,
          uniqueUserCount: uniqueUserIds.size,
          previewImages: Array.from(new Set(previewImages)).slice(0, 4),
        };
      })
    );

    return enriched.sort((a, b) => b.visitCount - a.visitCount || a.theatre.localeCompare(b.theatre));
  },
});

export const getMapCoverageStats = query({
  args: { scope: mapScopeValidator },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) {
      return {
        totalVisits: 0,
        visitsWithValidLocation: 0,
        visitsMissingLocation: 0,
        uniqueShowsMissingLocation: 0,
        uniqueCities: 0,
        uniqueTheatres: 0,
      };
    }
    const { hiddenIds } = await getBlockEdgeSets(ctx, userId);
    const visits = await loadVisitsForMapScope(ctx, args.scope, userId, hiddenIds);

    let visitsWithValidLocation = 0;
    const missingShowIds = new Set<Id<"shows">>();
    // Profile totals should include all visits, not only geocoded ones.
    const citySet = new Set<string>();
    const theatreSet = new Set<string>();

    for (const visit of visits) {
      const theatre = visit.theatre?.trim();
      const rawCity = visit.city?.trim();
      if (theatre) {
        const theatreKey = `${theatre.toLowerCase()}::${(rawCity ?? "").toLowerCase()}`;
        theatreSet.add(theatreKey);
      }
      if (rawCity) {
        citySet.add(normalizeCityName(rawCity).toLowerCase());
      }

      const { latitude, longitude } = await resolveVisitCoordinates(ctx, visit);
      if (latitude !== undefined && longitude !== undefined) {
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
      uniqueCities: citySet.size,
      uniqueTheatres: theatreSet.size,
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
    const rawCity = args.city?.trim() || production?.city?.trim();
    const city = rawCity ? normalizeCityName(rawCity) : rawCity;
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
    if (!args.showId) {
      return {
        hasRanking: false,
        hasVisit: false,
        currentRankPosition: null,
        rankingTotal: 0,
        currentTier: null,
      };
    }

    const userId = await requireConvexUserId(ctx);
    const [rankings, existingVisit, userShow] = await Promise.all([
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
      ctx.db
        .query("userShows")
        .withIndex("by_user_show", (q) =>
          q.eq("userId", userId).eq("showId", args.showId!)
        )
        .first(),
    ]);

    const rankedShowIds = rankings?.showIds ?? [];
    const rankIndex = rankedShowIds.indexOf(args.showId);
    const hasRanking = rankIndex !== -1;

    return {
      hasRanking,
      hasVisit: existingVisit !== null,
      currentRankPosition: hasRanking ? rankIndex + 1 : null,
      rankingTotal: rankedShowIds.length,
      currentTier: hasRanking ? (userShow?.tier ?? "liked") : null,
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
    seat: v.optional(v.string()),
    keepCurrentRanking: v.optional(v.boolean()),
    selectedTier: v.optional(rankedTierValidator),
    completedInsertionIndex: v.optional(v.number()),
    taggedUserIds: v.optional(v.array(v.id("users"))),
    taggedGuestNames: v.optional(v.array(v.string())),
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

    const rankingsRow = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const alreadyRanked = rankingsRow?.showIds.includes(showId) ?? false;

    const { finalRankingShowIds } = await applyRankingForVisit(ctx, {
      userId,
      showId,
      selectedTier: args.selectedTier as RankedTier | undefined,
      completedInsertionIndex: args.completedInsertionIndex,
      keepCurrentRanking: args.keepCurrentRanking,
    });

    const { hiddenIds: blockHiddenIds } = await getBlockEdgeSets(ctx, userId);
    const validTaggedUserIds = (args.taggedUserIds ?? []).filter(
      (id) => id !== userId && !blockHiddenIds.has(id)
    );
    const production = args.productionId ? await ctx.db.get(args.productionId) : null;
    const theatre = args.theatre?.trim() || production?.theatre?.trim();
    const rawCity = args.city?.trim() || production?.city?.trim();
    const city = rawCity ? normalizeCityName(rawCity) : rawCity;
    const district = args.district ?? production?.district;
    const venueId = args.venueId ?? (await resolveVenueIdForVisit(ctx, theatre, city));

    const cleanGuestNames = sanitizeGuestNames(args.taggedGuestNames);

    const visitId = await ctx.db.insert("visits", {
      userId,
      showId,
      productionId: args.productionId,
      venueId,
      date: args.date,
      city,
      theatre,
      district,
      seat: args.seat,
      notes: args.notes,
      taggedUserIds: validTaggedUserIds.length > 0 ? validTaggedUserIds : undefined,
      taggedGuestNames: cleanGuestNames.length > 0 ? cleanGuestNames : undefined,
    });

    const show = await ctx.db.get(showId);
    const showName = show?.name ?? "a show";
    const actor = await ctx.db.get(userId);
    const actorLabel = actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";

    await Promise.all(
      validTaggedUserIds.map(async (recipientId) => {
        await ctx.db.insert("visitParticipants", {
          visitId,
          userId: recipientId,
          status: "pending",
          invitedAt: Date.now(),
        });
        await notifyUser(ctx, {
          recipientUserId: recipientId,
          actorKind: "user",
          actorUserId: userId,
          type: "visit_tag",
          visitId,
          showId,
          push: {
            title: "You were tagged in a visit",
            body: `${actorLabel} tagged you in their visit to ${showName}`,
            data: { type: "visit_tag", visitId },
          },
        });
      }),
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
      taggedGuestNames: cleanGuestNames.length > 0 ? cleanGuestNames : undefined,
      createdAt: Date.now(),
    });

    await removeShowFromSystemLists(ctx, userId, showId, [
      "want_to_see",
      "look_into",
      "uncategorized",
    ]);

    // Recompute theatre score after visit creation
    const existingStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const uniqueShows = finalRankingShowIds.length;
    const userVisits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const totalVisits = userVisits.length;
    const visitsWithNotes = userVisits.filter((vis) => vis.notes?.trim()).length;
    const visitTagCounts = userVisits.map(
      (vis) => vis.taggedUserIds?.length ?? 0
    );
    const [followerRows, followingRows] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingUserId", userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
        .collect(),
    ]);

    // Future-dated visits shouldn't bump streaks or challenges.
    const todayIso = new Date().toISOString().slice(0, 10);
    const visitIsInFuture = args.date > todayIso;

    const currentWeekDate = args.date;
    const currentWeekObj = new Date(currentWeekDate + "T00:00:00Z");
    const thursday = new Date(currentWeekObj);
    thursday.setUTCDate(currentWeekObj.getUTCDate() + (3 - ((currentWeekObj.getUTCDay() + 6) % 7)));
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const currentWeek = `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;

    let streakWeeks = existingStats?.currentStreakWeeks ?? 0;
    let longestStreak = existingStats?.longestStreakWeeks ?? 0;
    let lastActiveWeek = existingStats?.lastActiveWeek ?? "";

    if (!visitIsInFuture) {
      if (lastActiveWeek === "") {
        streakWeeks = 1;
        lastActiveWeek = currentWeek;
      } else if (currentWeek !== lastActiveWeek && currentWeek > lastActiveWeek) {
        streakWeeks = currentWeek <= lastActiveWeek ? streakWeeks : 1;
        lastActiveWeek = currentWeek;
      }
      if (streakWeeks > longestStreak) longestStreak = streakWeeks;
    }

    const theatreScore = computeTheatreScore({
      uniqueShows,
      totalVisits,
      visitsWithNotes,
      visitTagCounts,
      followerCount: followerRows.length,
      followingCount: followingRows.length,
      currentStreakWeeks: streakWeeks,
    });

    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        theatreScore,
        currentStreakWeeks: streakWeeks,
        longestStreakWeeks: longestStreak,
        lastActiveWeek,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userStats", {
        userId,
        theatreScore,
        currentStreakWeeks: streakWeeks,
        longestStreakWeeks: longestStreak,
        lastActiveWeek,
        updatedAt: Date.now(),
      });
    }

    // Increment theatre challenge if this is a new show for the year
    const visitYear = new Date(args.date + "T00:00:00Z").getUTCFullYear();
    const yearVisits = userVisits.filter((vis) => {
      const visYear = new Date(vis.date + "T00:00:00Z").getUTCFullYear();
      return visYear === visitYear && vis.showId === showId;
    });
    if (!visitIsInFuture && yearVisits.length === 1) {
      const challenge = await ctx.db
        .query("theatreChallenges")
        .withIndex("by_user_year", (q) =>
          q.eq("userId", userId).eq("year", visitYear)
        )
        .first();
      if (challenge) {
        const newCount = challenge.currentCount + 1;
        await ctx.db.patch(challenge._id, {
          currentCount: newCount,
          updatedAt: Date.now(),
        });

        const milestones = [0.25, 0.5, 0.75, 1.0];
        const progress = newCount / challenge.targetCount;
        const prevProgress = (newCount - 1) / challenge.targetCount;
        for (const milestone of milestones) {
          if (prevProgress < milestone && progress >= milestone) {
            const isCompleted = milestone === 1.0;
            await ctx.db.insert("activityPosts", {
              actorUserId: userId,
              type: isCompleted ? "challenge_completed" : "challenge_milestone",
              visitId,
              showId,
              visitDate: args.date,
              challengeYear: visitYear,
              challengeTarget: challenge.targetCount,
              challengeProgress: newCount,
              createdAt: Date.now(),
            });
            break;
          }
        }
      }
    }

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

export const updateVisit = mutation({
  args: {
    visitId: v.id("visits"),
    date: v.string(),
    productionId: v.optional(v.id("productions")),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    notes: v.optional(v.string()),
    taggedUserIds: v.optional(v.array(v.id("users"))),
    taggedGuestNames: v.optional(v.array(v.string())),
    seat: v.optional(v.string()),
    isMatinee: v.optional(v.boolean()),
    isPreview: v.optional(v.boolean()),
    isFinalPerformance: v.optional(v.boolean()),
    cast: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.userId !== userId) throw new Error("Not authorized");

    const production = args.productionId ? await ctx.db.get(args.productionId) : null;
    const theatre = args.theatre?.trim() || production?.theatre?.trim();
    const rawCity = args.city?.trim() || production?.city?.trim();
    const city = rawCity ? normalizeCityName(rawCity) : rawCity;
    const district = production?.district ?? visit.district;
    const resolvedVenueId = await resolveVenueIdForVisit(ctx, theatre, city);
    const venueId = resolvedVenueId ?? visit.venueId;

    const previousTaggedIds = visit.taggedUserIds ?? [];
    const { hiddenIds: blockHiddenIds } = await getBlockEdgeSets(ctx, userId);
    const requestedTaggedUserIds = (args.taggedUserIds ?? []).filter(
      (id) => id !== userId && !blockHiddenIds.has(id)
    );

    // Accepted participants can only be removed by leaving the visit themselves.
    // If the creator tries to drop an accepted participant, keep them tagged.
    const existingParticipants = await ctx.db
      .query("visitParticipants")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();
    const acceptedIds = new Set(
      existingParticipants.filter((p) => p.status === "accepted").map((p) => p.userId),
    );
    const preservedAccepted = previousTaggedIds.filter((id) => acceptedIds.has(id));
    const validTaggedUserIds = Array.from(
      new Set([...requestedTaggedUserIds, ...preservedAccepted]),
    );

    const newlyTaggedIds = validTaggedUserIds.filter((id) => !previousTaggedIds.includes(id));
    const removedTaggedIds = previousTaggedIds.filter((id) => !validTaggedUserIds.includes(id));

    const cleanGuestNames = sanitizeGuestNames(args.taggedGuestNames);

    await ctx.db.patch(args.visitId, {
      date: args.date,
      productionId: args.productionId,
      venueId,
      city,
      theatre,
      district,
      notes: args.notes,
      taggedUserIds: validTaggedUserIds.length > 0 ? validTaggedUserIds : undefined,
      taggedGuestNames: cleanGuestNames.length > 0 ? cleanGuestNames : undefined,
      seat: args.seat,
      isMatinee: args.isMatinee,
      isPreview: args.isPreview,
      isFinalPerformance: args.isFinalPerformance,
      cast: args.cast,
    });

    // Drop pending participant rows for users the creator untagged.
    if (removedTaggedIds.length > 0) {
      const removedSet = new Set(removedTaggedIds);
      await Promise.all(
        existingParticipants
          .filter((p) => removedSet.has(p.userId) && p.status === "pending")
          .map((p) => ctx.db.delete(p._id)),
      );
    }

    if (newlyTaggedIds.length > 0) {
      const show = await ctx.db.get(visit.showId);
      const showName = show?.name ?? "a show";
      const actor = await ctx.db.get(userId);
      const actorLabel = actor?.name?.split(" ")[0] ?? actor?.username ?? "Someone";
      await Promise.all(
        newlyTaggedIds.map(async (recipientId) => {
          // If a prior decline/pending row exists, reset it to pending; else insert.
          const existing = existingParticipants.find((p) => p.userId === recipientId);
          if (existing) {
            await ctx.db.patch(existing._id, {
              status: "pending",
              invitedAt: Date.now(),
              respondedAt: undefined,
            });
          } else {
            await ctx.db.insert("visitParticipants", {
              visitId: args.visitId,
              userId: recipientId,
              status: "pending",
              invitedAt: Date.now(),
            });
          }
          await notifyUser(ctx, {
            recipientUserId: recipientId,
            actorKind: "user",
            actorUserId: userId,
            type: "visit_tag",
            visitId: args.visitId,
            showId: visit.showId,
            push: {
              title: "You were tagged in a visit",
              body: `${actorLabel} tagged you in their visit to ${showName}`,
              data: { type: "visit_tag", visitId: args.visitId },
            },
          });
        }),
      );
    }
  },
});

export const remove = mutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.userId !== userId) throw new Error("Not authorized");

    const participants = await ctx.db
      .query("visitParticipants")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();
    await Promise.all(participants.map((p) => ctx.db.delete(p._id)));

    await ctx.db.delete(args.visitId);
  },
});

// Admin: visits that have a theatre or city but no resolved venueId, grouped
// and counted so we can spot high-frequency unmatched locations to enrich.
export const listUnmatchedLocations = query({
  args: {},
  handler: async (ctx) => {
    const visits = await ctx.db.query("visits").collect();

    const counts = new Map<string, { theatre: string; city: string; count: number }>();
    for (const visit of visits) {
      if (visit.venueId) continue;
      const theatre = visit.theatre?.trim() ?? "";
      const city = visit.city?.trim() ?? "";
      if (!theatre && !city) continue;
      const key = `${theatre}|||${city}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { theatre, city, count: 1 });
      }
    }

    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.theatre.localeCompare(b.theatre))
      .slice(0, 500);
  },
});
