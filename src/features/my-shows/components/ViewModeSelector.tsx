import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const VIEW_MODES: ViewMode[] = ["list", "diary", "map", "cloud"];

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onChangeViewMode }: ViewModeSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const pillBg = theme === "dark" ? "rgba(255,255,255,0.1)" : "#ececef";
  const activePillBg = theme === "dark" ? "rgba(255,255,255,0.92)" : "#ffffff";
  const containerBg = theme === "dark" ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";
  const borderColor = Colors[theme].border;

  return (
    <View style={[styles.bar, { backgroundColor: containerBg, borderTopColor: borderColor }]}>
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        {VIEW_MODES.map((mode) => {
          const isActive = viewMode === mode;
          return (
            <Pressable
              key={mode}
              style={[styles.segment, isActive && [styles.segmentActive, { backgroundColor: activePillBg }]]}
              onPress={() => onChangeViewMode(mode)}
              hitSlop={4}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  isActive ? styles.segmentTextActive : { color: theme === "dark" ? "#888" : "#7a7a7a" },
                ]}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  segmentActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  segmentTextActive: {
    color: "#333",
    fontWeight: "700",
  },
});
