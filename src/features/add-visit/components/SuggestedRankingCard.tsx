import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RANKED_TIER_COLORS } from "@/constants/tierColors";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { SuggestedRankingState } from "@/features/add-visit/hooks/useSuggestedRanking";

/**
 * Renders the Suggested Ranking strip inside the shared Ranking card. No
 * outer border/background of its own — it relies on a top divider to read
 * as a sub-section of the parent card.
 */
export function SuggestedRankingCard({
  state,
  totalRanked,
  globalInsertionIndex,
  onUseSuggestion,
  onRetry,
}: {
  state: SuggestedRankingState;
  totalRanked: number;
  /** Global insertion index (0-based) into the full ranked list, or null when not yet known. */
  globalInsertionIndex: number | null;
  onUseSuggestion: () => void;
  onRetry: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  if (state.status === "idle") return null;

  const tier = state.status === "tier_ready" || state.status === "ready" ? state.tier : null;
  const tierPill = tier
    ? {
        bg: RANKED_TIER_COLORS[tier].bg,
        border: RANKED_TIER_COLORS[tier].border,
        text: RANKED_TIER_COLORS[tier].text,
        label: RANKED_TIER_COLORS[tier].label,
      }
    : null;

  const showRefresh =
    state.status === "ready" || state.status === "unavailable";

  return (
    <View style={[styles.wrapper, { borderTopColor: c.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: c.mutedText }]}>
          Suggested Ranking
        </Text>
        {showRefresh && (
          <Pressable onPress={onRetry} hitSlop={10}>
            <Text style={[styles.actionText, { color: c.accent }]}>
              Refresh
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        {tierPill ? (
          <View
            style={[
              styles.tierPill,
              { backgroundColor: tierPill.bg, borderColor: tierPill.border },
            ]}
          >
            <Text style={[styles.tierPillText, { color: tierPill.text }]}>
              {tierPill.label}
            </Text>
          </View>
        ) : null}

        {state.status === "ready" && globalInsertionIndex !== null && (
          <Text style={[styles.positionText, { color: c.text }]}>
            {`#${globalInsertionIndex + 1} of ${totalRanked + 1}`}
          </Text>
        )}

        {(state.status === "predicting_tier" || state.status === "tier_ready") && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={c.mutedText} />
            <Text style={[styles.loadingText, { color: c.mutedText }]}>
              Loading…
            </Text>
          </View>
        )}

        {state.status === "ready" && (
          <Pressable
            onPress={onUseSuggestion}
            style={({ pressed }) => [
              styles.useButton,
              { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Use this suggested ranking"
          >
            <Text style={styles.useButtonText}>Use this ranking</Text>
          </Pressable>
        )}
      </View>

      {state.status === "unavailable" && (
        <Text style={[styles.reasonText, { color: c.mutedText }]}>
          {state.reason || "No suggestion available yet."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tierPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  positionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loadingText: {
    fontSize: 13,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  useButton: {
    marginLeft: "auto",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  useButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
