/**
 * Shared Theatre Score computation.
 * Imported by both userStats.ts and visits.ts so the formula lives in one place.
 */

/**
 * Per-visit tag score: 3 pts for first friend tagged + 1 pt for each additional.
 * Equivalently: 2 + tagCount for any visit with tagCount >= 1.
 */
function tagScoreForVisits(visitTagCounts: number[]): number {
  return visitTagCounts.reduce((sum, n) => sum + (n > 0 ? 2 + n : 0), 0);
}

export function computeTheatreScore(params: {
  uniqueShows: number;
  totalVisits: number;
  visitsWithNotes: number;
  /** One entry per visit: number of tagged users (0 if none). */
  visitTagCounts: number[];
  followerCount: number;
  followingCount: number;
  currentStreakWeeks: number;
}): number {
  const {
    uniqueShows,
    totalVisits,
    visitsWithNotes,
    visitTagCounts,
    followerCount,
    followingCount,
    currentStreakWeeks,
  } = params;

  const baseScore =
    uniqueShows * 10 +
    totalVisits * 5 +
    visitsWithNotes * 2 +
    tagScoreForVisits(visitTagCounts) +
    Math.min(followerCount, 50) * 15 +
    Math.min(followingCount, 250) * 1;

  // First 10 weeks: +2.5%/week; beyond 10 weeks: +1%/week; no cap
  const streakMultiplier =
    1 +
    Math.min(currentStreakWeeks, 10) * 0.025 +
    Math.max(currentStreakWeeks - 10, 0) * 0.01;

  return Math.round(baseScore * streakMultiplier);
}
