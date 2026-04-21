import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, useWindowDimensions, View } from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { RANKED_TIER_COLORS } from "@/constants/tierColors";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";
import { TIER_ORDER } from "@/features/add-visit/logic/ranking";
import type { RankedShowForRanking, RankedTier } from "@/features/add-visit/types";

// Derive button styles directly from the shared tier colour scale.
// Using solid fills (same as list-view pills) — bolder and consistent.
const TIER_BUTTON_STYLES: Record<RankedTier, { backgroundColor: string; borderColor: string; textColor: string }> =
  Object.fromEntries(
    (Object.keys(RANKED_TIER_COLORS) as RankedTier[]).map((t) => [
      t,
      {
        backgroundColor: RANKED_TIER_COLORS[t].bg,
        borderColor: RANKED_TIER_COLORS[t].border,
        textColor: RANKED_TIER_COLORS[t].text,
      },
    ])
  ) as Record<RankedTier, { backgroundColor: string; borderColor: string; textColor: string }>;

/**
 * Small wrapper that falls back to the branded placeholder if the playbill
 * image URL fails to load (broken hotlink, decode error, etc.) — important
 * because the ranking comparison is useless without a visible poster.
 */
function ComparisonPlaybillImage({
  uri,
  name,
  surfaceColor,
}: {
  uri: string | null;
  name: string;
  surfaceColor: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return <ShowPlaceholder name={name} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.playbillImage, { backgroundColor: surfaceColor }]}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

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
  showImageForHeader,
  onComparisonAnswer,
  onSkipComparison,
  canSkipComparison,
  predictedResultIndex,
  rankedShowsForRanking,
}: {
  showHasRanking: boolean;
  showHasVisit: boolean;
  keepCurrentRanking: boolean;
  setKeepCurrentRanking: (value: boolean) => void;
  shouldShowRankingSection: boolean;
  selectedTier: RankedTier | null;
  onChangeTier: () => void;
  isRankingsLoading: boolean;
  startTierRanking: (tier: RankedTier) => void;
  rankingPhase: "tier" | "comparison" | "result";
  comparisonTarget: RankedShowForRanking | null;
  showNameForHeader: string;
  showImageForHeader: string | null;
  onComparisonAnswer: (prefersNewShow: boolean) => void;
  onSkipComparison: () => void;
  canSkipComparison: boolean;
  predictedResultIndex: number | null;
  rankedShowsForRanking: RankedShowForRanking[];
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const { width: windowWidth } = useWindowDimensions();
  // Match Add Visit `content` (16) + ranking card inset (12). Playbills sized as if 3 fit per row.
  const comparisonPlaybillWidth = Math.max(
    88,
    Math.floor((windowWidth - 16 * 2 - 12 * 2 - 10 * 2) / 3)
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>How was it?</Text>
      {showHasRanking && (
        <Pressable
          style={styles.keepCurrentRow}
          onPress={() => setKeepCurrentRanking(!keepCurrentRanking)}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: c.mutedText, backgroundColor: c.surface },
              keepCurrentRanking && [styles.checkboxChecked, { backgroundColor: c.accent, borderColor: c.accent }],
            ]}
          >
            {keepCurrentRanking && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.keepCurrentText, { color: c.text }]}>Keep Current Ranking</Text>
        </Pressable>
      )}
      {showHasVisit && (
        <Text style={[styles.helperText, { color: c.mutedText }]}>You already have at least one visit saved for this show.</Text>
      )}

      {shouldShowRankingSection && (
        <View style={[styles.rankingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
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
                  {RANKED_TIER_COLORS[selectedTier].label}
                </Text>
              </View>
              <Pressable onPress={onChangeTier}>
                <Text style={[styles.changeShowText, { color: c.accent }]}>Change</Text>
              </Pressable>
            </View>
          ) : isRankingsLoading ? (
            <ActivityIndicator size="small" color={c.mutedText} />
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
                    {RANKED_TIER_COLORS[tier].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedTier && rankingPhase === "comparison" && comparisonTarget && (
            <View style={styles.comparisonBlock}>
              <Text style={[styles.placeholderTitle, { color: c.text }]}>If you had to pick one...</Text>
              <View style={styles.comparisonCards}>
                <Pressable
                  style={[
                    styles.playbillCard,
                    {
                      width: comparisonPlaybillWidth,
                      backgroundColor: c.surfaceElevated,
                      borderColor: c.border,
                    },
                  ]}
                  onPress={() => onComparisonAnswer(true)}
                >
                  <ComparisonPlaybillImage
                    uri={showImageForHeader}
                    name={showNameForHeader}
                    surfaceColor={c.surface}
                  />
                  <Text style={[styles.playbillName, { color: c.text }]} numberOfLines={2}>
                    {showNameForHeader}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.playbillCard,
                    {
                      width: comparisonPlaybillWidth,
                      backgroundColor: c.surfaceElevated,
                      borderColor: c.border,
                    },
                  ]}
                  onPress={() => onComparisonAnswer(false)}
                >
                  <ComparisonPlaybillImage
                    uri={comparisonTarget.images[0] ?? null}
                    name={comparisonTarget.name}
                    surfaceColor={c.surface}
                  />
                  <Text style={[styles.playbillName, { color: c.text }]} numberOfLines={2}>
                    {comparisonTarget.name}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onSkipComparison}
                  disabled={!canSkipComparison}
                  style={[
                    styles.skipButton,
                    {
                      borderColor: c.border,
                      backgroundColor: c.surfaceElevated,
                    },
                    !canSkipComparison && styles.skipButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Skip this comparison"
                  accessibilityState={{ disabled: !canSkipComparison }}
                >
                  <Text
                    style={[
                      styles.skipButtonText,
                      { color: canSkipComparison ? c.text : c.mutedText },
                    ]}
                  >
                    Skip
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {selectedTier && rankingPhase === "result" && predictedResultIndex !== null && (
            <View style={styles.resultBlock}>
              <Text style={[styles.placeholderTitle, { color: c.text }]}>Ranking ready</Text>
              <Text style={[styles.resultText, { color: c.text }]}>
                {`#${predictedResultIndex + 1} of ${rankedShowsForRanking.length + 1}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
