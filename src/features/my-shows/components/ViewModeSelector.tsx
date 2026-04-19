import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ViewMode } from "@/features/my-shows/types";

const VIEW_MODE_OPTIONS = [
  { value: "list",  label: "List"  },
  { value: "genre", label: "Genre" },
  { value: "diary", label: "Diary" },
  { value: "cloud", label: "Cloud" },
] as const;

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onChangeViewMode }: ViewModeSelectorProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const containerBg = theme === "dark" ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";

  return (
    <View style={[styles.bar, { backgroundColor: containerBg }]}>
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
