import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductionCard } from "@/features/browse/components/ProductionCard";
import { ShowCard } from "@/features/browse/components/ShowCard";
import { useBrowseData } from "@/features/browse/hooks/useBrowseData";
import { styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type BrowseMode = "current" | "all";

function chunkIntoRows<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

const ALL_SHOWS_PAGE_SIZE = 100;

export default function BrowseScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<BrowseMode>("current");
  const [allShowsLimit, setAllShowsLimit] = useState(ALL_SHOWS_PAGE_SIZE);
  const isNavigatingRef = useRef(false);
  const { allProductions, sections, shows, currentCount, allCount } = useBrowseData(search);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const inputBackgroundColor = theme === "dark" ? Colors.dark.surface : "#f0f0f0";
  const placeholderColor = theme === "dark" ? "#777" : "#aaa";
  const mutedTextColor = Colors[theme].mutedText;
  const chipBorderColor = Colors[theme].border;
  const chipBackground = Colors[theme].surface;
  const chipActiveBackground = theme === "dark" ? Colors.dark.text : "#111";
  const chipTextActiveColor = theme === "dark" ? "#111" : "#fff";
  const linkColor = Colors[theme].accent;

  useEffect(() => {
    setAllShowsLimit(ALL_SHOWS_PAGE_SIZE);
  }, [search]);

  const isLoadingCurrent = allProductions === undefined;
  const isLoadingAll = shows === undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: primaryTextColor }]}>Browse</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchInputWrapper, { backgroundColor: inputBackgroundColor }]}>
          <TextInput
            style={[styles.searchInput, { color: primaryTextColor }]}
            placeholder="Search shows or theatres…"
            placeholderTextColor={placeholderColor}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              style={styles.clearSearchButton}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterChips}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: chipBorderColor, backgroundColor: chipBackground },
              mode === "current" && [
                styles.filterChipActive,
                { backgroundColor: chipActiveBackground, borderColor: chipActiveBackground },
              ],
            ]}
            onPress={() => setMode("current")}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: mutedTextColor },
                mode === "current" && [
                  styles.filterChipTextActive,
                  { color: chipTextActiveColor },
                ],
              ]}
            >
              Current
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: chipBorderColor, backgroundColor: chipBackground },
              mode === "all" && [
                styles.filterChipActive,
                { backgroundColor: chipActiveBackground, borderColor: chipActiveBackground },
              ],
            ]}
            onPress={() => setMode("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: mutedTextColor },
                mode === "all" && [
                  styles.filterChipTextActive,
                  { color: chipTextActiveColor },
                ],
              ]}
            >
              All
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.countText, { color: mutedTextColor }]}>
          {currentCount} current · {allCount} total
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {mode === "current" ? (
          isLoadingCurrent ? (
            <Text style={[styles.empty, { color: mutedTextColor }]}>Loading…</Text>
          ) : sections.length === 0 ? (
            <Text style={[styles.empty, { color: mutedTextColor }]}>
              {search ? "No results." : "No current or upcoming productions yet."}
            </Text>
          ) : (
            sections.map((section) => (
              <View key={section.title}>
                <Text style={[styles.sectionHeader, { color: mutedTextColor }]}>{section.title}</Text>
                {chunkIntoRows(section.data, 4).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.gridRow}>
                    {row.map((production) => (
                      <ProductionCard
                        key={production._id}
                        production={production}
                        onPress={() => {
                          if (isNavigatingRef.current) return;
                          if (!production.show?._id) return;
                          isNavigatingRef.current = true;
                          router.push({
                            pathname: "/show/[showId]",
                            params: {
                              showId: String(production.show._id),
                              name: production.show?.name ?? "Show",
                            },
                          });
                          setTimeout(() => {
                            isNavigatingRef.current = false;
                          }, 500);
                        }}
                      />
                    ))}
                    {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                      <View key={i} style={styles.gridPlaceholder} />
                    ))}
                  </View>
                ))}
              </View>
            ))
          )
        ) : isLoadingAll ? (
          <Text style={[styles.empty, { color: mutedTextColor }]}>Loading…</Text>
        ) : !shows || shows.length === 0 ? (
          <Text style={[styles.empty, { color: mutedTextColor }]}>
            {search ? "No results." : "No shows yet."}
          </Text>
        ) : (
          <>
            {chunkIntoRows(shows.slice(0, allShowsLimit), 4).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {row.map((show) => (
                  <ShowCard
                    key={show._id}
                    show={show}
                    onPress={() => {
                      if (isNavigatingRef.current) return;
                      isNavigatingRef.current = true;
                      router.push({
                        pathname: "/show/[showId]",
                        params: {
                          showId: String(show._id),
                          name: show.name ?? "Show",
                        },
                      });
                      setTimeout(() => {
                        isNavigatingRef.current = false;
                      }, 500);
                    }}
                  />
                ))}
                {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                  <View key={i} style={styles.gridPlaceholder} />
                ))}
              </View>
            ))}
            {shows.length > allShowsLimit && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setAllShowsLimit((prev) => prev + ALL_SHOWS_PAGE_SIZE)}
              >
                <Text style={[styles.loadMoreText, { color: linkColor }]}>
                  Load more ({shows.length - allShowsLimit} remaining)
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
