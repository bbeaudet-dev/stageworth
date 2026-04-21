import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { Colors } from "@/constants/theme";
import { showTypeChip, showTypeLabel } from "@/constants/showTypeColors";
import type { Id } from "@/convex/_generated/dataModel";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

/** Target preview length for the collapsed description state. */
const DESCRIPTION_PREVIEW_CHARS = 200;

/**
 * Truncate a description for preview. Tries to break on a sentence boundary
 * within the last ~60 chars of the limit so we don't chop mid-word; otherwise
 * falls back to the nearest space, then a hard slice.
 */
function truncateForPreview(full: string, limit: number): string {
  if (full.length <= limit) return full;
  const windowStart = Math.max(0, limit - 60);
  const slice = full.slice(0, limit);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". ", limit),
    slice.lastIndexOf("! ", limit),
    slice.lastIndexOf("? ", limit)
  );
  if (sentenceEnd >= windowStart) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(" ", limit);
  if (lastSpace >= windowStart) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

type ListMembership = {
  _id: string;
  name: string;
  systemKey?: string | null;
  containsShow?: boolean;
};

// Uncategorized is auto-populated for everyone, so it's excluded from the count.
function countNonUncategorizedMemberships(
  lists: ListMembership[] | undefined,
): number {
  if (!lists) return 0;
  return lists.filter(
    (l) => l.containsShow && l.systemKey !== "uncategorized",
  ).length;
}

interface ShowHeroSectionProps {
  show: {
    name: string;
    type?: string | null;
    images?: (string | null)[] | null;
    description?: string | null;
  } | null | undefined;
  placeholderName?: string;
  showId: Id<"shows"> | "";
  screenWidth: number;
  onOpenListSheet: () => void;
  onOpenTripSheet: () => void;
  visitCount?: number;
  listMemberships?: ListMembership[];
  tripsContainingShowCount?: number;
}

export function ShowHeroSection({
  show,
  placeholderName,
  showId,
  screenWidth,
  onOpenListSheet,
  onOpenTripSheet,
  visitCount = 0,
  listMemberships,
  tripsContainingShowCount = 0,
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

  const description = show?.description?.trim() || null;
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = !!description && description.length > DESCRIPTION_PREVIEW_CHARS;
  const preview = needsTruncate
    ? truncateForPreview(description!, DESCRIPTION_PREVIEW_CHARS)
    : description;

  return (
    <>
      {/* Hero row: playbill + name / type / description */}
      <View style={styles.heroRow}>
        <View style={[styles.playbillWrap, { width: playbillSize, height: playbillSize * 1.4 }]}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={[styles.playbillImg, { backgroundColor: playbillMatBackground(theme) }]}
              contentFit="contain"
            />
          ) : (
            <ShowPlaceholder
              name={show?.name ?? (placeholderName ?? "")}
              style={{ width: "100%", height: "100%", aspectRatio: undefined }}
            />
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
          {description && preview && (
            <View style={styles.descriptionWrap}>
              <Text style={[styles.descriptionText, { color: c.text }]}>
                {expanded || !needsTruncate ? description : `${preview}\u2026`}
              </Text>
              {needsTruncate && (
                <Pressable
                  onPress={() => setExpanded((v) => !v)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.readMoreBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.readMoreText, { color: c.accent }]}>
                    {expanded ? "Read less" : "Read more"}
                  </Text>
                </Pressable>
              )}
            </View>
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
        <Text style={[styles.primaryBtnText, { color: c.onAccent }]}>
          {visitCount > 0 ? `Add Visit (Existing: ${visitCount})` : "Add a Visit"}
        </Text>
      </Pressable>

      <View style={styles.secondaryBtnRow}>
        {(() => {
          const listCount = countNonUncategorizedMemberships(listMemberships);
          const inList = listCount > 0;
          return (
            <Pressable
              style={[
                styles.secondaryBtn,
                inList
                  ? { backgroundColor: c.accent, borderColor: c.accent }
                  : { backgroundColor: c.accent + "18", borderColor: c.accent + "40" },
              ]}
              onPress={onOpenListSheet}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: inList ? c.onAccent : c.accent },
                ]}
              >
                {inList
                  ? `In ${listCount} ${listCount === 1 ? "list" : "lists"}`
                  : "+ Add to List"}
              </Text>
            </Pressable>
          );
        })()}
        {(() => {
          const inTrip = tripsContainingShowCount > 0;
          return (
            <Pressable
              style={[
                styles.secondaryBtn,
                inTrip
                  ? { backgroundColor: c.accent, borderColor: c.accent }
                  : { backgroundColor: c.accent + "18", borderColor: c.accent + "40" },
              ]}
              onPress={onOpenTripSheet}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: inTrip ? c.onAccent : c.accent },
                ]}
              >
                {inTrip
                  ? `In ${tripsContainingShowCount} ${tripsContainingShowCount === 1 ? "trip" : "trips"}`
                  : "+ Add to Trip"}
              </Text>
            </Pressable>
          );
        })()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  playbillWrap: { borderRadius: 8, overflow: "hidden" },
  playbillImg: { width: "100%", height: "100%" },
  heroInfo: { flex: 1, gap: 8, paddingTop: 4 },
  showName: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  typeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  primaryBtn: { borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  primaryBtnText: { fontWeight: "700", fontSize: 15 },
  secondaryBtnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },
  descriptionWrap: { gap: 4 },
  descriptionText: { fontSize: 14, lineHeight: 20 },
  readMoreBtn: { alignSelf: "flex-start", paddingVertical: 2 },
  readMoreText: { fontSize: 13, fontWeight: "600" },
});
