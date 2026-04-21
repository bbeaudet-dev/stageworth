import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";
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

function resolvePickBadge(
  pick: FindShowPick,
  isDark: boolean
): ClosingStripBadge | null {
  const closing = closingStripBadge(pick.closingDate, todayStr(), isDark);
  if (closing) return closing;
  if (pick.isOpenRun) return openRunStripBadge(isDark);
  return null;
}

const FIT_COLLAPSED_LINES_PRIMARY = 3;
const FIT_COLLAPSED_LINES_ALTERNATE = 2;

export function FindShowPickCard({ pick, variant, onPress }: FindShowPickCardProps) {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];
  const posterBg = isDark ? "#27272f" : "#efefef";

  const isPrimary = variant === "primary";
  const posterSize = isPrimary ? 96 : 64;
  const badge = resolvePickBadge(pick, isDark);

  const [expanded, setExpanded] = useState(false);

  const fit = pick.fit?.trim() ?? "";
  const secondary = isPrimary ? pick.edge?.trim() : pick.tradeoff?.trim();
  const secondaryLabel = isPrimary ? "Why this one" : "Tradeoff";
  const hasExpandableContent = !!fit || !!secondary;

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

        {!!fit && (
          <Text
            style={[
              isPrimary ? styles.fit : styles.fitAlt,
              { color: c.mutedText },
            ]}
            numberOfLines={
              expanded
                ? undefined
                : isPrimary
                  ? FIT_COLLAPSED_LINES_PRIMARY
                  : FIT_COLLAPSED_LINES_ALTERNATE
            }
          >
            {fit}
          </Text>
        )}

        {!!secondary && expanded && (
          <View style={styles.secondaryBlock}>
            <Text style={[styles.secondaryLabel, { color: c.accent }]}>
              {secondaryLabel.toUpperCase()}
            </Text>
            <Text style={[styles.secondaryText, { color: c.text }]}>
              {secondary}
            </Text>
          </View>
        )}

        {hasExpandableContent && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setExpanded((v) => !v);
            }}
            hitSlop={8}
            style={styles.toggleRow}
          >
            <Text style={[styles.toggleText, { color: c.accent }]}>
              {expanded ? "Show less" : "Read more"}
            </Text>
          </Pressable>
        )}
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
  fit: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  fitAlt: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  secondaryBlock: { marginTop: 6, gap: 2 },
  secondaryLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  secondaryText: { fontSize: 13, lineHeight: 18 },
  toggleRow: { marginTop: 6, alignSelf: "flex-start" },
  toggleText: { fontSize: 12, fontWeight: "700" },
});
