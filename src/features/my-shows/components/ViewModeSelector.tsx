import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "list", label: "List", icon: "≡" },
  { key: "diary", label: "Diary", icon: "📓" },
  { key: "map", label: "Map", icon: "◉" },
  { key: "cloud", label: "Cloud", icon: "☁" },
];

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onChangeViewMode }: ViewModeSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const bg = theme === "dark" ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;
  const textColor = Colors[theme].text;
  const mutedColor = Colors[theme].mutedText;
  const activeBg = accentColor + "18";

  return (
    <View style={[styles.bar, { backgroundColor: bg, borderTopColor: borderColor }]}>
      {MODES.map((mode) => {
        const isActive = viewMode === mode.key;
        return (
          <Pressable
            key={mode.key}
            style={[styles.tab, isActive && { backgroundColor: activeBg }]}
            onPress={() => onChangeViewMode(mode.key)}
            hitSlop={4}
          >
            <Text style={[styles.icon, { color: isActive ? accentColor : mutedColor }]}>
              {mode.icon}
            </Text>
            <Text
              style={[
                styles.label,
                { color: isActive ? accentColor : mutedColor },
                isActive && styles.labelActive,
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2,
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
  labelActive: {
    fontWeight: "700",
  },
});
