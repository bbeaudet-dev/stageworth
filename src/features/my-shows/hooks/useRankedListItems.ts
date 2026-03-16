import { useMemo } from "react";

import { buildMyShowsListItems } from "@/features/my-shows/logic/list-items";
import type { ListItem } from "@/features/my-shows/types";
import type { RankedShow } from "@/components/show-row-accordion";

export function useRankedListItems({
  displayShows,
  wouldSeeAgainLineIndex,
  stayedHomeLineIndex,
  getShowTier,
}: {
  displayShows: RankedShow[] | undefined;
  wouldSeeAgainLineIndex: number;
  stayedHomeLineIndex: number;
  getShowTier: (show: RankedShow) => "loved" | "liked" | "okay" | "disliked" | "unranked";
}): ListItem[] | undefined {
  return useMemo(() => {
    if (!displayShows) return undefined;
    return buildMyShowsListItems({
      shows: displayShows,
      wouldSeeAgainLineIndex,
      stayedHomeLineIndex,
      getShowTier,
    });
  }, [displayShows, getShowTier, stayedHomeLineIndex, wouldSeeAgainLineIndex]);
}
