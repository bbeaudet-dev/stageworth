import {
  Canvas,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_BLUE, BRAND_PURPLE, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDateRange } from "@/utils/dates";
import { getTripCountdown } from "@/utils/tripCountdown";

const CARD_RADIUS = 12;
const AVATAR_SIZE = 20;
const AVATAR_OVERLAP = 6;

interface TripCardProps {
  name: string;
  startDate: string;
  endDate: string;
  showCount: number;
  isOwner: boolean;
  memberCount: number;
  memberAvatars: string[];
  onPress: () => void;
  onLongPress?: () => void;
}

export function TripCard({
  name,
  startDate,
  endDate,
  showCount,
  isOwner,
  memberCount,
  memberAvatars,
  onPress,
  onLongPress,
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
  const isShared = !isOwner || memberCount > 0;

  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  const badgeBg = isActive
    ? "rgba(255,255,255,0.22)"
    : phase === "upcoming"
    ? theme === "dark" ? "rgba(83,109,254,0.22)" : "#EEF2FF"
    : theme === "dark" ? "rgba(156,163,175,0.14)" : "#F3F4F6";

  const badgeTextColor = isActive
    ? "#ffffff"
    : phase === "upcoming"
    ? theme === "dark" ? "#818CF8" : "#536DFE"
    : theme === "dark" ? "#9CA3AF" : "#6B7280";

  const sharedIndicatorColor = isActive ? "rgba(255,255,255,0.7)" : mutedTextColor;
  const avatarBorderColor = isActive ? "rgba(255,255,255,0.5)" : surfaceColor;
  const avatarBg = isActive ? "rgba(255,255,255,0.18)" : (theme === "dark" ? "#2a2a33" : "#e5e7eb");

  return (
    <Pressable
      style={[
        styles.card,
        isActive
          ? { borderColor: "transparent" }
          : { backgroundColor: surfaceColor, borderColor },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      onLayout={(e) => {
        if (!isActive) return;
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setCardSize({ width, height });
      }}
    >
      {isActive && cardSize && (
        <Canvas style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS }]} pointerEvents="none">
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
          {showCount > 0 && (
            <Text
              style={[
                styles.showCount,
                { color: isActive ? "rgba(255,255,255,0.75)" : mutedTextColor },
              ]}
            >
              {`${showCount} show${showCount === 1 ? "" : "s"}`}
            </Text>
          )}

          {isShared && (
            <View style={styles.membersRow}>
              {memberAvatars.length > 0 ? (
                <View style={[styles.avatarStack, { width: AVATAR_SIZE + (memberAvatars.length - 1) * (AVATAR_SIZE - AVATAR_OVERLAP) }]}>
                  {memberAvatars.map((uri, i) => (
                    <View
                      key={uri + i}
                      style={[
                        styles.avatarWrap,
                        { left: i * (AVATAR_SIZE - AVATAR_OVERLAP), borderColor: avatarBorderColor },
                      ]}
                    >
                      <Image
                        source={{ uri }}
                        style={[styles.avatar, { backgroundColor: avatarBg }]}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.membersLabel, { color: sharedIndicatorColor }]}>
                {memberAvatars.length === 0
                  ? "Shared"
                  : memberCount === 1
                  ? "1 member"
                  : `${memberCount} members`}
              </Text>
            </View>
          )}
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
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  avatarStack: {
    height: AVATAR_SIZE,
    position: "relative",
  },
  avatarWrap: {
    position: "absolute",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  membersLabel: {
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
