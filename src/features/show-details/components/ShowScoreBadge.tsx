import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function deriveShowScoreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ShowScoreBadgeProps {
  showName: string;
  rating: number;
  reviewCount?: number | string | null;
  slug?: string | null;
}

export function ShowScoreBadge({ showName, rating, reviewCount, slug }: ShowScoreBadgeProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  return (
    <Pressable
      onPress={() => {
        const s = slug ?? deriveShowScoreSlug(showName);
        Linking.openURL(`https://www.show-score.com/broadway-shows/${s}`);
      }}
      style={({ pressed }) => [
        styles.badge,
        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F5F5F5", opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.value, { color: c.text }]}>{rating}%</Text>
      <Text style={[styles.label, { color: c.mutedText }]}>
        ShowScore{reviewCount ? ` · ${reviewCount} reviews` : ""}
      </Text>
    </Pressable>
  );
}

/** Full-width row variant for placement above other sections */
export function ShowScoreBadgeRow(props: ShowScoreBadgeProps) {
  return (
    <View style={styles.row}>
      <ShowScoreBadge {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  value: { fontSize: 15, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "500" },
});
