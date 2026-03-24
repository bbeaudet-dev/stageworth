import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function ShowCard({
  show,
  onPress,
}: {
  show: { name: string; images: string[] };
  onPress: () => void;
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
        <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
          <Text style={[styles.playbillFallbackText, { color: c.mutedText }]} numberOfLines={4}>
            {show.name}
          </Text>
        </View>
      )}
      <View style={styles.playbillInfo}>
        <Text style={[styles.playbillShowName, { color: c.text }]} numberOfLines={2}>
          {show.name}
        </Text>
      </View>
    </Pressable>
  );
}
