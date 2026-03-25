import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { daysUntil } from "@/features/browse/logic/date";
import { styles } from "@/features/browse/styles";
import type { ProductionWithShow } from "@/features/browse/types";
import { getProductionStatus } from "@/utils/productions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Running", color: "#166534", bg: "#dcfce7" },
  in_previews: { label: "Previews", color: "#1e40af", bg: "#dbeafe" },
  announced: { label: "Announced", color: "#92400e", bg: "#fef3c7" },
  closed: { label: "Closed", color: "#6b7280", bg: "#f3f4f6" },
};

export function ProductionCard({
  production,
  onPress,
}: {
  production: ProductionWithShow;
  onPress: () => void;
}) {
  const status = getProductionStatus(production);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.closed;
  const show = production.show;
  const image = production.posterUrl ?? show?.images?.[0];

  const closingWarning = (() => {
    if (!production.closingDate || status === "closed") return null;
    const d = daysUntil(production.closingDate);
    if (d > 30) return null;
    return d <= 0 ? "Closing today" : `Closes in ${d}d`;
  })();

  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  return (
    <Pressable
      style={[styles.playbillCard, { backgroundColor: c.surfaceElevated }]}
      onPress={onPress}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.playbillImage} contentFit="cover" />
      ) : (
        <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
          <Text style={[styles.playbillFallbackText, { color: c.mutedText }]} numberOfLines={4}>
            {show?.name ?? ""}
          </Text>
        </View>
      )}
      <View style={styles.playbillInfo}>
        <Text style={[styles.playbillShowName, { color: c.text }]} numberOfLines={2}>
          {show?.name ?? "Unknown Show"}
        </Text>
        <View style={styles.playbillBadgeRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {closingWarning ? (
            <View style={styles.closingPill}>
              <Text style={styles.closingText}>{closingWarning}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
