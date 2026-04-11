import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Option {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Tints active label text and border. Defaults to theme accent. */
  accentColor?: string;
  disabled?: boolean;
}

/**
 * A compact sliding-pill segmented control.
 * Visual style: neutral track, active segment lifts with an elevated pill,
 * active text takes the brand accent color.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  accentColor,
  disabled,
}: SegmentedControlProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const accent = accentColor ?? c.accent;

  const trackBg = theme === "dark" ? "#1e1e26" : "#ebebef";
  const activePillBg = theme === "dark" ? "#2c2c38" : "#ffffff";
  const activeShadow = theme === "dark"
    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.35, shadowRadius: 2, elevation: 3 }
    : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5, elevation: 2 };
  const inactiveTextColor = theme === "dark" ? "#666" : "#999";

  return (
    <View style={[styles.track, { backgroundColor: trackBg }, disabled && styles.disabled]}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.segment,
              isActive && [styles.segmentActive, activeShadow, { backgroundColor: activePillBg }],
            ]}
            onPress={() => !disabled && onChange(opt.value)}
            hitSlop={4}
          >
            <Text
              style={[
                styles.label,
                isActive ? [styles.labelActive, { color: accent }] : { color: inactiveTextColor },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    borderRadius: 9,
    padding: 2,
  },
  segment: {
    flex: 1,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    paddingHorizontal: 8,
  },
  segmentActive: {},
  label: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  labelActive: {
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});
