import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getTripCountdown } from "@/utils/tripCountdown";

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const startMonth = monthNames[start.getUTCMonth()];
  const startDay = start.getUTCDate();
  const startYear = start.getUTCFullYear();

  const endMonth = monthNames[end.getUTCMonth()];
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }
  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

interface TripCardProps {
  name: string;
  startDate: string;
  endDate: string;
  showCount: number;
  isOwner: boolean;
  onPress: () => void;
}

export function TripCard({
  name,
  startDate,
  endDate,
  showCount,
  isOwner,
  onPress,
}: TripCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const dateRange = formatDateRange(startDate, endDate);
  const { text: countdownText, phase } = getTripCountdown(startDate, endDate);

  // Phase-based pastel badge colors, dark-mode aware
  const badgeBg =
    phase === "active"
      ? theme === "dark" ? "rgba(34,197,94,0.18)" : "#F0FDF4"
      : phase === "upcoming"
      ? theme === "dark" ? "rgba(59,130,246,0.18)" : "#EFF6FF"
      : theme === "dark" ? "rgba(156,163,175,0.18)" : "#F3F4F6";
  const badgeTextColor =
    phase === "active"
      ? theme === "dark" ? "#86EFAC" : "#15803D"
      : phase === "upcoming"
      ? theme === "dark" ? "#93C5FD" : "#1D4ED8"
      : theme === "dark" ? "#9CA3AF" : "#6B7280";

  return (
    <Pressable
      style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
      onPress={onPress}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.name, { color: phase === "past" ? mutedTextColor : primaryTextColor }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.dateRange, { color: mutedTextColor }]}>
            {dateRange}
          </Text>
          <Text style={[styles.showCount, { color: mutedTextColor }]}>
            {showCount === 0 ? "No shows added" : `${showCount} show${showCount === 1 ? "" : "s"}`}
            {!isOwner ? " · Shared" : ""}
          </Text>
        </View>

        {countdownText ? (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>
              {countdownText}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.chevron, { color: mutedTextColor }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  dateRange: {
    fontSize: 13,
    fontWeight: "500",
  },
  showCount: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chevron: {
    fontSize: 20,
    fontWeight: "300",
  },
});
