import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShowCard } from "@/features/browse/components/ShowCard";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

const GRID_GAP = 8;
const COLUMNS = 4;
const CONTAINER_PADDING = 16;
const INITIAL_ROWS = 3;
const PAGE_ROWS = 3;
const INITIAL_COUNT = INITIAL_ROWS * COLUMNS;
const PAGE_SIZE = PAGE_ROWS * COLUMNS;

interface PublicShowsGridProps {
  userId: Id<"users">;
  onPressShow?: (showId: Id<"shows">, showName: string) => void;
}

export function PublicShowsGrid({ userId, onPressShow }: PublicShowsGridProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const { width: screenWidth } = useWindowDimensions();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const accentColor = Colors[theme].accent;
  const mutedTextColor = Colors[theme].mutedText;

  const shows = useQuery(api.rankings.getPublicRankedShows, { userId });

  const cardWidth = useMemo(() => {
    const totalPadding = CONTAINER_PADDING * 2 + 16 * 2;
    const totalGaps = GRID_GAP * (COLUMNS - 1);
    return Math.floor((screenWidth - totalPadding - totalGaps) / COLUMNS);
  }, [screenWidth]);

  const visibleShows = useMemo(() => {
    if (!shows) return [];
    return shows.slice(0, visibleCount);
  }, [shows, visibleCount]);

  const rows = useMemo(() => chunkRows(visibleShows, COLUMNS), [visibleShows]);

  if (shows === undefined) return null;
  if (shows.length === 0) return null;

  const hasMore = shows.length > visibleCount;
  const remaining = shows.length - visibleCount;
  const nextPageCount = Math.min(PAGE_SIZE, remaining);
  const canCollapse = !hasMore && shows.length > INITIAL_COUNT;

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <IconSymbol name="star.fill" size={15} color={accentColor} />
        <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Top Shows</Text>
      </View>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((show) => (
              <ShowCard
                key={String(show._id)}
                show={{ name: show.name, type: show.type, images: show.images }}
                onPress={() => onPressShow?.(show._id, show.name)}
                containerStyle={[styles.tileCard, { width: cardWidth }]}
              />
            ))}
          </View>
        ))}
      </View>
      {(hasMore || canCollapse) && (
        <Pressable
          onPress={() => {
            if (hasMore) {
              setVisibleCount((prev) => Math.min(shows.length, prev + PAGE_SIZE));
            } else {
              setVisibleCount(INITIAL_COUNT);
            }
          }}
          style={({ pressed }) => [
            styles.toggleButton,
            { borderColor, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.toggleText, { color: accentColor }]}>
            {hasMore ? `See ${nextPageCount} more` : "Show less"}
          </Text>
          {hasMore && (
            <Text style={[styles.toggleCount, { color: mutedTextColor }]}>
              {visibleCount} of {shows.length}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: CONTAINER_PADDING,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  grid: {
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  tileCard: {
    flex: 0,
    borderRadius: 10,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleCount: {
    fontSize: 12,
    fontWeight: "500",
  },
});
