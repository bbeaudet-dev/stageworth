import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { daysUntil } from "@/features/browse/logic/date";
import { styles } from "@/features/browse/styles";
import type { ProductionWithShow } from "@/features/browse/types";
import { getProductionStatus } from "@/utils/productions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";

type BadgeConfig = { label: string; bg: string; text: string };

/** Human-readable label for a closing countdown (≤30 days). */
export function closingCountdownLabel(diffDays: number): string {
  if (diffDays === 0) return "Closes today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 28) {
    const w = Math.floor(diffDays / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }
  return "1 month";
}

function getStatusBadge(
  production: ProductionWithShow,
  status: ReturnType<typeof getProductionStatus>,
  isDark: boolean
): BadgeConfig | null {
  // Closing soon — highest priority
  if ((status === "open" || status === "open_run" || status === "in_previews") && production.closingDate) {
    const d = daysUntil(production.closingDate);
    if (d >= 0 && d <= 30) {
      return isDark
        ? { label: closingCountdownLabel(d), bg: "rgba(239,68,68,0.18)", text: "#F87171" }
        : { label: closingCountdownLabel(d), bg: "#FEF2F2", text: "#E05252" };
    }
  }
  if (status === "open_run") return isDark
    ? { label: "Open Run", bg: "rgba(34,197,94,0.15)", text: "#4ADE80" }
    : { label: "Open Run", bg: "#F0FDF4", text: "#22C55E" };
  if (status === "open") return isDark
    ? { label: "Running", bg: "rgba(34,197,94,0.12)", text: "#4ADE80" }
    : { label: "Running", bg: "#F0FDF4", text: "#22C55E" };
  if (status === "in_previews") return isDark
    ? { label: "Previews", bg: "rgba(59,130,246,0.15)", text: "#60A5FA" }
    : { label: "Previews", bg: "#EFF6FF", text: "#3B82F6" };
  if (status === "announced") return isDark
    ? { label: "Announced", bg: "rgba(234,179,8,0.15)", text: "#FACC15" }
    : { label: "Announced", bg: "#FEFCE8", text: "#CA8A04" };
  if (status === "closed") return isDark
    ? { label: "Closed", bg: "rgba(156,163,175,0.12)", text: "#D1D5DB" }
    : { label: "Closed", bg: "#F3F4F6", text: "#9CA3AF" };
  return null;
}

export function ProductionCard({
  production,
  onPress,
}: {
  production: ProductionWithShow;
  onPress: () => void;
}) {
  const status = getProductionStatus(production);
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];
  const badge = getStatusBadge(production, status, isDark);
  const show = production.show;
  const image = production.posterUrl ?? show?.images?.[0];

  return (
    <Pressable
      style={[styles.playbillCard, { backgroundColor: c.surfaceElevated }]}
      onPress={onPress}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.playbillImage} contentFit="cover" />
      ) : (
        <ShowPlaceholder name={show?.name ?? ""} type={show?.type} />
      )}
      {production.ticketmasterEventUrl && image ? (
        <View style={local.attributionRow}>
          <Text style={[local.attributionText, { color: c.mutedText }]}>
            via Ticketmaster
          </Text>
        </View>
      ) : null}
      {badge ? (
        <View style={[local.badgeStrip, { backgroundColor: badge.bg }]}>
          <Text style={[local.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const local = StyleSheet.create({
  badgeStrip: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
  attributionRow: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  attributionText: {
    fontSize: 7,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
});
