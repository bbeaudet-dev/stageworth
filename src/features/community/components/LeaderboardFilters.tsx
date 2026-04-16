import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Colors } from "@/constants/theme";
import type { Category, Scope } from "@/features/community/hooks/useLeaderboardData";
import { useColorScheme } from "@/hooks/use-color-scheme";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "shows", label: "Shows" },
  { key: "visits", label: "Visits" },
  { key: "theatres", label: "Theatres" },
  { key: "signups", label: "Signups" },
  { key: "streak", label: "Streak" },
  { key: "score", label: "Score" },
];

interface LeaderboardFiltersProps {
  category: Category;
  scope: Scope;
  onCategoryChange: (cat: Category) => void;
  onScopeChange: (scope: Scope) => void;
}

export function LeaderboardFilters({
  category,
  scope,
  onCategoryChange,
  onScopeChange,
}: LeaderboardFiltersProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  const chipBg = theme === "dark" ? "#111115" : "#fff";
  const chipBgActive = accentColor + "1f";
  const chipText = theme === "dark" ? "#b0b4bc" : "#666";
  const chipTextActive = accentColor;
  const chipBorderActive = accentColor + "66";

  return (
    <>
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor },
                category === cat.key && { backgroundColor: chipBgActive, borderColor: chipBorderActive },
              ]}
              onPress={() => onCategoryChange(cat.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: chipText },
                  category === cat.key && { color: chipTextActive },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.scopeRow}>
        <SegmentedControl
          options={[
            { value: "all", label: "All Users" },
            { value: "friends", label: "Friends" },
          ]}
          value={scope}
          onChange={(v) => onScopeChange(v as "all" | "friends")}
          accentColor={accentColor}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  categoryRow: {
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  scopeRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
});
