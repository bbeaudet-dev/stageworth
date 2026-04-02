import { Image } from "expo-image";
import { Pressable } from "react-native";

import { styles } from "@/features/browse/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";

export function ShowCard({
  show,
  onPress,
}: {
  show: { name: string; type?: string; images: string[] };
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
        <ShowPlaceholder name={show.name} type={show.type} />
      )}
    </Pressable>
  );
}
