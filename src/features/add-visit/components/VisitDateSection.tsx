import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { WheelDatePicker } from "@/components/WheelDatePicker";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

function parseISODate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date();
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
            {formatDate(parsedDate)}
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
