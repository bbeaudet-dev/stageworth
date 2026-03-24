import { useMemo } from "react";

import { useRouter } from "expo-router";

import { ShowDetailModal } from "@/components/show-detail-modal";
import { TheatreCloud } from "@/components/theatre-cloud";
import type { RankedShow } from "@/components/show-row-accordion";
import type { Id } from "@/convex/_generated/dataModel";
import type { RankingTier } from "@/features/my-shows/types";

export function MyShowsCloudView({
  displayShows,
  tabBarHeight,
  selectedShowId,
  setSelectedShowId,
  getShowTier,
}: {
  displayShows: RankedShow[] | undefined;
  tabBarHeight: number;
  selectedShowId: Id<"shows"> | null;
  setSelectedShowId: (showId: Id<"shows"> | null) => void;
  getShowTier: (show: RankedShow) => RankingTier;
}) {
  const router = useRouter();

  const shows = useMemo(() => displayShows ?? [], [displayShows]);
  const rankingsLoading = displayShows === undefined;

  const selectedShow = useMemo(() => {
    if (!selectedShowId) return null;
    const idx = shows.findIndex((s) => s._id === selectedShowId);
    return idx >= 0 ? shows[idx] : null;
  }, [selectedShowId, shows]);

  const rankedCount = useMemo(
    () => shows.filter((s) => getShowTier(s) !== "unranked").length,
    [getShowTier, shows]
  );

  const rank = useMemo(() => {
    if (!selectedShowId || !selectedShow) return null;
    if (getShowTier(selectedShow) === "unranked") return null;
    return (
      shows
        .filter((s) => getShowTier(s) !== "unranked")
        .findIndex((s) => s._id === selectedShowId) + 1
    );
  }, [getShowTier, selectedShow, selectedShowId, shows]);

  return (
    <>
      <TheatreCloud
        shows={shows}
        rankingsLoading={rankingsLoading}
        bottomInset={tabBarHeight}
        onShowPress={(showId) => setSelectedShowId(showId)}
      />
      {selectedShowId && (
        <ShowDetailModal
          showId={selectedShowId}
          showName={selectedShow?.name ?? ""}
          rank={rank}
          rankedCount={rankedCount}
          onViewShowDetails={() => {
            if (!selectedShow) return;
            setSelectedShowId(null);
            router.push({
              pathname: "/show/[showId]",
              params: { showId: String(selectedShow._id), name: selectedShow.name },
            });
          }}
          onClose={() => setSelectedShowId(null)}
        />
      )}
    </>
  );
}
