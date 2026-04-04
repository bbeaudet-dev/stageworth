import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";

export function ShowCard({
  show,
  onPress,
  badge,
}: {
  show: { name: string; type?: string; images: string[] };
  onPress: () => void;
  badge?: { label: string; bg: string; text: string };
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const image = show.images?.[0];

  return (
    <Pressable
      style={[styles.playbillCard, { backgroundColor: c.surfaceElevated }]}
      onPress={onPress}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.playbillImage} contentFit="cover" />
      ) : (
        <ShowPlaceholder name={show.name} type={show.type} />
      )}
      {badge ? (
        <View style={[cardBadge.badgeStrip, { backgroundColor: badge.bg }]}>
          <Text style={[cardBadge.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
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
});
