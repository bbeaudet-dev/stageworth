import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const VIEW_MODES: ViewMode[] = ["list", "cloud", "diary"];

export function MyShowsHeader({
  viewMode,
  onChangeViewMode,
}: {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const titleColor = Colors[theme].text;
  const toggleBackground = theme === "dark" ? "#1f1f22" : "#f0f0f0";
  const toggleActiveBackground = theme === "dark" ? "#fff" : "#fff";

  return (
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          My Shows
        </Text>
      </View>
      <View style={styles.toggle}>
        {VIEW_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            activeOpacity={0.7}
            style={[
              styles.toggleButton,
              { backgroundColor: toggleBackground },
              viewMode === mode && [
                styles.toggleButtonActive,
                { backgroundColor: toggleActiveBackground },
              ],
            ]}
            onPress={() => onChangeViewMode(mode)}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode[0].toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  toggle: {
    flexDirection: "row",
    flexShrink: 0,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  toggleTextActive: {
    color: "#333",
  },
});
