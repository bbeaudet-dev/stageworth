import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const VIEW_MODE_OPTIONS = [
  { value: "cloud", label: "Cloud" },
  { value: "list",  label: "List"  },
  { value: "diary", label: "Diary" },
] as const;

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onChangeViewMode }: ViewModeSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const borderColor = Colors[theme].border;
  const containerBg = theme === "dark" ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";

  return (
    <View style={[styles.bar, { backgroundColor: containerBg, borderTopColor: borderColor }]}>
      <SegmentedControl
        options={VIEW_MODE_OPTIONS as unknown as { value: string; label: string }[]}
        value={viewMode}
        onChange={(v) => onChangeViewMode(v as ViewMode)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
