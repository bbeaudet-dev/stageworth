import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

import { styles } from "@/features/add-visit/styles";
import { TIER_ORDER } from "@/features/add-visit/logic/ranking";
import type { RankedShowForRanking, RankingTier } from "@/features/add-visit/types";

const TIER_LABELS: Record<RankingTier, string> = {
  loved: "Loved it",
  liked: "Liked it",
  okay: "It was Okay",
  disliked: "Didn't Like it",
};

const TIER_BUTTON_STYLES: Record<
  RankingTier,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  loved: { backgroundColor: "#fbe0ee", borderColor: "#ef5da8", textColor: "#7f2252" },
  liked: { backgroundColor: "#e2f3e6", borderColor: "#2f8f46", textColor: "#235f31" },
  okay: { backgroundColor: "#fdf4d8", borderColor: "#e9c84f", textColor: "#755c16" },
  disliked: { backgroundColor: "#fde6e2", borderColor: "#dd4b39", textColor: "#7d2d23" },
};

export function RankingSection({
  showHasRanking,
  showHasVisit,
  keepCurrentRanking,
  setKeepCurrentRanking,
  shouldShowRankingSection,
  selectedTier,
  onChangeTier,
  isRankingsLoading,
  startTierRanking,
  rankingPhase,
  comparisonTarget,
  showNameForHeader,
  onComparisonAnswer,
  predictedResultIndex,
  rankedShowsForRanking,
}: {
  showHasRanking: boolean;
  showHasVisit: boolean;
  keepCurrentRanking: boolean;
  setKeepCurrentRanking: (value: boolean) => void;
  shouldShowRankingSection: boolean;
  selectedTier: RankingTier | null;
  onChangeTier: () => void;
  isRankingsLoading: boolean;
  startTierRanking: (tier: RankingTier) => void;
  rankingPhase: "tier" | "comparison" | "result";
  comparisonTarget: RankedShowForRanking | null;
  showNameForHeader: string;
  onComparisonAnswer: (prefersNewShow: boolean) => void;
  predictedResultIndex: number | null;
  rankedShowsForRanking: RankedShowForRanking[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How was it?</Text>
      {showHasRanking && (
        <Pressable
          style={styles.keepCurrentRow}
          onPress={() => setKeepCurrentRanking(!keepCurrentRanking)}
        >
          <View style={[styles.checkbox, keepCurrentRanking && styles.checkboxChecked]}>
            {keepCurrentRanking && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.keepCurrentText}>Keep Current Ranking</Text>
        </Pressable>
      )}
      {showHasVisit && (
        <Text style={styles.helperText}>You already have at least one visit saved for this show.</Text>
      )}

      {shouldShowRankingSection && (
        <View style={styles.rankingCard}>
          {selectedTier ? (
            <View style={styles.selectedTierRow}>
              <View
                style={[
                  styles.selectedTierPill,
                  {
                    backgroundColor: TIER_BUTTON_STYLES[selectedTier].backgroundColor,
                    borderColor: TIER_BUTTON_STYLES[selectedTier].borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectedTierValue,
                    { color: TIER_BUTTON_STYLES[selectedTier].textColor },
                  ]}
                >
                  {TIER_LABELS[selectedTier]}
                </Text>
              </View>
              <Pressable onPress={onChangeTier}>
                <Text style={styles.changeShowText}>Change</Text>
              </Pressable>
            </View>
          ) : isRankingsLoading ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <View style={styles.tierGrid}>
              {TIER_ORDER.map((tier) => (
                <Pressable
                  key={tier}
                  style={[
                    styles.tierButton,
                    {
                      backgroundColor: TIER_BUTTON_STYLES[tier].backgroundColor,
                      borderColor: TIER_BUTTON_STYLES[tier].borderColor,
                    },
                  ]}
                  onPress={() => startTierRanking(tier)}
                >
                  <Text
                    style={[styles.tierButtonText, { color: TIER_BUTTON_STYLES[tier].textColor }]}
                  >
                    {TIER_LABELS[tier]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedTier && rankingPhase === "comparison" && comparisonTarget && (
            <View style={styles.comparisonBlock}>
              <Text style={styles.placeholderTitle}>Which show do you prefer?</Text>
              <View style={styles.comparisonCards}>
                <Pressable
                  style={styles.playbillCard}
                  onPress={() => onComparisonAnswer(true)}
                >
                  <View style={styles.playbillFallback}>
                    <Text style={styles.playbillFallbackText}>{showNameForHeader}</Text>
                  </View>
                  <Text style={styles.playbillName} numberOfLines={2}>
                    {showNameForHeader}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.playbillCard}
                  onPress={() => onComparisonAnswer(false)}
                >
                  {comparisonTarget.images[0] ? (
                    <Image
                      source={{ uri: comparisonTarget.images[0] }}
                      style={styles.playbillImage}
                    />
                  ) : (
                    <View style={styles.playbillFallback}>
                      <Text style={styles.playbillFallbackText}>{comparisonTarget.name}</Text>
                    </View>
                  )}
                  <Text style={styles.playbillName} numberOfLines={2}>
                    {comparisonTarget.name}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {selectedTier && rankingPhase === "result" && predictedResultIndex !== null && (
            <View style={styles.resultBlock}>
              <Text style={styles.placeholderTitle}>Ranking ready</Text>
              <Text style={styles.resultText}>
                {`#${predictedResultIndex + 1} of ${rankedShowsForRanking.length + 1}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
