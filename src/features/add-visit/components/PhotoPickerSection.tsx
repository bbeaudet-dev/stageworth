import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";
import { MAX_VISIT_PHOTOS } from "@/features/add-visit/utils/uploadVisitPhotos";

async function toJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

async function resolveAssetUri(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (asset.assetId) {
    const info = await MediaLibrary.getAssetInfoAsync(asset.assetId, {
      shouldDownloadFromNetwork: true,
    });
    if (info.localUri) return info.localUri;
  }
  return asset.uri;
}

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

    let pickerResult: ImagePicker.ImagePickerResult;
    try {
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        // Don't request base64 or exif — keep payloads small.
        base64: false,
        exif: false,
      });
    } catch (error) {
      const detail = error instanceof Error ? `\n\n${error.message}` : "";
      Alert.alert(
        "Couldn't open photo picker",
        `Something went wrong opening your photo library. Please try again.${detail}`,
      );
      return;
    }

    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    // Convert every asset to a local JPEG. This sidesteps HEIC/iCloud
    // representation issues that occur on iOS with PHPickerViewController.
    const convertedUris: string[] = [];
    const failedCount = { n: 0 };
    await Promise.all(
      pickerResult.assets.map(async (asset) => {
        try {
          const sourceUri = await resolveAssetUri(asset);
          const jpeg = await toJpeg(sourceUri);
          convertedUris.push(jpeg);
        } catch {
          failedCount.n += 1;
        }
      }),
    );

    if (convertedUris.length === 0) {
      Alert.alert(
        "Photos unavailable",
        "The selected photo(s) couldn't be loaded. If they're stored in iCloud and not downloaded to this device, open the Photos app, tap the photo, and wait for it to download — then try again.",
      );
      return;
    }

    if (failedCount.n > 0) {
      Alert.alert(
        `${failedCount.n} photo${failedCount.n > 1 ? "s" : ""} skipped`,
        "Some photos couldn't be loaded (they may not be downloaded from iCloud yet) and were skipped.",
      );
    }

    setPhotoUris([...photoUris, ...convertedUris].slice(0, MAX_VISIT_PHOTOS));
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
