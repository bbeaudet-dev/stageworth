import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddToListSheet } from "@/components/AddToListSheet";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavGuard } from "@/hooks/use-nav-guard";
import { SearchBrowseHeader } from "@/features/search-browse/components/SearchBrowseHeader";
import { SearchResultsList } from "@/features/search-browse/components/SearchResultsList";
import { BrowseSections } from "@/features/search-browse/components/BrowseSections";
import { useSearchBrowse } from "@/features/search-browse/hooks/useSearchBrowse";

const GRID_GAP = 8;
const GRID_COLUMNS = 4;
const SECTION_PADDING = 16;

export default function SearchBrowseScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const bg = Colors[theme].background;
  const isDark = theme === "dark";

  const inputRef = useRef<TextInput>(null);
  const guard = useNavGuard();

  const [query, setQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  // Load-more limits per search section
  const [showLimit, setShowLimit] = useState(12);
  const [peopleLimit, setPeopleLimit] = useState(8);
  const [venueLimit, setVenueLimit] = useState(4);

  // List status sheet state
  const [listSheetShowId, setListSheetShowId] = useState<Id<"shows"> | null>(null);
  const [listSheetShowName, setListSheetShowName] = useState("");

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }, []),
  );

  const {
    trimmed,
    isSearchActive,
    showResults,
    userResults,
    venueResults,
    currentShows,
    upcomingShows,
    closingSoon,
    recentUsers,
    topTheatregoers,
    listStatuses,
    getListStatus,
  } = useSearchBrowse(query);

  // Reset per-section limits whenever the search query changes
  useEffect(() => {
    setShowLimit(12);
    setPeopleLimit(8);
    setVenueLimit(4);
  }, [trimmed]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const cardWidth = Math.floor(
    (screenWidth - SECTION_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const handleCancel = () => {
    setQuery("");
    setInputFocused(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const navigateToShow = guard((showId: string, showName?: string) => {
    router.push({ pathname: "/show/[showId]", params: { showId, name: showName, _ts: Date.now().toString() } });
  });

  const navigateToCategory = guard((category: string) => {
    router.push({ pathname: "/(tabs)/search/shows/[category]", params: { category } });
  });

  const openListSheet = (showId: Id<"shows">, showName: string) => {
    setListSheetShowId(showId);
    setListSheetShowName(showName);
  };

  const noResults =
    isSearchActive &&
    showResults !== undefined &&
    userResults !== undefined &&
    venueResults !== undefined &&
    !(showResults && showResults.length > 0) &&
    !(userResults && userResults.length > 0) &&
    !(venueResults && venueResults.length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
        <SearchBrowseHeader
          query={query}
          onQueryChange={setQuery}
          inputFocused={inputFocused}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onCancel={handleCancel}
          inputRef={inputRef}
        />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {isSearchActive && (
            <SearchResultsList
              showResults={showResults}
              userResults={userResults}
              venueResults={venueResults}
              trimmed={trimmed}
              noResults={noResults}
              showLimit={showLimit}
              peopleLimit={peopleLimit}
              venueLimit={venueLimit}
              onLoadMoreShows={() => setShowLimit((n) => n + 8)}
              onLoadMorePeople={() => setPeopleLimit((n) => n + 8)}
              onLoadMoreVenues={() => setVenueLimit((n) => n + 8)}
              cardWidth={cardWidth}
              getListStatus={getListStatus}
              onNavigateToShow={navigateToShow}
              onOpenListSheet={openListSheet}
            />
          )}

          {!isSearchActive && (
            <BrowseSections
              currentShows={currentShows}
              closingSoon={closingSoon}
              upcomingShows={upcomingShows}
              recentUsers={recentUsers as any}
              topTheatregoers={topTheatregoers as any}
              cardWidth={cardWidth}
              listStatuses={listStatuses ?? {}}
              todayStr={todayStr}
              isDark={isDark}
              navigateToShow={navigateToShow}
              navigateToCategory={navigateToCategory}
              openListSheet={openListSheet}
            />
          )}
        </ScrollView>
      </SafeAreaView>
      <AddToListSheet
        visible={listSheetShowId !== null}
        showId={listSheetShowId}
        showName={listSheetShowName}
        onClose={() => setListSheetShowId(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SECTION_PADDING,
    gap: 20,
  },
});
