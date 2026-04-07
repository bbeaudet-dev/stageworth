import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { playbillMatBackground, styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";
import { IconSymbol } from "@/components/ui/icon-symbol";

type ListStatus = "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none";

function listStatusIconName(status: ListStatus): string {
  switch (status) {
    case "want_to_see":    return "hand.thumbsup";
    case "look_into":      return "questionmark.circle";
    case "not_interested": return "hand.thumbsdown";
    case "uncategorized":  return "minus.circle";
    default:               return "bookmark";
  }
}

export function ShowCard({
  show,
  onPress,
  badge,
  listStatus,
  onListIconPress,
  containerStyle,
}: {
  show: { name: string; type?: string; images: string[] };
  onPress: () => void;
  badge?: { label: string; bg: string; text: string };
  listStatus?: ListStatus;
  onListIconPress?: () => void;
  /** Merged after base card styles (e.g. fixed width in a grid). */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const image = show.images?.[0];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const iconName = listStatus != null ? listStatusIconName(listStatus) : null;

  return (
    <Pressable
      style={[styles.playbillCard, { backgroundColor: c.surfaceElevated }, containerStyle]}
      onPress={onPress}
    >
      {image && !imageFailed ? (
        <SmartShowImage
          key={image}
          uri={image}
          style={styles.playbillImage}
          matBackground={playbillMatBackground(theme)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <ShowPlaceholder name={show.name} type={show.type} />
      )}
      {badge ? (
        <View style={[cardBadge.badgeStrip, { backgroundColor: badge.bg }]}>
          <Text style={[cardBadge.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      ) : null}
      {iconName && onListIconPress ? (
        <Pressable
          style={cardBadge.listIconBtn}
          onPress={(e) => { e.stopPropagation?.(); onListIconPress(); }}
          hitSlop={6}
        >
          <IconSymbol name={iconName as any} size={14} color="#fff" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const cardBadge = StyleSheet.create({
  badgeStrip: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
  listIconBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    alignItems: "center",
    justifyContent: "center",
    // Drop shadow keeps the outline icon readable against any poster colour
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
});
