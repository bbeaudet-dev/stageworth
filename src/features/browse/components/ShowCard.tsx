import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { playbillMatBackground, styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";

export function ShowCard({
  show,
  onPress,
  badge,
  containerStyle,
}: {
  show: { name: string; type?: string; images: string[] };
  onPress: () => void;
  badge?: { label: string; bg: string; text: string };
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
