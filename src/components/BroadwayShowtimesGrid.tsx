import { StyleSheet, Text, View } from "react-native";

import {
  BROADWAY_SHOWTIMES_DAY_ORDER,
  formatBroadwaySlotLabel,
  type BroadwayShowtimesResult,
} from "@/lib/broadwayShowtimes";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function BroadwayShowtimesGrid({
  data,
  borderColor,
  surfaceColor,
  primaryTextColor,
  mutedTextColor,
}: {
  data: BroadwayShowtimesResult;
  borderColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  mutedTextColor: string;
}) {
  const maxSlots = Math.max(
    ...BROADWAY_SHOWTIMES_DAY_ORDER.map((d) => data.schedule[d].length),
    0
  );
  if (maxSlots === 0) return null;

  const rows = Array.from({ length: maxSlots }, (_, rowIdx) =>
    BROADWAY_SHOWTIMES_DAY_ORDER.map((day) => data.schedule[day][rowIdx] ?? null)
  );

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: surfaceColor }]}>
      <View style={styles.headerRow}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={[styles.dayHead, { color: mutedTextColor }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.slotsBlock}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.slotRow}>
            {row.map((slot, ci) => (
              <View key={ci} style={styles.cell}>
                {slot ? (
                  <View style={[styles.timeChip, { borderColor }]}>
                    <Text style={[styles.timeChipText, { color: primaryTextColor }]} numberOfLines={2}>
                      {formatBroadwaySlotLabel(slot)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.dash, { color: mutedTextColor }]}>—</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  headerRow: { flexDirection: "row" },
  dayHead: { flex: 1, fontSize: 9, fontWeight: "800", textAlign: "center" },
  slotsBlock: { gap: 2 },
  slotRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 22 },
  cell: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 1 },
  timeChip: {
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 3,
    paddingVertical: 2,
    width: "100%",
  },
  timeChipText: { fontSize: 8, fontWeight: "700", textAlign: "center", lineHeight: 11 },
  dash: { fontSize: 10, textAlign: "center" },
});
