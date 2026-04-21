import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  closingStripBadge,
  openRunStripBadge,
  type ClosingStripBadge,
} from "@/features/browse/logic/closingStrip";

import type { FindShowPick } from "@/features/find-show/hooks/useFindShow";

interface FindShowPickCardProps {
  pick: FindShowPick;
  variant: "primary" | "alternate";
  onPress: () => void;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Resolve the status badge for a pick using the same helpers the rest of the
 * app uses — closingStripBadge (urgency color fading from brand blue) when we
 * know a closing date, openRunStripBadge when the run is open-ended, nothing
 * otherwise. This keeps urgency color/label consistent with browse rails,
 * production cards, and trip playbills.
 */
function resolvePickBadge(
  pick: FindShowPick,
  isDark: boolean
): ClosingStripBadge | null {
  const today = todayStr();
  const closing = closingStripBadge(pick.closingDate, today, isDark);
  if (closing) return closing;
  if (pick.isOpenRun) return openRunStripBadge(isDark);
  return null;
}

export function FindShowPickCard({ pick, variant, onPress }: FindShowPickCardProps) {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];
  const posterBg = isDark ? "#27272f" : "#efefef";

  const isPrimary = variant === "primary";
  const posterSize = isPrimary ? 96 : 64;
  const badge = resolvePickBadge(pick, isDark);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.surfaceElevated,
          borderColor: isPrimary ? c.accent + "55" : c.border,
          borderWidth: isPrimary ? 1 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.poster,
          {
            width: posterSize,
            height: Math.round(posterSize * 1.5),
            backgroundColor: posterBg,
          },
        ]}
      >
        {pick.posterUrl ? (
          <SmartShowImage
            uri={pick.posterUrl}
            style={StyleSheet.absoluteFill}
            matBackground={posterBg}
          />
        ) : (
          <ShowPlaceholder name={pick.showName} style={StyleSheet.absoluteFill} />
        )}
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.headline, { color: c.text, fontSize: isPrimary ? 18 : 15 }]}
          numberOfLines={2}
        >
          {pick.headline}
        </Text>
        <Text
          style={[styles.showName, { color: c.text, fontSize: isPrimary ? 15 : 13 }]}
          numberOfLines={1}
        >
          {pick.showName}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaType, { color: c.mutedText }]}>{pick.showType}</Text>
          {badge && (
            <View style={[styles.metaChip, { backgroundColor: badge.bg }]}>
              <Text style={[styles.metaChipText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>

        {isPrimary && !!pick.reasoning && (
          <Text style={[styles.reasoning, { color: c.mutedText }]} numberOfLines={4}>
            {pick.reasoning}
          </Text>
        )}
        {!isPrimary && !!pick.reasoning && (
          <Text style={[styles.reasoningAlt, { color: c.mutedText }]} numberOfLines={2}>
            {pick.reasoning}
          </Text>
        )}

        <View style={styles.openRow}>
          <Text style={[styles.openRowText, { color: c.accent }]}>Open show</Text>
          <IconSymbol name="chevron.right" size={14} color={c.accent} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    padding: 12,
  },
  poster: {
    borderRadius: 8,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  headline: { fontWeight: "700" },
  showName: { fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  metaType: { fontSize: 12, textTransform: "capitalize" },
  metaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaChipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  reasoning: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  reasoningAlt: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
  },
  openRowText: { fontSize: 12, fontWeight: "700" },
});
