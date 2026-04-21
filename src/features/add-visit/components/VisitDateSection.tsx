import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { WheelDatePicker } from "@/components/WheelDatePicker";
import { Colors } from "@/constants/theme";
import { styles } from "@/features/add-visit/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDateObject, parseISODate, toISODate } from "@/utils/dates";

export function VisitDateSection({
  date,
  setDate,
}: {
  date: string;
  setDate: (value: string) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.datePickerCard,
          { backgroundColor: c.surfaceElevated, borderColor: c.border },
        ]}
      >
        <Pressable
          style={[
            styles.datePickerRow,
            pickerOpen && { backgroundColor: c.accent + "12" },
          ]}
          onPress={() => setPickerOpen((prev) => !prev)}
        >
          <Text style={[styles.datePickerLabel, { color: c.mutedText }]}>Visit Date</Text>
          <View style={localStyles.valueRow}>
            <Text style={[styles.datePickerValue, { color: c.accent }]}>
              {formatDateObject(parseISODate(date))}
            </Text>
            <IconSymbol
              name={pickerOpen ? "chevron.up" : "chevron.down"}
              size={16}
              color={c.accent}
            />
          </View>
        </Pressable>
        {pickerOpen && (
          <>
            <View style={[styles.datePickerDivider, { backgroundColor: c.border }]} />
            <WheelDatePicker
              value={parseISODate(date)}
              onChange={(nextDate) => setDate(toISODate(nextDate))}
            />
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={({ pressed }) => [
                localStyles.doneBtn,
                { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[localStyles.doneBtnText, { color: c.onAccent }]}>Done</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  doneBtn: {
    margin: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
