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
          <Text
            style={[styles.playbillFallbackText, { color: c.mutedText }]}
            numberOfLines={5}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {show.name}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
