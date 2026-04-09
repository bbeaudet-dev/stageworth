import { StyleSheet, Text, View } from "react-native";

export type WeeklySchedule = {
  weekOf: string;
  mon: string[];
  tue: string[];
  wed: string[];
  thu: string[];
  fri: string[];
  sat: string[];
  sun: string[];
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatSlotLabel(slot: string): string {
  if (slot === "opening") return "Opening";
  const m = slot.match(/^(\d{2}):(\d{2})$/);
  if (!m) return slot;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  if (minute === 0) return `${hour12} ${ampm}`;
  return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

export function BroadwayShowtimesGrid({
  data,
  borderColor,
  surfaceColor,
  primaryTextColor,
  mutedTextColor,
}: {
  data: WeeklySchedule;
  borderColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  mutedTextColor: string;
}) {
  const maxSlots = Math.max(...DAY_KEYS.map((d) => data[d].length), 0);
  if (maxSlots === 0) return null;

  const rows = Array.from({ length: maxSlots }, (_, rowIdx) =>
    DAY_KEYS.map((day) => data[day][rowIdx] ?? null)
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
                      {formatSlotLabel(slot)}
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
