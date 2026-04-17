import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import type { VisitsMode } from "@/features/community/hooks/useLeaderboardData";
import { useColorScheme } from "@/hooks/use-color-scheme";

const VISITS_MODES: { key: VisitsMode; label: string }[] = [
  { key: "shows", label: "Shows" },
  { key: "visits", label: "Visits" },
  { key: "single_show", label: "Single Show" },
  { key: "select_show", label: "Select Show" },
];

export type SelectedShow = {
  _id: Id<"shows">;
  name: string;
  images?: string[] | null;
};

interface VisitsModeHeaderProps {
  visitsMode: VisitsMode;
  selectedShow: SelectedShow | null;
  showSearchQuery: string;
  showSearchResults: SelectedShow[] | undefined;
  onVisitsModeChange: (mode: VisitsMode) => void;
  onShowSelect: (show: SelectedShow) => void;
  onShowQueryChange: (q: string) => void;
  onClearShow: () => void;
}

export function VisitsModeHeader({
  visitsMode,
  selectedShow,
  showSearchQuery,
  showSearchResults,
  onVisitsModeChange,
  onShowSelect,
  onShowQueryChange,
  onClearShow,
}: VisitsModeHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  const chipBg = theme === "dark" ? "#111115" : "#fff";
  const chipBgActive = accentColor + "1f";
  const chipText = theme === "dark" ? "#b0b4bc" : "#666";
  const chipTextActive = accentColor;
  const chipBorderActive = accentColor + "66";

  return (
    <View style={styles.visitsSubFilter}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitsModeRow}>
        {VISITS_MODES.map((mode) => (
          <Pressable
            key={mode.key}
            style={[
              styles.chip,
              { backgroundColor: chipBg, borderColor },
              visitsMode === mode.key && { backgroundColor: chipBgActive, borderColor: chipBorderActive },
            ]}
            onPress={() => onVisitsModeChange(mode.key)}
          >
            <Text
              style={[
                styles.chipText,
                { color: chipText },
                visitsMode === mode.key && { color: chipTextActive },
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {visitsMode === "select_show" && (
        <View style={styles.showSearchContainer}>
          {selectedShow ? (
            <View style={[styles.selectedShowRow, { backgroundColor: chipBgActive, borderColor: chipBorderActive }]}>
              {selectedShow.images?.[0] ? (
                <Image source={{ uri: selectedShow.images[0] }} style={styles.selectedShowThumb} contentFit="cover" />
              ) : null}
              <Text style={[styles.selectedShowName, { color: accentColor }]} numberOfLines={1}>
                {selectedShow.name}
              </Text>
              <Pressable onPress={onClearShow} hitSlop={8}>
                <IconSymbol name="xmark.circle.fill" size={16} color={accentColor} />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.showSearchInput, { backgroundColor: surfaceColor, borderColor, color: primaryTextColor }]}
                placeholder="Search for a show..."
                placeholderTextColor={mutedTextColor}
                value={showSearchQuery}
                onChangeText={onShowQueryChange}
                autoCorrect={false}
              />
              {showSearchResults && showSearchResults.length > 0 && (
                <View style={[styles.showSearchResults, { backgroundColor: surfaceColor, borderColor }]}>
                  {showSearchResults.map((show) => (
                    <Pressable
                      key={String(show._id)}
                      style={[styles.showSearchRow, { borderBottomColor: borderColor }]}
                      onPress={() => onShowSelect({ _id: show._id, name: show.name, images: show.images })}
                    >
                      {show.images?.[0] ? (
                        <Image source={{ uri: show.images[0] }} style={styles.showSearchThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.showSearchThumb, { backgroundColor: accentColor + "22" }]} />
                      )}
                      <Text style={[styles.showSearchName, { color: primaryTextColor }]} numberOfLines={1}>
                        {show.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  visitsSubFilter: {
    marginBottom: 12,
    gap: 10,
  },
  visitsModeRow: {
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
  showSearchContainer: { gap: 6 },
  selectedShowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  selectedShowThumb: { width: 30, height: 40, borderRadius: 4, overflow: "hidden" },
  selectedShowName: { flex: 1, fontSize: 14, fontWeight: "600" },
  showSearchInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  showSearchResults: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  showSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  showSearchThumb: { width: 28, height: 38, borderRadius: 3, overflow: "hidden" },
  showSearchName: { flex: 1, fontSize: 14, fontWeight: "500" },
});
