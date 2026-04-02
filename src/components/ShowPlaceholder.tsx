import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

const TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Show",
};

const TYPE_ACCENT: Record<ShowType, { light: string; dark: string }> = {
  musical: { light: "#E65100", dark: "#FFB74D" },
  play: { light: "#1B5E20", dark: "#81C784" },
  opera: { light: "#4A148C", dark: "#CE93D8" },
  dance: { light: "#880E4F", dark: "#F48FB1" },
  other: { light: "#37474F", dark: "#B0BEC5" },
};

export function ShowPlaceholder({
  name,
  type,
  style,
}: {
  name: string;
  type?: ShowType | string;
  style?: object;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";
  const showType = (type ?? "other") as ShowType;
  const accent = TYPE_ACCENT[showType] ?? TYPE_ACCENT.other;
  const accentColor = isDark ? accent.dark : accent.light;

  return (
    <View style={[s.container, { backgroundColor: c.surface }, style]}>
      <Text
        style={[s.typeLabel, { color: accentColor }]}
        numberOfLines={1}
      >
        {TYPE_LABELS[showType] ?? "Show"}
      </Text>
      <Text
        style={[s.name, { color: c.mutedText }]}
        numberOfLines={4}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {name}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 2 / 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
