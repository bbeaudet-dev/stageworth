import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const VIEW_MODES: ViewMode[] = ["list", "cloud", "diary", "map"];

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
  const toggleBackground = theme === "dark" ? "#1f1f22" : "#ececef";
  const toggleActiveBackground = theme === "dark" ? "#fff" : "#fff";

  return (
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          My Shows
        </Text>
      </View>
      <View style={[styles.toggle, { backgroundColor: toggleBackground }]}>
        {VIEW_MODES.map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.toggleButton,
              viewMode === mode && [
                styles.toggleButtonActive,
                { backgroundColor: toggleActiveBackground },
              ],
            ]}
            onPress={() => onChangeViewMode(mode)}
          >
            <Text
              numberOfLines={1}
              style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  titleWrap: {
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  toggle: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 36,
    borderRadius: 10,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#7a7a7a",
    textAlign: "center",
  },
  toggleTextActive: {
    color: "#333",
  },
});
