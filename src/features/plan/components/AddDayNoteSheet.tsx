/**
 * Bottom sheet for adding a free-text note to a specific trip day.
 * Optionally a time can be associated with the note.
 * Time picker: hour (1–12), minute (00 05 10 … 55), AM / PM.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── wheel helpers ────────────────────────────────────────────────────────────

const ITEM_H = 44;
const VISIBLE = 5;

const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];
const AMPM = ["AM","PM"];

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  textColor: string;
  mutedColor: string;
  highlightBg: string;
  borderColor: string;
}

function WheelColumn({ items, selectedIndex, onChange, width = 60, textColor, mutedColor, highlightBg, borderColor }: WheelColumnProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
      onChange(idx);
    },
    [items.length, onChange]
  );

  const containerH = ITEM_H * VISIBLE;
  const pad = ITEM_H * Math.floor(VISIBLE / 2);

  return (
    <View style={[wheelStyles.col, { height: containerH, width }]}>
      {/* selection highlight */}
      <View
        pointerEvents="none"
        style={[
          wheelStyles.highlight,
          { top: pad, height: ITEM_H, backgroundColor: highlightBg, borderColor },
        ]}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad }}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <View key={item} style={wheelStyles.item}>
              <Text style={[wheelStyles.itemText, { color: isSelected ? textColor : mutedColor }]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── sheet ────────────────────────────────────────────────────────────────────

interface AddDayNoteSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (text: string, time?: string) => Promise<void>;
  dayLabel: string;
}

export function AddDayNoteSheet({ visible, onClose, onAdd, dayLabel }: AddDayNoteSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const inputBg = Colors[theme].surface;

  const [text, setText] = useState("");
  const [addTime, setAddTime] = useState(false);
  const [hourIdx, setHourIdx] = useState(8);   // defaults to 9 AM
  const [minuteIdx, setMinuteIdx] = useState(0);
  const [ampmIdx, setAmpmIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setText("");
    setAddTime(false);
    setHourIdx(8);
    setMinuteIdx(0);
    setAmpmIdx(0);
  };

  const handleClose = () => {
    if (text.trim()) {
      Alert.alert("Discard note?", "Your note will not be saved.", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => { reset(); onClose(); } },
      ]);
    } else {
      reset();
      onClose();
    }
  };

  const buildTime24h = (): string => {
    let h = hourIdx + 1;           // 1–12
    if (ampmIdx === 1 && h !== 12) h += 12;   // PM
    if (ampmIdx === 0 && h === 12) h = 0;      // 12 AM → 00
    const hh = String(h).padStart(2, "0");
    const mm = MINUTES[minuteIdx];
    return `${hh}:${mm}`;
  };

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      const time = addTime ? buildTime24h() : undefined;
      await onAdd(trimmed, time);
      reset();
      onClose();
    } catch {
      Alert.alert("Error", "Could not save note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAdd = text.trim().length > 0;

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={[styles.headerBtn, { color: mutedTextColor }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: primaryTextColor }]}>Add Note</Text>
          <Pressable onPress={handleAdd} disabled={!canAdd || isSubmitting} hitSlop={12}>
            <Text style={[styles.headerBtn, { color: canAdd && !isSubmitting ? accentColor : mutedTextColor, fontWeight: "700" }]}>
              Add
            </Text>
          </Pressable>
        </View>

        {/* Day label */}
        <Text style={[styles.dayLabel, { color: mutedTextColor }]}>{dayLabel}</Text>

        {/* Text input */}
        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}>
          <TextInput
            style={[styles.input, { color: primaryTextColor }]}
            value={text}
            onChangeText={setText}
            placeholder="What's happening? (flights, dinner, hotel...)"
            placeholderTextColor={mutedTextColor}
            multiline
            maxLength={280}
            autoFocus
          />
        </View>

        {/* Add a Time toggle */}
        <Pressable style={styles.timeToggleRow} onPress={() => setAddTime((v) => !v)}>
          <View style={[styles.checkbox, { borderColor: addTime ? accentColor : borderColor, backgroundColor: addTime ? accentColor : "transparent" }]}>
            {addTime ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={[styles.timeToggleLabel, { color: primaryTextColor }]}>Add a Time</Text>
        </Pressable>

        {/* Time picker wheels */}
        {addTime ? (
          <View style={[styles.pickerCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.pickerRow}>
              <WheelColumn
                items={HOURS}
                selectedIndex={hourIdx}
                onChange={setHourIdx}
                width={52}
                textColor={primaryTextColor}
                mutedColor={mutedTextColor}
                highlightBg={accentColor + "14"}
                borderColor={borderColor}
              />
              <Text style={[styles.pickerColon, { color: primaryTextColor }]}>:</Text>
              <WheelColumn
                items={MINUTES}
                selectedIndex={minuteIdx}
                onChange={setMinuteIdx}
                width={52}
                textColor={primaryTextColor}
                mutedColor={mutedTextColor}
                highlightBg={accentColor + "14"}
                borderColor={borderColor}
              />
              <WheelColumn
                items={AMPM}
                selectedIndex={ampmIdx}
                onChange={setAmpmIdx}
                width={52}
                textColor={primaryTextColor}
                mutedColor={mutedTextColor}
                highlightBg={accentColor + "14"}
                borderColor={borderColor}
              />
            </View>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const wheelStyles = StyleSheet.create({
  col: { overflow: "hidden", position: "relative" },
  highlight: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 18, fontWeight: "500" },
});

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerBtn: { fontSize: 15 },
  dayLabel: { fontSize: 12, fontWeight: "600", marginTop: 12, marginHorizontal: 16, textTransform: "uppercase", letterSpacing: 0.6 },
  inputWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
    padding: 12,
  },
  input: { fontSize: 15, lineHeight: 21, minHeight: 64 },
  timeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  timeToggleLabel: { fontSize: 15 },
  pickerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pickerColon: { fontSize: 22, fontWeight: "600", marginHorizontal: 2 },
});
