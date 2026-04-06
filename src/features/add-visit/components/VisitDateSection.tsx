import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { WheelDatePicker } from "@/components/WheelDatePicker";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { parseISODate, toISODate, formatDateObject } from "@/utils/dates";
import { styles } from "@/features/add-visit/styles";

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
  const parsedDate = parseISODate(date);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Visit Date</Text>
      <View style={[styles.datePickerCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
        <Pressable
          style={[
            styles.datePickerRow,
            pickerOpen && { backgroundColor: c.accent + "12" },
          ]}
          onPress={() => setPickerOpen((prev) => !prev)}
        >
          <Text style={[styles.datePickerLabel, { color: c.mutedText }]}>Date</Text>
          <Text style={[styles.datePickerValue, { color: c.accent }]}>
            {formatDateObject(parsedDate)}
          </Text>
        </Pressable>
        {pickerOpen && (
          <>
            <View style={[styles.datePickerDivider, { backgroundColor: c.border }]} />
            <WheelDatePicker
              value={parsedDate}
              onChange={(nextDate) => setDate(toISODate(nextDate))}
            />
          </>
        )}
      </View>
    </View>
  );
}
