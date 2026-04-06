import type { RankedShow } from "@/components/show-row-accordion";

import type { RankedTier } from "@/types/ranking";
import { normalizeTier } from "@/types/ranking";

export { normalizeTier };

export function inferTierAtRankPosition(
  rankedShows: RankedShow[],
  insertAt: number,
): RankedTier {
  const prev = insertAt > 0 ? normalizeTier(rankedShows[insertAt - 1]?.tier) : null;
  if (prev && prev !== "unranked") return prev;

  const next =
    insertAt < rankedShows.length ? normalizeTier(rankedShows[insertAt]?.tier) : null;
  if (next && next !== "unranked") return next;

  return "liked";
}
