import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { FullStatusBadge } from "@/features/browse/components/ProductionCard";

export function ListStatusIcon({
  status,
  onPress,
}: {
  status: "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none";
  onPress: () => void;
}) {
  const icon = (() => {
    switch (status) {
      case "want_to_see":    return "hand.thumbsup.fill";
      case "look_into":      return "questionmark.circle.fill";
      case "not_interested": return "hand.thumbsdown.fill";
      case "uncategorized":  return "minus.circle";
      default:               return "bookmark";
    }
  })();
  return (
    <Pressable
      style={styles.listIconBtn}
      onPress={(e) => { e.stopPropagation?.(); onPress(); }}
      hitSlop={6}
    >
      <IconSymbol name={icon as any} size={14} color="#fff" />
    </Pressable>
  );
}

interface SearchShowCardProps {
  show: { name: string; images?: string[]; image?: string | null; badge?: FullStatusBadge | null };
  cardWidth: number;
  surfaceColor: string;
  posterBg: string;
  mutedColor: string;
  listStatus?: "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none";
  onPress: () => void;
  onListIconPress?: () => void;
}

export function SearchShowCard({
  show,
  cardWidth,
  surfaceColor,
  posterBg,
  mutedColor,
  listStatus,
  onPress,
  onListIconPress,
}: SearchShowCardProps) {
  const image = show.image ?? show.images?.[0] ?? null;
  return (
    <Pressable
      style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
      onPress={onPress}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={[styles.playbillImg, { backgroundColor: posterBg }]}
          contentFit="contain"
        />
      ) : (
        <ShowPlaceholder name={show.name} />
      )}
      {show.badge ? (
        <View style={show.badge.secondary ? styles.railBadgeOverlay : undefined}>
          {show.badge.secondary ? (
            <View style={[styles.railBadgeStrip, styles.railBadgeSecondary, { backgroundColor: show.badge.secondary.bg }]}>
              <Text style={[styles.railBadgeText, { color: show.badge.secondary.text }]}>
                {show.badge.secondary.label}
              </Text>
            </View>
          ) : null}
          <View style={[styles.railBadgeStrip, { backgroundColor: show.badge.primary.bg }]}>
            <Text style={[styles.railBadgeText, { color: show.badge.primary.text }]}>
              {show.badge.primary.label}
            </Text>
          </View>
        </View>
      ) : null}
      {listStatus != null && onListIconPress ? (
        <ListStatusIcon status={listStatus} onPress={onListIconPress} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playbillCard: { borderRadius: 10, overflow: "hidden" },
  playbillImg: { width: "100%", aspectRatio: 2 / 3 },
  railBadgeOverlay: { position: "absolute", bottom: 0, left: 0, right: 0 },
  railBadgeStrip: { width: "100%", paddingVertical: 4, alignItems: "center" },
  railBadgeSecondary: { opacity: 0.85, paddingVertical: 3 },
  railBadgeText: { fontSize: 9, fontWeight: "700" },
  listIconBtn: {
    position: "absolute", top: 5, right: 5,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 4,
  },
});
