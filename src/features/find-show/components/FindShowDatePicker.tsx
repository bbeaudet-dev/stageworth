import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { WheelDatePicker } from "@/components/WheelDatePicker";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDateObject, parseISODate, toISODate } from "@/utils/dates";

interface FindShowDatePickerProps {
  /** ISO `YYYY-MM-DD`, or null for "Any time". */
  date: string | null;
  onChangeDate: (next: string | null) => void;
}

/**
 * Two-mode selector: an "Any time" chip and a "Specific date" chip. Tapping the
 * specific-date chip reveals the WheelDatePicker below. We don't auto-collapse
 * on change because users often adjust multiple columns.
 */
export function FindShowDatePicker({ date, onChangeDate }: FindShowDatePickerProps) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  const [expanded, setExpanded] = useState(false);

  const anySelected = date === null;
  const specificSelected = date !== null;

  const selectAny = () => {
    onChangeDate(null);
    setExpanded(false);
  };

  const selectSpecific = () => {
    if (!specificSelected) {
      // Default to today when flipping into "specific date" mode.
      onChangeDate(toISODate(new Date()));
    }
    setExpanded(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        <Pressable
          onPress={selectAny}
          style={[
            styles.chip,
            {
              backgroundColor: anySelected ? c.accent : c.surfaceElevated,
              borderColor: anySelected ? c.accent : c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: anySelected ? c.onAccent : c.text },
            ]}
          >
            Any time
          </Text>
        </Pressable>
        <Pressable
          onPress={selectSpecific}
          style={[
            styles.chip,
            {
              backgroundColor: specificSelected ? c.accent : c.surfaceElevated,
              borderColor: specificSelected ? c.accent : c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: specificSelected ? c.onAccent : c.text },
            ]}
          >
            Specific date
          </Text>
        </Pressable>
      </View>

      {specificSelected && (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surfaceElevated, borderColor: c.border },
          ]}
        >
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={[
              styles.cardHeader,
              expanded && {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : c.accent + "10",
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: c.mutedText }]}>Date</Text>
            <View style={styles.cardValueRow}>
              <Text style={[styles.cardValue, { color: c.accent }]}>
                {formatDateObject(parseISODate(date!))}
              </Text>
              <IconSymbol
                name={expanded ? "chevron.up" : "chevron.down"}
                size={14}
                color={c.accent}
              />
            </View>
          </Pressable>

          {expanded && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <WheelDatePicker
                value={parseISODate(date!)}
                onChange={(next) => onChangeDate(toISODate(next))}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 14, fontWeight: "600" },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardLabel: { fontSize: 13, fontWeight: "600" },
  cardValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardValue: { fontSize: 15, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth },
});
