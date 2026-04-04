import { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { WheelDatePicker } from "@/components/WheelDatePicker";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface CreateTripSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (args: {
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
  }) => Promise<void>;
  initialValues?: {
    name?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  };
}

type ActivePicker = "start" | "end" | null;

export function CreateTripSheet({
  visible,
  onClose,
  onCreate,
  initialValues,
}: CreateTripSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const inputBg = Colors[theme].surface;

  const isEditing = Boolean(initialValues);

  const defaultStart = initialValues?.startDate
    ? new Date(initialValues.startDate + "T00:00:00")
    : todayLocal();
  const defaultEnd = initialValues?.endDate
    ? new Date(initialValues.endDate + "T00:00:00")
    : addDays(todayLocal(), 2);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && startDate <= endDate;

  const handleClose = () => {
    const hasChanges = name.trim() !== "" || activePicker !== null;
    if (hasChanges && !isEditing) {
      Alert.alert(
        "Discard Trip?",
        "Your trip info will not be saved.",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setName("");
    setStartDate(todayLocal());
    setEndDate(addDays(todayLocal(), 7));
    setActivePicker(null);
  };

  const handleCreate = async () => {
    if (!canSubmit || isSubmitting) return;
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
      });
      resetForm();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartChange = (_: unknown, date?: Date) => {
    if (!date) return;
    setStartDate(date);
    // Clamp end date if it would become before start.
    if (date > endDate) setEndDate(date);
  };

  const handleEndChange = (_: unknown, date?: Date) => {
    if (!date) return;
    setEndDate(date);
    // Clamp start if needed.
    if (date < startDate) setStartDate(date);
  };

  const togglePicker = (picker: ActivePicker) => {
    Keyboard.dismiss();
    setActivePicker((prev) => (prev === picker ? null : picker));
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.title, { color: primaryTextColor }]}>
              {isEditing ? "Edit Trip" : "New Trip"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.cancelText, { color: accentColor }]}>Cancel</Text>
            </Pressable>
          </View>

          {/* Name input */}
          <View style={styles.body}>
            <TextInput
              style={[styles.nameInput, { backgroundColor: inputBg, borderColor, color: primaryTextColor }]}
              value={name}
              onChangeText={setName}
              placeholder="Name your trip"
              placeholderTextColor={mutedTextColor}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={100}
              onSubmitEditing={Keyboard.dismiss}
            />

            {/* Date rows */}
            <View style={[styles.datesCard, { backgroundColor: surfaceColor, borderColor }]}>
              {/* Start date */}
              <Pressable
                style={[
                  styles.dateRow,
                  activePicker === "start" && { backgroundColor: accentColor + "12" },
                ]}
                onPress={() => togglePicker("start")}
              >
                <Text style={[styles.dateLabel, { color: mutedTextColor }]}>From</Text>
                <Text style={[styles.dateValue, { color: accentColor }]}>
                  {formatDate(startDate)}
                </Text>
              </Pressable>

              {activePicker === "start" && (
                <WheelDatePicker
                  value={startDate}
                  onChange={(d) => handleStartChange(null, d)}
                />
              )}

              <View style={[styles.divider, { backgroundColor: borderColor }]} />

              {/* End date */}
              <Pressable
                style={[
                  styles.dateRow,
                  activePicker === "end" && { backgroundColor: accentColor + "12" },
                ]}
                onPress={() => togglePicker("end")}
              >
                <Text style={[styles.dateLabel, { color: mutedTextColor }]}>To</Text>
                <Text style={[styles.dateValue, { color: accentColor }]}>
                  {formatDate(endDate)}
                </Text>
              </Pressable>

              {activePicker === "end" && (
                <WheelDatePicker
                  value={endDate}
                  onChange={(d) => handleEndChange(null, d)}
                  minimumDate={startDate}
                />
              )}
            </View>

            {startDate > endDate ? (
              <Text style={[styles.validationNote, { color: Colors[theme].danger }]}>
                End date must be on or after start date.
              </Text>
            ) : null}

            {/* Save button */}
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: accentColor },
                (!canSubmit || isSubmitting) && styles.saveButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!canSubmit || isSubmitting}
            >
              <Text style={[styles.saveButtonText, { color: onAccent }]}>
                {isSubmitting
                  ? isEditing ? "Saving…" : "Creating…"
                  : isEditing ? "Save Changes" : "Create Trip"}
              </Text>
            </Pressable>
          </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  body: {
    padding: 16,
    gap: 14,
  },
  nameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "500",
  },
  datesCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  validationNote: {
    fontSize: 13,
    marginTop: -6,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 2,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
