import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiaryView } from "@/components/diary-view";
import { useToast } from "@/components/Toast";
import { TIER_COLORS } from "@/constants/tierColors";
import { Colors } from "@/constants/theme";
import type { RankedShow } from "@/components/show-row-accordion";
import { MyShowsCloudView } from "@/features/my-shows/components/MyShowsCloudView";
import { MyShowsGenreView } from "@/features/my-shows/components/MyShowsGenreView";
import { MyShowsHeader } from "@/features/my-shows/components/MyShowsHeader";
import { MyShowsRankView } from "@/features/my-shows/components/MyShowsRankView";
import { ViewModeSelector } from "@/features/my-shows/components/ViewModeSelector";
import { useMyShowsData } from "@/features/my-shows/hooks/useMyShowsData";
import { useRankedListItems } from "@/features/my-shows/hooks/useRankedListItems";
import { buildMyShowsGenreItems } from "@/features/my-shows/logic/genre-list-items";
import type { RankingTier, ViewMode } from "@/features/my-shows/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Map shared TIER_COLORS into the shape MyShowsRankView expects.
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
  const navigation = useNavigation();
  const { showToast } = useToast();
  const tabBarHeight = useBottomTabBarHeight();
  const [viewMode, setViewMode] = useState<ViewMode>("rank");
  const allowRemoveRef = useRef(false);

  const {
    displayShows,
    pendingRemoveIds,
    wouldSeeAgainLineIndex,
    stayedHomeLineIndex,
    getShowTier,
    getRankChangeLabel,
    isShowMarkedForRemoval,
    rankingChangeSummary,
    handleDragEnd,
    handleRemoveShow,
    saveRankingChanges,
    discardRankingChanges,
    hasUnsavedRankingChanges,
    isSavingRankingChanges,
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
  const surfaceColor = Colors[theme].surface;
  const borderColor = Colors[theme].border;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccentColor = Colors[theme].onAccent;

  const showCategoryNav = (displayShows?.length ?? 0) >= CATEGORY_NAV_UNLOCK_THRESHOLD;
  const saveBarHeight = hasUnsavedRankingChanges && viewMode === "rank" ? 72 : 0;
  const changeSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (rankingChangeSummary.removedShows > 0) {
      const visitSummary =
        rankingChangeSummary.removedVisits > 0
          ? ` (${rankingChangeSummary.removedVisits} ${
              rankingChangeSummary.removedVisits === 1 ? "visit" : "visits"
            })`
          : "";
      parts.push(`Removed shows: ${rankingChangeSummary.removedShows}${visitSummary}`);
    }
    if (rankingChangeSummary.reorderedShows > 0) {
      parts.push(`Reordered shows: ${rankingChangeSummary.reorderedShows}`);
    }
    return parts.length > 0
      ? parts.join(" • ")
      : "Changed shows are marked with their previous rank.";
  }, [
    rankingChangeSummary.removedShows,
    rankingChangeSummary.removedVisits,
    rankingChangeSummary.reorderedShows,
  ]);

  const saveAndContinue = useCallback(
    async (onDone?: () => void) => {
      try {
        await saveRankingChanges();
        showToast({ message: "Rankings saved" });
        onDone?.();
      } catch (error) {
        console.error("Failed to save ranking changes:", error);
        showToast({ message: "Failed to save rankings" });
      }
    },
    [saveRankingChanges, showToast]
  );

  const promptForUnsavedRankingChanges = useCallback(
    (onDiscard: () => void, onSave?: () => void) => {
      Alert.alert("Save ranking changes?", changeSummaryText, [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            discardRankingChanges();
            onDiscard();
          },
        },
        {
          text: "Save",
          onPress: () => {
            void saveAndContinue(onSave ?? onDiscard);
          },
        },
      ]);
    },
    [changeSummaryText, discardRankingChanges, saveAndContinue]
  );

  usePreventRemove(hasUnsavedRankingChanges && !isSavingRankingChanges && !allowRemoveRef.current, (event) => {
    promptForUnsavedRankingChanges(
      () => {
        allowRemoveRef.current = true;
        navigation.dispatch(event.data.action);
      },
      () => {
        allowRemoveRef.current = true;
        navigation.dispatch(event.data.action);
      }
    );
  });

  const openShowDetails = useCallback(
    (show: RankedShow) => {
      const navigate = () =>
        router.push({
          pathname: "/show/[showId]",
          params: { showId: String(show._id), name: show.name },
        });
      if (hasUnsavedRankingChanges) {
        promptForUnsavedRankingChanges(navigate);
        return;
      }
      navigate();
    },
    [hasUnsavedRankingChanges, promptForUnsavedRankingChanges, router]
  );

  const handleChangeViewMode = useCallback(
    (nextViewMode: ViewMode) => {
      if (nextViewMode === viewMode) return;
      if (viewMode === "rank" && hasUnsavedRankingChanges) {
        promptForUnsavedRankingChanges(() => setViewMode(nextViewMode));
        return;
      }
      setViewMode(nextViewMode);
    },
    [hasUnsavedRankingChanges, promptForUnsavedRankingChanges, viewMode]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.headerLayer} collapsable={false}>
        <MyShowsHeader />
      </View>

      <ViewModeSelector viewMode={viewMode} onChangeViewMode={handleChangeViewMode} />

      <View style={styles.content}>
        {viewMode === "diary" ? (
          <DiaryView />
        ) : viewMode === "cloud" ? (
          <MyShowsCloudView
            displayShows={displayShows}
            tabBarHeight={tabBarHeight}
            getShowTier={getShowTier}
          />
        ) : viewMode === "genre" ? (
          genreItems === undefined ? (
            <Text style={[styles.loading, { color: loadingTextColor }]}>Loading...</Text>
          ) : (
            <MyShowsGenreView
              items={genreItems}
              pendingRemoveIds={pendingRemoveIds}
              onRemoveShow={handleRemoveShow}
              onOpenShowDetails={openShowDetails}
              tabBarHeight={tabBarHeight}
              showCategoryNav={showCategoryNav}
            />
          )
        ) : listItems === undefined ? (
          <Text style={[styles.loading, { color: loadingTextColor }]}>Loading...</Text>
        ) : (
          <MyShowsRankView
            listItems={listItems}
            pendingRemoveIds={pendingRemoveIds}
            onRemoveShow={handleRemoveShow}
            getShowTier={getShowTier}
            getRankChangeLabel={getRankChangeLabel}
            isShowMarkedForRemoval={isShowMarkedForRemoval}
            onDragEnd={(payload) => handleDragEnd({ ...payload, listItems })}
            onOpenShowDetails={openShowDetails}
            tabBarHeight={tabBarHeight}
            tierHeaders={TIER_HEADERS}
            lineMeta={LINE_META}
            showCategoryNav={showCategoryNav}
            bottomAccessoryHeight={saveBarHeight}
          />
        )}
      </View>
      {hasUnsavedRankingChanges && viewMode === "rank" ? (
        <View
          style={[
            styles.saveBar,
            {
              bottom: tabBarHeight + 12,
              backgroundColor: surfaceColor,
              borderColor,
            },
          ]}
        >
          <View style={styles.saveBarTextWrap}>
            <Text style={[styles.saveBarTitle, { color: loadingTextColor }]}>Ranking changes</Text>
            <Text style={[styles.saveBarSubtitle, { color: mutedTextColor }]}>
              {changeSummaryText}
            </Text>
          </View>
          <Pressable
            onPress={discardRankingChanges}
            disabled={isSavingRankingChanges}
            style={styles.discardButton}
          >
            <Text style={[styles.discardButtonText, { color: mutedTextColor }]}>Discard</Text>
          </Pressable>
          <Pressable
            onPress={() => void saveAndContinue()}
            disabled={isSavingRankingChanges}
            style={[
              styles.saveButton,
              { backgroundColor: accentColor },
              isSavingRankingChanges && styles.saveButtonDisabled,
            ]}
          >
            {isSavingRankingChanges ? (
              <ActivityIndicator color={onAccentColor} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: onAccentColor }]}>Save</Text>
            )}
          </Pressable>
        </View>
      ) : null}
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
  saveBar: {
    position: "absolute",
    left: 16,
    right: 16,
    minHeight: 60,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBarTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  saveBarTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveBarSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  discardButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  discardButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveButton: {
    minWidth: 68,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
