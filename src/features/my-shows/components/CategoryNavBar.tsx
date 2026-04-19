import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function CategoryNavBar({
  canPrev,
  canNext,
  onPrev,
  onNext,
  currentLabel,
  bottomInset,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentLabel?: string | null;
  bottomInset: number;
}) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const containerBg = theme === "dark" ? "rgba(18,18,18,0.97)" : "rgba(255,255,255,0.97)";
  const borderColor = c.border;
  const buttonBg = theme === "dark" ? "#1e1e26" : "#ebebef";
  const buttonText = c.text;
  const labelColor = c.mutedText;
  const disabledTextColor = theme === "dark" ? "#4a4a55" : "#bfbfc6";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: containerBg,
          borderTopColor: borderColor,
          paddingBottom: 8 + bottomInset,
        },
      ]}
    >
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        style={[
          styles.button,
          { backgroundColor: buttonBg },
          !canPrev && styles.buttonDisabled,
        ]}
        hitSlop={6}
      >
        <Text
          style={[
            styles.buttonText,
            { color: canPrev ? buttonText : disabledTextColor },
          ]}
        >
          ‹ Back
        </Text>
      </Pressable>

      <View style={styles.labelWrap}>
        {currentLabel ? (
          <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
            {currentLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        style={[
          styles.button,
          { backgroundColor: buttonBg },
          !canNext && styles.buttonDisabled,
        ]}
        hitSlop={6}
      >
        <Text
          style={[
            styles.buttonText,
            { color: canNext ? buttonText : disabledTextColor },
          ]}
        >
          Next ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 84,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelWrap: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
