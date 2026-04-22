/**
 * Pure React Native drum-roll date picker (month / day / year).
 * No native module required — works in Expo Go.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const ITEM_H = 44;
const VISIBLE = 5; // total visible rows; selected is the middle one

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  textColor: string;
  mutedColor: string;
  highlightBg: string;
}

function WheelColumn({ items, selectedIndex, onChange, textColor, mutedColor, highlightBg }: WheelColumnProps) {
  const ref = useRef<ScrollView>(null);

  // Scroll to selected on mount / when selected changes externally.
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

  const containerHeight = ITEM_H * VISIBLE;
  const padding = ITEM_H * Math.floor(VISIBLE / 2);

  return (
    <View style={[styles.columnContainer, { height: containerHeight }]}>
      {/* Selection highlight bar */}
      <View
        style={[
          styles.selectionHighlight,
          { top: padding, backgroundColor: highlightBg },
        ]}
        pointerEvents="none"
      />
      {/* Top / bottom fade masks */}
      <View style={[styles.topFade, { height: padding }]} pointerEvents="none" />
      <View style={[styles.bottomFade, { height: padding }]} pointerEvents="none" />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: padding }}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        {items.map((label, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.2;
          const fontSize = dist === 0 ? 17 : 15;
          return (
            <View key={i} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  {
                    color: dist === 0 ? textColor : mutedColor,
                    opacity,
                    fontSize,
                    fontWeight: dist === 0 ? "600" : "400",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface WheelDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  /** Years shown before current year (default 10). */
  yearsBack?: number;
  /** Number of years shown after the current year. */
  yearsForward?: number;
}

export function WheelDatePicker({
  value,
  onChange,
  minimumDate,
  yearsBack = 10,
  yearsForward = 5,
}: WheelDatePickerProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const textColor = Colors[theme].text;
  const mutedColor = Colors[theme].mutedText;
  const highlightBg = theme === "dark" ? "#2a2a2f" : "#f0f0f5";
  const borderColor = Colors[theme].border;

  const month = value.getMonth();    // 0-11
  const day = value.getDate();       // 1-N
  const year = value.getFullYear();

  const thisYear = new Date().getFullYear();
  const totalYears = yearsBack + yearsForward + 1;
  // Earliest year first → newest year last. This matches the "scroll down for
  // more recent" affordance of the other wheels and lets `indexOf` pick the
  // selected year directly.
  const years = Array.from({ length: totalYears }, (_, i) =>
    String(thisYear - yearsBack + i),
  );
  const yearIndex = years.indexOf(String(year));

  const numDays = daysInMonth(month, year);
  const days = Array.from({ length: numDays }, (_, i) => String(i + 1));
  const dayIndex = Math.min(day - 1, numDays - 1);

  const handleMonthChange = (idx: number) => {
    const newDays = daysInMonth(idx, year);
    const newDay = Math.min(day, newDays);
    const next = new Date(year, idx, newDay);
    if (minimumDate && next < minimumDate) return;
    onChange(next);
  };

  const handleDayChange = (idx: number) => {
    const next = new Date(year, month, idx + 1);
    if (minimumDate && next < minimumDate) return;
    onChange(next);
  };

  const handleYearChange = (idx: number) => {
    const y = parseInt(years[idx], 10);
    const newDays = daysInMonth(month, y);
    const newDay = Math.min(day, newDays);
    const next = new Date(y, month, newDay);
    if (minimumDate && next < minimumDate) return;
    onChange(next);
  };

  return (
    <View style={[styles.picker, { borderColor }]}>
      <WheelColumn
        items={MONTHS}
        selectedIndex={month}
        onChange={handleMonthChange}
        textColor={textColor}
        mutedColor={mutedColor}
        highlightBg={highlightBg}
      />
      <View style={[styles.separator, { backgroundColor: borderColor }]} />
      <WheelColumn
        items={days}
        selectedIndex={dayIndex}
        onChange={handleDayChange}
        textColor={textColor}
        mutedColor={mutedColor}
        highlightBg={highlightBg}
      />
      <View style={[styles.separator, { backgroundColor: borderColor }]} />
      <WheelColumn
        items={years}
        selectedIndex={Math.max(0, yearIndex)}
        onChange={handleYearChange}
        textColor={textColor}
        mutedColor={mutedColor}
        highlightBg={highlightBg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  columnContainer: {
    flex: 1,
    overflow: "hidden",
  },
  item: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  itemText: {
    textAlign: "center",
  },
  selectionHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_H,
    zIndex: 0,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  separator: {
    width: StyleSheet.hairlineWidth,
  },
});
