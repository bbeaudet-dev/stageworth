import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import {
  closingStripBadge,
  openRunStripBadge,
  type ClosingStripBadge,
} from "@/features/browse/logic/closingStrip";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type CompareCandidate = {
  showId: Id<"shows">;
  name: string;
  type: string;
  posterUrl: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
};

interface CompareShowPickerProps {
  candidates: CompareCandidate[];
  selectedIds: Set<string>;
  onToggle: (showId: Id<"shows">) => void;
  maxSelectable: number;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function resolveBadge(
  candidate: CompareCandidate,
  isDark: boolean
): ClosingStripBadge | null {
  const closing = closingStripBadge(candidate.closingDate, todayStr(), isDark);
  if (closing) return closing;
  if (candidate.isOpenRun) return openRunStripBadge(isDark);
  return null;
}

export function CompareShowPicker({
  candidates,
  selectedIds,
  onToggle,
  maxSelectable,
}: CompareShowPickerProps) {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];

  return (
    <View style={styles.list}>
      {candidates.map((candidate) => {
        const key = String(candidate.showId);
        const isSelected = selectedIds.has(key);
        const disabled = !isSelected && selectedIds.size >= maxSelectable;
        const badge = resolveBadge(candidate, isDark);
        const posterBg = isDark ? "#27272f" : "#efefef";

        return (
          <Pressable
            key={key}
            onPress={() => onToggle(candidate.showId)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: isSelected ? c.accent : c.border,
                borderWidth: isSelected ? 1 : StyleSheet.hairlineWidth,
                opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.poster, { backgroundColor: posterBg }]}>
              {candidate.posterUrl ? (
                <SmartShowImage
                  uri={candidate.posterUrl}
                  style={StyleSheet.absoluteFill}
                  matBackground={posterBg}
                />
              ) : (
                <ShowPlaceholder
                  name={candidate.name}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>

            <View style={styles.body}>
              <Text
                style={[styles.name, { color: c.text }]}
                numberOfLines={2}
              >
                {candidate.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.type, { color: c.mutedText }]}>
                  {candidate.type}
                </Text>
                {badge && (
                  <View style={[styles.chip, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.chipText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View
              style={[
                styles.check,
                {
                  borderColor: isSelected ? c.accent : c.border,
                  backgroundColor: isSelected ? c.accent : "transparent",
                },
              ]}
            >
              {isSelected && (
                <IconSymbol name="checkmark" size={14} color={c.onAccent} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
  },
  poster: { width: 48, height: 72, borderRadius: 6, overflow: "hidden" },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  type: { fontSize: 12, textTransform: "capitalize" },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  chipText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
