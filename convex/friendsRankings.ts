import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getConvexUserId } from "./auth";
import { getBlockEdgeSets } from "./social/safety";

const RANKED_TIERS = ["loved", "liked", "okay", "disliked"] as const;
type RankedTier = (typeof RANKED_TIERS)[number];

function tierSortIndex(tier: string | null): number {
  if (!tier || tier === "unranked") return RANKED_TIERS.length;
  const idx = RANKED_TIERS.indexOf(tier as RankedTier);
  return idx === -1 ? RANKED_TIERS.length : idx;
}

async function buildShowRankingRow(
  ctx: QueryCtx,
  userId: Id<"users">,
  showId: Id<"shows">,
) {
  const [userShow, visit] = await Promise.all([
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
      .first(),
  ]);

  if (!userShow && !visit) return null;

  const rawTier = userShow?.tier ?? null;
  const isRanked =
    rawTier !== null &&
    rawTier !== "unranked" &&
    (RANKED_TIERS as readonly string[]).includes(rawTier);

  let tierRank: number | null = null;
  let tierTotal: number | null = null;

  if (isRanked) {
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (rankings && rankings.showIds.includes(showId)) {
      const userShows = await ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const tierMap = new Map<string, string>();
      for (const us of userShows) tierMap.set(us.showId, us.tier);

      const inTier = rankings.showIds.filter((id) => tierMap.get(id) === rawTier);
      tierTotal = inTier.length;
      const idx = inTier.indexOf(showId);
      tierRank = idx >= 0 ? idx + 1 : null;
    }
  }

  const user = await ctx.db.get(userId);
  if (!user || !user.username) return null;

  const avatarUrl = user.avatarImage
    ? await ctx.storage.getUrl(user.avatarImage)
    : null;

  return {
    userId: user._id,
    username: user.username,
    name: user.name ?? null,
    avatarUrl,
    tier: isRanked ? (rawTier as RankedTier) : null,
    tierRank,
    tierTotal,
    hasVisit: visit !== null,
  };
}

/**
 * Followed users who have ranked or visited this show. Each entry reports the
 * user's tier for the show plus their within-tier position ("n of N"), mirroring
 * the user's own "Your Rank" line. Users who visited but haven't ranked come
 * back with `tier: null` so the UI can group them under "Unranked".
 */
export const listForShow = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    if (!viewerUserId) return [];

    const { hiddenIds } = await getBlockEdgeSets(ctx, viewerUserId);

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", viewerUserId))
      .collect();

    const followedIds = followRows
      .map((r) => r.followingUserId)
      .filter((id) => !hiddenIds.has(id));

    const [viewerRow, ...friendRows] = await Promise.all([
      buildShowRankingRow(ctx, viewerUserId, args.showId),
      ...followedIds.map((userId) => buildShowRankingRow(ctx, userId, args.showId)),
    ]);

    const filtered = friendRows.filter((r): r is NonNullable<typeof r> => r !== null);

    filtered.sort((a, b) => {
      const ta = tierSortIndex(a.tier);
      const tb = tierSortIndex(b.tier);
      if (ta !== tb) return ta - tb;
      if (a.tierRank !== null && b.tierRank !== null && a.tierRank !== b.tierRank) {
        return a.tierRank - b.tierRank;
      }
      return (a.name ?? a.username).localeCompare(b.name ?? b.username);
    });

    return viewerRow ? [{ ...viewerRow, isCurrentUser: true }, ...filtered] : filtered;
  },
});
