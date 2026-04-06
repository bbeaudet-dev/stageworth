import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

const GRID_GAP = 8;
const COLUMNS = 4;
const CONTAINER_PADDING = 16;

interface PublicShowsGridProps {
  userId: Id<"users">;
  onPressShow?: (showId: Id<"shows">, showName: string) => void;
}

export function PublicShowsGrid({ userId, onPressShow }: PublicShowsGridProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const { width: screenWidth } = useWindowDimensions();

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;

  const shows = useQuery(api.rankings.getPublicRankedShows, { userId });

  const cardWidth = useMemo(() => {
    const totalPadding = CONTAINER_PADDING * 2 + 16 * 2;
    const totalGaps = GRID_GAP * (COLUMNS - 1);
    return Math.floor((screenWidth - totalPadding - totalGaps) / COLUMNS);
  }, [screenWidth]);

  const rows = useMemo(() => {
    if (!shows) return [];
    return chunkRows(shows, COLUMNS);
  }, [shows]);

  if (shows === undefined) return null;
  if (shows.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((show) => (
              <Pressable
                key={String(show._id)}
                style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
                onPress={onPressShow ? () => onPressShow(show._id, show.name) : undefined}
              >
                {show.images[0] ? (
                  <Image
                    source={{ uri: show.images[0] }}
                    style={styles.playbillImg}
                    contentFit="contain"
                  />
                ) : (
                  <ShowPlaceholder name={show.name} type={show.type} />
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: CONTAINER_PADDING,
  },
  grid: {
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  playbillCard: {
    borderRadius: 10,
    overflow: "hidden",
  },
  playbillImg: {
    width: "100%",
    aspectRatio: 2 / 3,
  },
});
