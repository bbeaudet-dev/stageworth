import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { showTypeChip, showTypeLabel } from "@/constants/showTypeColors";
import type { Id } from "@/convex/_generated/dataModel";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

function deriveShowScoreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ShowHeroSectionProps {
  show: {
    name: string;
    type?: string | null;
    images?: (string | null)[] | null;
    showScoreRating?: number | null;
    showScoreCount?: number | string | null;
    showScoreSlug?: string | null;
  } | null | undefined;
  placeholderName?: string;
  showId: Id<"shows"> | "";
  screenWidth: number;
  onOpenListSheet: () => void;
  onOpenTripSheet: () => void;
}

export function ShowHeroSection({
  show,
  placeholderName,
  showId,
  screenWidth,
  onOpenListSheet,
  onOpenTripSheet,
}: ShowHeroSectionProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  const playbillSize = Math.floor((screenWidth - 32 - 12) / 3);
  const posterUrl = show?.images?.[0] ?? null;
  const showType = show?.type ?? null;
  const typeColors = showTypeChip(showType ?? "other", isDark ? "dark" : "light");

  return (
    <>
      {/* Hero row: playbill + name/type/ShowScore */}
      <View style={styles.heroRow}>
        <View style={[styles.playbillWrap, { width: playbillSize, height: playbillSize * 1.4 }]}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={[styles.playbillImg, { backgroundColor: playbillMatBackground(theme) }]}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
              <Text
                style={[styles.playbillFallbackText, { color: c.mutedText }]}
                numberOfLines={5}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {show?.name ?? ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroInfo}>
          <Text style={[styles.showName, { color: c.text }]} numberOfLines={3}>
            {show?.name ?? (placeholderName ?? "Loading…")}
          </Text>
          {showType !== null && (
            <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
                {showTypeLabel(showType)}
              </Text>
            </View>
          )}
          {show?.showScoreRating != null && (
            <Pressable
              onPress={() => {
                const slug = show.showScoreSlug ?? deriveShowScoreSlug(show.name);
                Linking.openURL(`https://www.show-score.com/broadway-shows/${slug}`);
              }}
              style={({ pressed }) => [
                styles.showScoreBadge,
                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F5F5F5", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.showScoreValue, { color: c.text }]}>
                {show.showScoreRating}%
              </Text>
              <Text style={[styles.showScoreLabel, { color: c.mutedText }]}>
                ShowScore{show.showScoreCount ? ` · ${show.showScoreCount} reviews` : ""}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: c.accent }]}
        onPress={() => {
          if (!showId) {
            router.push("/add-visit");
            return;
          }
          router.push({
            pathname: "/add-visit",
            params: {
              showId: String(showId),
              showName: show?.name ?? placeholderName ?? "",
            },
          });
        }}
      >
        <Text style={[styles.primaryBtnText, { color: c.onAccent }]}>Add a Visit</Text>
      </Pressable>

      <View style={styles.secondaryBtnRow}>
        <Pressable
          style={[styles.secondaryBtn, { backgroundColor: c.accent + "18", borderColor: c.accent + "40" }]}
          onPress={onOpenListSheet}
        >
          <Text style={[styles.secondaryBtnText, { color: c.accent }]}>+ Add to List</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { backgroundColor: c.accent + "18", borderColor: c.accent + "40" }]}
          onPress={onOpenTripSheet}
        >
          <Text style={[styles.secondaryBtnText, { color: c.accent }]}>+ Add to Trip</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  playbillWrap: { borderRadius: 8, overflow: "hidden" },
  playbillImg: { width: "100%", height: "100%" },
  playbillFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 6 },
  playbillFallbackText: { fontSize: 11, textAlign: "center", fontWeight: "600" },
  heroInfo: { flex: 1, gap: 8, paddingTop: 4 },
  showName: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  typeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  showScoreBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  showScoreValue: { fontSize: 15, fontWeight: "800" },
  showScoreLabel: { fontSize: 12, fontWeight: "500" },
  primaryBtn: { borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  primaryBtnText: { fontWeight: "700", fontSize: 15 },
  secondaryBtnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },
});
