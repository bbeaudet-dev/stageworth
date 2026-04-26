import { useMemo } from "react";

import { useRouter } from "expo-router";

import { TheatreCloud } from "@/components/theatre-cloud";
import type { RankedShow } from "@/components/show-row-accordion";
import type { RankingTier } from "@/features/my-shows/types";

export function MyShowsCloudView({
  displayShows,
  tabBarHeight,
  getShowTier,
}: {
  displayShows: RankedShow[] | undefined;
  tabBarHeight: number;
  getShowTier: (show: RankedShow) => RankingTier;
}) {
  const router = useRouter();

  const shows = useMemo(() => displayShows ?? [], [displayShows]);
  const rankingsLoading = displayShows === undefined;

  return (
    <TheatreCloud
      shows={shows}
      rankingsLoading={rankingsLoading}
      bottomInset={tabBarHeight}
      onShowPress={(showId) => {
        const show = shows.find((s) => s._id === showId);
        router.push({
          pathname: "/show/[showId]",
          params: { showId: String(showId), name: show?.name ?? "" },
        });
      }}
    />
  );
}
