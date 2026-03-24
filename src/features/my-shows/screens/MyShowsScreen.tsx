import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiaryView } from "@/components/diary-view";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { MyShowsCloudView } from "@/features/my-shows/components/MyShowsCloudView";
import { MyShowsHeader } from "@/features/my-shows/components/MyShowsHeader";
import { MyShowsListView } from "@/features/my-shows/components/MyShowsListView";
import { useMyShowsData } from "@/features/my-shows/hooks/useMyShowsData";
import { useRankedListItems } from "@/features/my-shows/hooks/useRankedListItems";
import type { RankingTier, ViewMode } from "@/features/my-shows/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

const TIER_HEADERS: Record<
  RankingTier,
  { label: string; color: string; textColor: string }
> = {
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
  const [expandedShowId, setExpandedShowId] = useState<Id<"shows"> | null>(
    null,
  );
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(
    null,
  );
  const {
    displayShows,
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

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const loadingTextColor = Colors[theme].text;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      <View style={styles.headerLayer} collapsable={false}>
        <MyShowsHeader viewMode={viewMode} onChangeViewMode={setViewMode} />
      </View>

      {viewMode === "diary" ? (
        <DiaryView />
      ) : viewMode === "cloud" ? (
        <MyShowsCloudView
          displayShows={displayShows}
          tabBarHeight={tabBarHeight}
          selectedShowId={selectedShowId}
          setSelectedShowId={setSelectedShowId}
          getShowTier={getShowTier}
        />
      ) : listItems === undefined ? (
        <Text style={[styles.loading, { color: loadingTextColor }]}>
          Loading...
        </Text>
      ) : (
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // List is a later sibling and can win hit-testing over the header; keep controls on top.
  headerLayer: {
    zIndex: 100,
    elevation: 100,
  },
  loading: {
    fontSize: 16,
    padding: 16,
  },
});
