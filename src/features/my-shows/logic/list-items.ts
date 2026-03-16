import type { RankedShow } from "@/components/show-row-accordion";
import type { ListItem, RankingTier } from "@/features/my-shows/types";

export function buildMyShowsListItems({
  shows,
  wouldSeeAgainLineIndex,
  stayedHomeLineIndex,
  getShowTier,
}: {
  shows: RankedShow[];
  wouldSeeAgainLineIndex: number;
  stayedHomeLineIndex: number;
  getShowTier: (show: RankedShow) => RankingTier;
}): ListItem[] {
  const items: ListItem[] = [];
  let previousShowTier: RankingTier | null = null;

  for (let slot = 0; slot <= shows.length; slot += 1) {
    if (slot === wouldSeeAgainLineIndex) {
      items.push({
        key: "line-wouldSeeAgain",
        kind: "line",
        line: "wouldSeeAgain",
      });
    }
    if (slot === stayedHomeLineIndex) {
      items.push({
        key: "line-stayedHome",
        kind: "line",
        line: "stayedHome",
      });
    }
    if (slot < shows.length) {
      const currentShow = shows[slot];
      const currentTier = getShowTier(currentShow);
      if (currentTier !== previousShowTier) {
        items.push({
          key: `tier-${currentTier}-${slot}`,
          kind: "tier",
          tier: currentTier,
        });
      }
      items.push({ key: currentShow._id, kind: "show", show: currentShow });
      previousShowTier = currentTier;
    }
  }

  return items;
}
