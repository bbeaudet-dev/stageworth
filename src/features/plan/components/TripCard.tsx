import {
  Canvas,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_BLUE, BRAND_PURPLE, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDateRange } from "@/utils/dates";
import { getTripCountdown } from "@/utils/tripCountdown";

const CARD_RADIUS = 12;

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

  const dateRange = formatDateRange(startDate, endDate);
  const { text: countdownText, phase } = getTripCountdown(startDate, endDate);

  const isActive = phase === "active";

  // Measure the card dimensions so the Skia gradient canvas fills it exactly
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  // Badge colours — frosted white on active gradient, standard pastels otherwise
  const badgeBg = isActive
    ? "rgba(255,255,255,0.22)"
    : phase === "upcoming"
    ? theme === "dark" ? "rgba(59,130,246,0.18)" : "#EFF6FF"
    : theme === "dark" ? "rgba(156,163,175,0.18)" : "#F3F4F6";

  const badgeTextColor = isActive
    ? "#ffffff"
    : phase === "upcoming"
    ? theme === "dark" ? "#93C5FD" : "#1D4ED8"
    : theme === "dark" ? "#9CA3AF" : "#6B7280";

  return (
    <Pressable
      style={[
        styles.card,
        isActive
          ? { borderColor: "transparent" }
          : { backgroundColor: surfaceColor, borderColor },
      ]}
      onPress={onPress}
      onLayout={(e) => {
        if (!isActive) return;
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setCardSize({ width, height });
      }}
    >
      {/* Gradient background for active cards, painted via Skia (no new native modules) */}
      {isActive && cardSize && (
        <Canvas style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS }]}>
          <RoundedRect
            x={0}
            y={0}
            width={cardSize.width}
            height={cardSize.height}
            r={CARD_RADIUS}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(cardSize.width, cardSize.height)}
              colors={[BRAND_BLUE, BRAND_PURPLE]}
            />
          </RoundedRect>
        </Canvas>
      )}

      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text
            style={[
              styles.name,
              {
                color: isActive
                  ? "#ffffff"
                  : phase === "past"
                  ? mutedTextColor
                  : primaryTextColor,
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.dateRange,
              { color: isActive ? "rgba(255,255,255,0.85)" : mutedTextColor },
            ]}
          >
            {dateRange}
          </Text>
          <Text
            style={[
              styles.showCount,
              { color: isActive ? "rgba(255,255,255,0.75)" : mutedTextColor },
            ]}
          >
            {showCount === 0
              ? "No shows added"
              : `${showCount} show${showCount === 1 ? "" : "s"}`}
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

        <Text
          style={[
            styles.chevron,
            { color: isActive ? "rgba(255,255,255,0.7)" : mutedTextColor },
          ]}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CARD_RADIUS,
    padding: 14,
    overflow: "hidden",
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
