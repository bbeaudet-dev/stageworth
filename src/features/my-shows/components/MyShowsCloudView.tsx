import { useMemo } from "react";

import { useRouter } from "expo-router";

import { ShowDetailModal } from "@/components/show-detail-modal";
import { TheatreCloud } from "@/components/theatre-cloud";
import type { RankedShow } from "@/components/show-row-accordion";
import type { Id } from "@/convex/_generated/dataModel";
import type { RankingTier } from "@/features/my-shows/types";

export function MyShowsCloudView({
  showsForDisplay,
  selectedShowId,
  setSelectedShowId,
  getShowTier,
}: {
  showsForDisplay: RankedShow[];
  selectedShowId: Id<"shows"> | null;
  setSelectedShowId: (showId: Id<"shows"> | null) => void;
  getShowTier: (show: RankedShow) => RankingTier;
}) {
  const router = useRouter();

  const selectedShow = useMemo(() => {
    if (!selectedShowId) return null;
    const idx = showsForDisplay.findIndex((s) => s._id === selectedShowId);
    return idx >= 0 ? showsForDisplay[idx] : null;
  }, [selectedShowId, showsForDisplay]);

  const rankedCount = useMemo(
    () => showsForDisplay.filter((s) => getShowTier(s) !== "unranked").length,
    [getShowTier, showsForDisplay]
  );

  const rank = useMemo(() => {
    if (!selectedShowId || !selectedShow) return null;
    if (getShowTier(selectedShow) === "unranked") return null;
    return (
      showsForDisplay
        .filter((s) => getShowTier(s) !== "unranked")
        .findIndex((s) => s._id === selectedShowId) + 1
    );
  }, [getShowTier, selectedShow, selectedShowId, showsForDisplay]);

  return (
    <>
      <TheatreCloud
        shows={showsForDisplay}
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
