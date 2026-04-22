import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiaryView } from "@/components/diary-view";
import { TIER_COLORS } from "@/constants/tierColors";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { MyShowsCloudView } from "@/features/my-shows/components/MyShowsCloudView";
import { MyShowsGenreView } from "@/features/my-shows/components/MyShowsGenreView";
import { MyShowsHeader } from "@/features/my-shows/components/MyShowsHeader";
import { MyShowsListView } from "@/features/my-shows/components/MyShowsListView";
import { ViewModeSelector } from "@/features/my-shows/components/ViewModeSelector";
import { useMyShowsData } from "@/features/my-shows/hooks/useMyShowsData";
import { useRankedListItems } from "@/features/my-shows/hooks/useRankedListItems";
import { buildMyShowsGenreItems } from "@/features/my-shows/logic/genre-list-items";
import type { RankingTier, ViewMode } from "@/features/my-shows/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Map shared TIER_COLORS into the shape MyShowsListView expects.
const TIER_HEADERS: Record<RankingTier, { label: string; color: string; textColor: string }> =
  Object.fromEntries(
    (Object.keys(TIER_COLORS) as RankingTier[]).map((t) => [
      t,
      { label: TIER_COLORS[t].label, color: TIER_COLORS[t].bg, textColor: TIER_COLORS[t].text },
    ])
  ) as Record<RankingTier, { label: string; color: string; textColor: string }>;

const LINE_META = {
  wouldSeeAgain: { label: "Would See Again", color: "#9ad94f", arrow: "↑" },
  stayedHome: { label: "Should've Stayed Home", color: "#f39c46", arrow: "↓" },
} as const;

/** Minimum number of ranked shows before the per-category Back/Next nav unlocks. */
const CATEGORY_NAV_UNLOCK_THRESHOLD = 20;
/**
 * Minimum number of ranked shows before the "Would See Again" / "Should've
 * Stayed Home" divider lines start appearing in the Rank view. Below this we
 * keep the list a single uninterrupted ranking.
 */
const RANKING_LINES_UNLOCK_THRESHOLD = 40;

export default function MyShowsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedShowId, setExpandedShowId] = useState<Id<"shows"> | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(null);

  const {
    displayShows,
    pendingRemoveIds,
    wouldSeeAgainLineIndex,
    stayedHomeLineIndex,
    getShowTier,
    handleDragEnd,
    handleRemoveShow,
  } = useMyShowsData();

  const showRankingLines = (displayShows?.length ?? 0) >= RANKING_LINES_UNLOCK_THRESHOLD;

  const listItems = useRankedListItems({
    displayShows,
    wouldSeeAgainLineIndex: showRankingLines ? wouldSeeAgainLineIndex : -1,
    stayedHomeLineIndex: showRankingLines ? stayedHomeLineIndex : -1,
    getShowTier,
  });

  const genreItems = useMemo(
    () =>
      displayShows
        ? buildMyShowsGenreItems({ shows: displayShows, getShowTier })
        : undefined,
    [displayShows, getShowTier]
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const loadingTextColor = Colors[theme].text;

  const showCategoryNav = (displayShows?.length ?? 0) >= CATEGORY_NAV_UNLOCK_THRESHOLD;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.headerLayer} collapsable={false}>
        <MyShowsHeader />
      </View>

      <ViewModeSelector viewMode={viewMode} onChangeViewMode={setViewMode} />

      <View style={styles.content}>
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
        ) : viewMode === "genre" ? (
          genreItems === undefined ? (
            <Text style={[styles.loading, { color: loadingTextColor }]}>Loading...</Text>
          ) : (
            <MyShowsGenreView
              items={genreItems}
              expandedShowId={expandedShowId}
              setExpandedShowId={setExpandedShowId}
              pendingRemoveIds={pendingRemoveIds}
              onRemoveShow={(showId) => {
                setExpandedShowId(null);
                handleRemoveShow(showId);
              }}
              onOpenShowDetails={(show) =>
                router.push({
                  pathname: "/show/[showId]",
                  params: { showId: String(show._id), name: show.name },
                })
              }
              tabBarHeight={tabBarHeight}
              showCategoryNav={showCategoryNav}
            />
          )
        ) : listItems === undefined ? (
          <Text style={[styles.loading, { color: loadingTextColor }]}>Loading...</Text>
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
                params: { showId: String(show._id), name: show.name },
              })
            }
            tabBarHeight={tabBarHeight}
            tierHeaders={TIER_HEADERS}
            lineMeta={LINE_META}
            showCategoryNav={showCategoryNav}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLayer: {
    zIndex: 100,
    elevation: 100,
  },
  content: {
    flex: 1,
  },
  loading: {
    fontSize: 16,
    padding: 16,
  },
});
