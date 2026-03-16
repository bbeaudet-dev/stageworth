import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiaryView } from "@/components/diary-view";
import type { Id } from "@/convex/_generated/dataModel";
import { MyShowsCloudView } from "@/features/my-shows/components/MyShowsCloudView";
import { MyShowsHeader } from "@/features/my-shows/components/MyShowsHeader";
import { MyShowsListView } from "@/features/my-shows/components/MyShowsListView";
import { useMyShowsData } from "@/features/my-shows/hooks/useMyShowsData";
import { useRankedListItems } from "@/features/my-shows/hooks/useRankedListItems";
import type { RankingTier, ViewMode } from "@/features/my-shows/types";

const TIER_HEADERS: Record<RankingTier, { label: string; color: string; textColor: string }> = {
  loved: { label: "Loved It", color: "#ef5da8", textColor: "#111" },
  liked: { label: "Liked It", color: "#2f8f46", textColor: "#fff" },
  okay: { label: "It Was Okay", color: "#e9c84f", textColor: "#111" },
  disliked: { label: "Didn't Like It", color: "#dd4b39", textColor: "#fff" },
  unranked: { label: "Unranked", color: "#b3b3b3", textColor: "#111" },
};

const LINE_META = {
  wouldSeeAgain: {
    label: "Would See Again",
    color: "#9ad94f",
    arrow: "↑",
  },
  stayedHome: {
    label: "Should've Stayed Home",
    color: "#f39c46",
    arrow: "↓",
  },
} as const;

export default function MyShowsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedShowId, setExpandedShowId] = useState<Id<"shows"> | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(null);
  const {
    displayShows,
    showsForDisplay,
    pendingRemoveIds,
    wouldSeeAgainLineIndex,
    stayedHomeLineIndex,
    getShowTier,
    handleDragEnd,
    handleRemoveShow,
  } = useMyShowsData();

  const listItems = useRankedListItems({
    displayShows,
    wouldSeeAgainLineIndex,
    stayedHomeLineIndex,
    getShowTier,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <MyShowsHeader viewMode={viewMode} onChangeViewMode={setViewMode} />

      {viewMode === "diary" ? (
        <DiaryView />
      ) : listItems === undefined ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : viewMode === "list" ? (
        <MyShowsListView
          listItems={listItems}
          expandedShowId={expandedShowId}
          setExpandedShowId={setExpandedShowId}
          pendingRemoveIds={pendingRemoveIds}
          onRemoveShow={(showId) => {
            setExpandedShowId(null);
            handleRemoveShow(showId);
          }}
          getShowTier={getShowTier}
          onDragEnd={(payload) => handleDragEnd({ ...payload, listItems })}
          onOpenShowDetails={(show) =>
            router.push({
              pathname: "/show/[showId]",
              params: {
                showId: String(show._id),
                name: show.name,
              },
            })
          }
          tabBarHeight={tabBarHeight}
          tierHeaders={TIER_HEADERS}
          lineMeta={LINE_META}
        />
      ) : (
        <MyShowsCloudView
          showsForDisplay={showsForDisplay}
          selectedShowId={selectedShowId}
          setSelectedShowId={setSelectedShowId}
          getShowTier={getShowTier}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    fontSize: 16,
    color: "#666",
    padding: 16,
  },
});
