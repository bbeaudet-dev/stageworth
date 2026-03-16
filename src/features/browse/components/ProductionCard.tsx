import { Pressable, Text, View } from "react-native";

import { formatDate, daysUntil } from "@/features/browse/logic/date";
import { styles } from "@/features/browse/styles";
import type { ProductionWithShow } from "@/features/browse/types";
import { getProductionStatus } from "@/utils/productions";

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

  const startDate = production.previewDate ?? production.openingDate;
  const dateRange = startDate
    ? production.closingDate
      ? `${formatDate(startDate)} – ${formatDate(production.closingDate)}`
      : `From ${formatDate(startDate)}`
    : null;

  const closingWarning = (() => {
    if (!production.closingDate || status === "closed") return null;
    const d = daysUntil(production.closingDate);
    if (d > 30) return null;
    return d <= 0 ? "Closing today" : `Closes in ${d}d`;
  })();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.showName} numberOfLines={1}>
            {show?.name ?? "Unknown Show"}
          </Text>
          <Text style={styles.theatre} numberOfLines={1}>
            {production.theatre}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>
      {(dateRange || closingWarning) && (
        <View style={styles.cardFooter}>
          {dateRange && <Text style={styles.dateRange}>{dateRange}</Text>}
          {closingWarning && (
            <View style={styles.closingPill}>
              <Text style={styles.closingText}>{closingWarning}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
