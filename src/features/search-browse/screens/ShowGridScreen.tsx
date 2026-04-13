import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShowCard } from "@/features/browse/components/ShowCard";
import { AddToListSheet } from "@/components/AddToListSheet";
import {
  railBadgeForClosingSoon,
  railBadgeForProduction,
  type FullStatusBadge,
} from "@/features/browse/components/ProductionCard";
import { styles as browseStyles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

type ShowGridItem = {
  _id: Id<"shows">;
  showId: Id<"shows">;
  name: string;
  type?: "musical" | "play" | "opera" | "dance" | "revue" | "comedy" | "magic" | "other";
  images: string[];
  badge?: FullStatusBadge;
};

const GRID_COLUMNS = 4;
const PAGE_SIZE = 100;

type CategoryConfig = {
  title: string;
  query: "now-playing" | "closing-soon" | "upcoming" | "all";
};

const CATEGORIES: Record<string, CategoryConfig> = {
  "now-playing": { title: "Now Playing", query: "now-playing" },
  "closing-soon": { title: "Closing Soon", query: "closing-soon" },
  "upcoming": { title: "Upcoming", query: "upcoming" },
  all: { title: "All Shows", query: "all" },
};

export default function ShowGridScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const tabBarHeight = useBottomTabBarHeight();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const bg = Colors[theme].background;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;

  const config = CATEGORIES[category ?? ""] ?? CATEGORIES["now-playing"];

  // router.push() with an absolute pathname dispatches through the root
  // navigator tree and can end up placing show/[showId] as the only screen
  // in the search stack on subsequent navigations. That leaves the back button
  // visible (parent tab has history so canGoBack() is true) but non-functional
  // (the search stack itself has nothing to pop). Using navigation.push()
  // directly targets the nearest Stack navigator (the search stack) so every
  // tap correctly lands on top of the existing [index → shows/[cat]] stack.
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isNavigatingRef = useRef(false);

  const currentShows = useQuery(
    api.productions.listCurrent,
    config.query === "now-playing" ? {} : "skip",
  );
  // Grid shows full 10-week closing window and all upcoming (no days cap).
  const closingSoon = useQuery(
    api.productions.listClosingSoon,
    config.query === "closing-soon" ? { days: 70 } : "skip",
  );
  const upcomingShows = useQuery(
    api.productions.listUpcoming,
    config.query === "upcoming" ? {} : "skip",
  );
  const allShows = useQuery(
    api.shows.list,
    config.query === "all" ? {} : "skip",
  );

  const navigateToShow = (showId: string, showName?: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    navigation.push("show/[showId]", { showId, name: showName });
    setTimeout(() => { isNavigatingRef.current = false; }, 800);
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isDark = theme === "dark";

  const items = useMemo((): ShowGridItem[] | null => {
    if (config.query === "all" && allShows) {
      return allShows
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((show) => ({
          _id: show._id,
          showId: show._id,
          name: show.name,
          type: show.type,
          images: show.images,
        }));
    }

    const productions =
      config.query === "now-playing" ? currentShows :
      config.query === "closing-soon" ? closingSoon :
      upcomingShows;

    if (!productions) return null;

    const seen = new Set<string>();
    const result: ShowGridItem[] = [];
    for (const p of productions) {
      if (seen.has(p.show._id)) continue;
      seen.add(p.show._id);
      const resolvedImage = p.posterUrl ?? p.show.images[0] ?? null;
      const badge =
          config.query === "upcoming"
          ? railBadgeForProduction(p, isDark, todayStr) ?? undefined
          : config.query === "closing-soon"
            ? railBadgeForClosingSoon(p, isDark, todayStr) ?? undefined
            : undefined;
      result.push({
        _id: p.show._id,
        showId: p.show._id,
        name: p.show.name,
        type: p.show.type,
        images: resolvedImage ? [resolvedImage] : [],
        badge,
      });
    }
    return result;
  }, [config.query, allShows, currentShows, closingSoon, upcomingShows, isDark, todayStr]);

  const isLoading = items === null;
  const visible = useMemo(
    () => (items ? items.slice(0, limit) : []),
    [items, limit]
  );
  const remaining = items ? items.length - visible.length : 0;

  const visibleShowIds = useMemo<Id<"shows">[]>(
    () => visible.map((item) => item.showId),
    [visible]
  );
  const listStatuses = useQuery(
    api.lists.getShowListStatuses,
    visibleShowIds.length > 0 ? { showIds: visibleShowIds } : "skip"
  );

  const [listSheetShowId, setListSheetShowId] = useState<Id<"shows"> | null>(null);
  const [listSheetShowName, setListSheetShowName] = useState("");

  return (
    <SafeAreaView style={[s.container, { backgroundColor: bg }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: config.title,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        style={browseStyles.list}
        contentContainerStyle={[browseStyles.listContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={[browseStyles.empty, { color: muted }]}>Loading…</Text>
        ) : items.length === 0 ? (
          <Text style={[browseStyles.empty, { color: muted }]}>No shows found.</Text>
        ) : (
          <>
            <Text style={[s.countText, { color: muted }]}>
              {items.length} show{items.length !== 1 ? "s" : ""}
            </Text>
            {chunkRows(visible, GRID_COLUMNS).map((row, ri) => (
              <View key={ri} style={browseStyles.gridRow}>
                {row.map((item) => {
                  const rawStatus = listStatuses?.[item.showId];
                  const listStatus = (rawStatus as "want_to_see" | "look_into" | "not_interested" | "uncategorized" | undefined) ?? "none";
                  return (
                  <ShowCard
                    key={item._id}
                    show={{ name: item.name, type: item.type, images: item.images }}
                    badge={item.badge}
                    listStatus={listStatus}
                    onListIconPress={() => {
                      setListSheetShowId(item.showId);
                      setListSheetShowName(item.name);
                    }}
                    onPress={() => navigateToShow(item.showId, item.name)}
                  />
                  );
                })}
                {row.length < GRID_COLUMNS &&
                  Array.from({ length: GRID_COLUMNS - row.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={browseStyles.gridPlaceholder} />
                  ))}
              </View>
            ))}
            {remaining > 0 && (
              <Pressable
                style={browseStyles.loadMoreButton}
                onPress={() => setLimit((prev) => prev + PAGE_SIZE)}
              >
                <Text style={[browseStyles.loadMoreText, { color: accent }]}>
                  Load more ({remaining} remaining)
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
      <AddToListSheet
        visible={listSheetShowId !== null}
        showId={listSheetShowId}
        showName={listSheetShowName}
        onClose={() => setListSheetShowId(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  countText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
