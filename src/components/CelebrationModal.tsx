/**
 * Celebration overlay shown after logging a first visit to a show.
 * Intentionally uses a plain View (not a Modal) so there is zero
 * interaction with the navigation stack's native presentation layer.
 * It is rendered as a direct child of GestureHandlerRootView in _layout.tsx.
 */
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CelebrationData } from "@/components/CelebrationContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Props {
  data: CelebrationData;
  onClose: () => void;
}

export function CelebrationOverlay({ data, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      {/* Inner Pressable stops taps on the card from propagating to the backdrop */}
      <Pressable
        style={[
          styles.card,
          { backgroundColor: c.background, borderColor: c.border, marginBottom: insets.bottom },
        ]}
        onPress={() => {}}
      >
        <View style={styles.imageWrap}>
          {data.imageUrl ? (
            <Image
              source={{ uri: data.imageUrl }}
              style={styles.playbill}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
              <IconSymbol name="theatermasks.fill" size={48} color={c.mutedText} />
            </View>
          )}
        </View>

        <View style={styles.textBlock}>
          <IconSymbol name="star.circle.fill" size={44} color={c.accent} />
          <Text style={[styles.headline, { color: c.text }]}>New Show Added!</Text>
          {data.showName ? (
            <Text style={[styles.showName, { color: c.mutedText }]} numberOfLines={2}>
              {data.showName}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.closeBtn, { backgroundColor: c.accent }]}
          onPress={onClose}
        >
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  imageWrap: {
    width: 130,
    height: 182,
    borderRadius: 10,
    overflow: "hidden",
  },
  playbill: { width: "100%", height: "100%" },
  playbillFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", gap: 6 },
  headline: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  showName: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  closeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
