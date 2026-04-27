import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { styles } from "@/features/add-visit/styles";
import { MAX_VISIT_PHOTOS } from "@/features/add-visit/utils/uploadVisitPhotos";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function PhotoPickerSection({
  photoUris,
  setPhotoUris,
}: {
  photoUris: string[];
  setPhotoUris: (uris: string[]) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const [isPicking, setIsPicking] = useState(false);
  const [loadingUris, setLoadingUris] = useState<Record<string, boolean>>({});

  const pickPhotos = async () => {
    const remaining = MAX_VISIT_PHOTOS - photoUris.length;
    if (isPicking) return;
    if (remaining <= 0) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to attach pictures to your visit.",
      );
      return;
    }

    let pickerResult: ImagePicker.ImagePickerResult;
    try {
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        base64: false,
        exif: false,
        quality: 0.85,
      });
    } catch (error) {
      const detail = error instanceof Error ? `\n\n${error.message}` : "";
      Alert.alert(
        "Couldn't open photo picker",
        `Something went wrong opening your photo library. Please try again.${detail}`,
      );
      return;
    }

    if (pickerResult.canceled || pickerResult.assets.length === 0) return;

    setIsPicking(true);
    try {
      const selectedUris = pickerResult.assets
        .map((asset) => asset.uri)
        .filter((uri): uri is string => typeof uri === "string" && uri.length > 0);

      if (selectedUris.length === 0) {
        Alert.alert(
          "Photos unavailable",
          "The selected photos couldn't be loaded. If they're stored in iCloud, open Photos, wait for them to download, and try again.",
        );
        return;
      }

      setLoadingUris((current) => {
        const next = { ...current };
        for (const uri of selectedUris) next[uri] = true;
        return next;
      });
      setPhotoUris([...photoUris, ...selectedUris].slice(0, MAX_VISIT_PHOTOS));
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoPickerRow}
      >
        {photoUris.map((uri, index) => {
          const isImageLoading = loadingUris[uri] ?? false;
          return (
            <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
              <Image
                source={{ uri }}
                style={styles.photoThumb}
                contentFit="cover"
                onLoadStart={() =>
                  setLoadingUris((current) => ({ ...current, [uri]: true }))
                }
                onLoadEnd={() =>
                  setLoadingUris((current) => ({ ...current, [uri]: false }))
                }
                onError={() =>
                  setLoadingUris((current) => ({ ...current, [uri]: false }))
                }
              />
              {isImageLoading ? (
                <View
                  style={[
                    styles.photoThumbLoadingOverlay,
                    { backgroundColor: c.surface },
                  ]}
                >
                  <ActivityIndicator size="small" color={c.accent} />
                </View>
              ) : null}
              <Pressable
                onPress={() => setPhotoUris(photoUris.filter((_, i) => i !== index))}
                style={[
                  styles.photoRemoveBadge,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={[styles.photoRemoveText, { color: c.text }]}>x</Text>
              </Pressable>
            </View>
          );
        })}
        {photoUris.length < MAX_VISIT_PHOTOS ? (
          <Pressable
            onPress={pickPhotos}
            disabled={isPicking}
            style={[
              styles.photoAddButton,
              {
                borderColor: c.border,
                backgroundColor: c.surface,
                opacity: isPicking ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isPicking ? "Adding visit photos" : "Add visit photos"}
          >
            {isPicking ? (
              <>
                <ActivityIndicator size="small" color={c.accent} />
                <Text style={[styles.photoAddButtonText, { color: c.accent }]}>
                  Adding
                </Text>
              </>
            ) : (
              <Text style={[styles.photoAddButtonText, { color: c.accent }]}>+ Add</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
