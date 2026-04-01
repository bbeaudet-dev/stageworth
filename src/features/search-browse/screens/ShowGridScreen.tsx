import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShowCard } from "@/features/browse/components/ShowCard";
import { styles as browseStyles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";

const GRID_COLUMNS = 4;

type CategoryConfig = {
  title: string;
  query: "now-playing" | "closing-soon" | "coming-soon" | "all";
};

const CATEGORIES: Record<string, CategoryConfig> = {
  "now-playing": { title: "Now Playing", query: "now-playing" },
  "closing-soon": { title: "Closing Soon", query: "closing-soon" },
  "coming-soon": { title: "Coming Soon", query: "coming-soon" },
  all: { title: "All Shows", query: "all" },
};

function chunkIntoRows<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

export default function ShowGridScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const bg = Colors[theme].background;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;

  const config = CATEGORIES[category ?? ""] ?? CATEGORIES["now-playing"];

  const currentShows = useQuery(
    api.productions.listCurrent,
    config.query === "now-playing" ? {} : "skip",
  );
  const closingSoon = useQuery(
    api.productions.listClosingSoon,
    config.query === "closing-soon" ? { days: 30 } : "skip",
  );
  const upcomingShows = useQuery(
    api.productions.listUpcoming,
    config.query === "coming-soon" ? { days: 90 } : "skip",
  );
  const allShows = useQuery(
    api.shows.list,
    config.query === "all" ? {} : "skip",
  );

  const navigateToShow = (showId: string, showName?: string) => {
    router.push({
      pathname: "/(tabs)/search/show/[showId]",
      params: { showId, name: showName, _ts: Date.now().toString() },
    });
  };

  const items = useMemo(() => {
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
    const result: { _id: string; showId: string; name: string; type?: string; images: string[] }[] = [];
    for (const p of productions) {
      if (seen.has(p.show._id)) continue;
      seen.add(p.show._id);
      const resolvedImage = p.posterUrl ?? p.show.images[0] ?? null;
      result.push({
        _id: p._id,
        showId: p.show._id,
        name: p.show.name,
        type: p.show.type,
        images: resolvedImage ? [resolvedImage] : [],
      });
    }
    return result;
  }, [config.query, allShows, currentShows, closingSoon, upcomingShows]);

  const isLoading = items === null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: bg }]} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backButton}>
          <IconSymbol name="chevron.left" size={22} color={text} />
        </Pressable>
        <Text style={[s.title, { color: text }]}>{config.title}</Text>
        <View style={s.backButton} />
      </View>

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
            {chunkIntoRows(items, GRID_COLUMNS).map((row, ri) => (
              <View key={ri} style={browseStyles.gridRow}>
                {row.map((item) => (
                  <ShowCard
                    key={item._id}
                    show={{ name: item.name, type: item.type, images: item.images }}
                    onPress={() => navigateToShow(item.showId, item.name)}
                  />
                ))}
                {row.length < GRID_COLUMNS &&
                  Array.from({ length: GRID_COLUMNS - row.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={browseStyles.gridPlaceholder} />
                  ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  countText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
