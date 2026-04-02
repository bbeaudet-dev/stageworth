import { useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

type StatsCategory = "type" | "city" | "district";
type SortBy = "count" | "score";

const CATEGORY_LABELS: Record<StatsCategory, string> = {
  type: "Genres",
  city: "Cities",
  district: "Districts",
};

const DISPLAY_NAMES: Record<string, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
  broadway: "Broadway",
  off_broadway: "Off-Broadway",
  off_off_broadway: "Off-Off-Broadway",
  west_end: "West End",
  touring: "Touring",
  regional: "Regional",
};

interface TasteProfileProps {
  userId?: Id<"users">;
}

export function TasteProfile({ userId }: TasteProfileProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const [category, setCategory] = useState<StatsCategory>("type");
  const [sortBy, setSortBy] = useState<SortBy>("count");

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const chipBg = theme === "dark" ? "#1e1e24" : "#f4f4f5";
  const chipBgActive = theme === "dark" ? "#fff" : "#1f1f1f";
  const chipText = theme === "dark" ? "#a0a4aa" : "#666";
  const chipTextActive = theme === "dark" ? "#111" : "#fff";

  const recentActivity = useQuery(
    api.tasteProfile.getRecentActivity,
    userId ? { userId } : {},
  );

  const aggregatedStats = useQuery(api.tasteProfile.getAggregatedStats, {
    ...(userId ? { userId } : {}),
    category,
    sortBy,
  });

  if (recentActivity === undefined && aggregatedStats === undefined) return null;
  if (
    recentActivity &&
    recentActivity.visitCount === 0 &&
    (!aggregatedStats || aggregatedStats.length === 0)
  ) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      {/* Category selector */}
      <View style={styles.categoryRow}>
        {(["type", "city", "district"] as StatsCategory[]).map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg },
              category === cat && { backgroundColor: chipBgActive },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: chipText },
                category === cat && { color: chipTextActive },
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort + count */}
      {aggregatedStats && aggregatedStats.length > 0 && (
        <View style={styles.sortRow}>
          <Text style={[styles.countLabel, { color: mutedTextColor }]}>
            {aggregatedStats.length}{" "}
            {CATEGORY_LABELS[category].toLowerCase()}
          </Text>
          <Pressable
            onPress={() => setSortBy(sortBy === "count" ? "score" : "count")}
          >
            <Text style={[styles.sortLabel, { color: accentColor }]}>
              Sort by: {sortBy === "count" ? "Count" : "Avg Score"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Stats list */}
      {aggregatedStats?.map((item) => (
        <View key={item.category} style={[styles.statRow, { borderColor }]}>
          <View style={styles.statMain}>
            <Text style={[styles.statCategory, { color: primaryTextColor }]}>
              {DISPLAY_NAMES[item.category] ?? item.category}
            </Text>
            <Text style={[styles.statCount, { color: mutedTextColor }]}>
              {item.count} {item.count === 1 ? "visit" : "visits"}
            </Text>
          </View>
          {item.averageScore !== null && (
            <View style={[styles.scoreBadge, { backgroundColor: accentColor + "15" }]}>
              <Text style={[styles.scoreText, { color: accentColor }]}>
                {item.averageScore.toFixed(1)}
              </Text>
              <Text style={[styles.scoreOutOf, { color: mutedTextColor }]}>
                /10
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statMain: {
    flex: 1,
    gap: 2,
  },
  statCategory: {
    fontSize: 15,
    fontWeight: "600",
  },
  statCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
  },
  scoreOutOf: {
    fontSize: 11,
    fontWeight: "500",
  },
});
