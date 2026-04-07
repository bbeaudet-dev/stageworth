import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";
import { MAX_VISIT_PHOTOS } from "@/features/add-visit/utils/uploadVisitPhotos";

export function PhotoPickerSection({
  photoUris,
  setPhotoUris,
}: {
  photoUris: string[];
  setPhotoUris: (uris: string[]) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const pickPhotos = async () => {
    const remaining = MAX_VISIT_PHOTOS - photoUris.length;
    if (remaining <= 0) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach pictures to your visit.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const newUris = result.assets.map((a) => a.uri);
    setPhotoUris([...photoUris, ...newUris].slice(0, MAX_VISIT_PHOTOS));
  };

  const removeAt = (index: number) => {
    setPhotoUris(photoUris.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Photos (optional)</Text>
      <Text style={[styles.helperText, { color: c.mutedText }]}>
        Up to {MAX_VISIT_PHOTOS} photos. Shown on your community post.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoPickerRow}
      >
        {photoUris.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
            <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
            <Pressable
              onPress={() => removeAt(index)}
              style={[styles.photoRemoveBadge, { backgroundColor: c.surface, borderColor: c.border }]}
              hitSlop={8}
              accessibilityLabel="Remove photo"
            >
              <Text style={[styles.photoRemoveText, { color: c.text }]}>×</Text>
            </Pressable>
          </View>
        ))}
        {photoUris.length < MAX_VISIT_PHOTOS ? (
          <Pressable
            onPress={pickPhotos}
            style={[
              styles.photoAddButton,
              {
                borderColor: c.border,
                backgroundColor: c.surface,
              },
            ]}
          >
            <Text style={[styles.photoAddButtonText, { color: c.accent }]}>+ Add</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
