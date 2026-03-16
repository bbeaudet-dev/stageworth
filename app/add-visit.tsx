import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";
type RankingTier = "loved" | "liked" | "okay" | "disliked";

const TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};

const MAX_RESULTS = 10;
const DEFAULT_SUGGESTION_RESULTS = 10;
const TIER_ORDER: RankingTier[] = ["loved", "liked", "okay", "disliked"];
const TIER_LABELS: Record<RankingTier, string> = {
  loved: "Loved it",
  liked: "Liked it",
  okay: "It was Okay",
  disliked: "Didn't Like it",
};

function getTierRank(tier: RankingTier) {
  return TIER_ORDER.indexOf(tier);
}

function normalizeTier(value: string | undefined): RankingTier {
  if (value === "loved" || value === "liked" || value === "okay" || value === "disliked") {
    return value;
  }
  return "liked";
}

function getBottomInsertionIndexForTier(
  rankedShows: RankedShowForRanking[],
  selectedTier: RankingTier
) {
  let lastSameTier = -1;
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeTier(rankedShows[i].tier);
    if (tier === selectedTier) lastSameTier = i;
  }
  if (lastSameTier !== -1) return lastSameTier + 1;

  const selectedRank = getTierRank(selectedTier);
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeTier(rankedShows[i].tier);
    if (getTierRank(tier) > selectedRank) return i;
  }
  return rankedShows.length;
}

type RankedShowForRanking = {
  _id: Id<"shows">;
  name: string;
  images: string[];
  tier?: string;
  isUnranked?: boolean;
};

type UserShowStatus = {
  _id: Id<"shows">;
  tier?: string;
  visitCount?: number;
  isUnranked?: boolean;
};

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AddVisitScreen() {
  const router = useRouter();
  const allShows = useQuery(api.shows.list);
  const rankedShows = useQuery(api.rankings.getRankedShows);
  const visitHistory = useQuery(api.visits.listAllWithShows);
  const createVisit = useMutation(api.visits.createVisit);

  const [query, setQuery] = useState("");
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(null);
  const [customShowName, setCustomShowName] = useState<string | null>(null);
  const [date, setDate] = useState(getTodayIsoDate());
  const [selectedProductionId, setSelectedProductionId] =
    useState<Id<"productions"> | null>(null);
  const [useOtherProduction, setUseOtherProduction] = useState(false);
  const [city, setCity] = useState("");
  const [theatre, setTheatre] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [keepCurrentRanking, setKeepCurrentRanking] = useState(true);
  const [selectedTier, setSelectedTier] = useState<RankingTier | null>(null);
  const [searchLow, setSearchLow] = useState(0);
  const [searchHigh, setSearchHigh] = useState(0);
  const [rankingResultIndex, setRankingResultIndex] = useState<number | null>(null);

  const selectedShow = useMemo(
    () => allShows?.find((show) => show._id === selectedShowId) ?? null,
    [allShows, selectedShowId],
  );

  const showContext = useQuery(api.visits.getAddVisitContext, {
    showId: selectedShowId ?? undefined,
  });

  const productions = useQuery(
    api.productions.listByShow,
    selectedShowId ? { showId: selectedShowId } : "skip",
  );

  const productionOptions = productions ?? [];
  const userShowStatusById = useMemo(() => {
    const map = new Map<Id<"shows">, UserShowStatus>();
    for (const status of (rankedShows ?? []) as UserShowStatus[]) {
      map.set(status._id, status);
    }
    return map;
  }, [rankedShows]);
  const visitedShowIds = useMemo(() => {
    const ids = new Set<Id<"shows">>();
    for (const visit of (visitHistory ?? []).filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    )) {
      ids.add(visit.showId as Id<"shows">);
    }
    return ids;
  }, [visitHistory]);

  const filteredShows = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || !allShows) return [];
    const lower = trimmed.toLowerCase();
    return allShows
      .filter((show) => show.name.toLowerCase().includes(lower))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lower);
        const bStarts = b.name.toLowerCase().startsWith(lower);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);
  }, [allShows, query]);

  const suggestedShows = useMemo(() => {
    if (!allShows) return [];
    const rankedIds = new Set<Id<"shows">>();
    const rankedFirst: typeof allShows = [];
    const unseenPool: typeof allShows = [];

    for (const entry of ((rankedShows ?? []) as UserShowStatus[])) {
      if (entry.isUnranked || entry.tier === "unranked") continue;
      rankedIds.add(entry._id);
    }

    for (const show of allShows) {
      if (rankedIds.has(show._id)) {
        rankedFirst.push(show);
      } else {
        unseenPool.push(show);
      }
    }

    unseenPool.sort((a, b) => a.name.localeCompare(b.name));
    return [...rankedFirst, ...unseenPool].slice(0, DEFAULT_SUGGESTION_RESULTS);
  }, [allShows, rankedShows]);

  const searchResults = query.trim().length > 0 ? filteredShows : suggestedShows;

  const hasExactMatch = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return (
      lower.length > 0 &&
      filteredShows.some((show) => show.name.toLowerCase() === lower)
    );
  }, [filteredShows, query]);

  const hasSelectedShow = selectedShowId !== null || customShowName !== null;
  const showNameForHeader = selectedShow?.name ?? customShowName ?? "";
  const shouldShowRankingSection =
    hasSelectedShow && !(showContext?.hasRanking && keepCurrentRanking);
  const isRankingsLoading = rankedShows === undefined;
  const rankedShowsForRanking = useMemo<RankedShowForRanking[]>(() => {
    const base = ((rankedShows ?? []) as RankedShowForRanking[]).filter(
      (show) => !show.isUnranked && show.tier !== "unranked"
    );
    if (!selectedShowId) return base;
    return base.filter((show) => show._id !== selectedShowId);
  }, [rankedShows, selectedShowId]);
  const tierComparisonShows = useMemo(() => {
    if (!selectedTier) return [];
    return rankedShowsForRanking.filter(
      (show) => normalizeTier(show.tier) === selectedTier
    );
  }, [rankedShowsForRanking, selectedTier]);
  const tierAbsoluteIndices = useMemo(() => {
    if (!selectedTier) return [];
    return rankedShowsForRanking
      .map((show, index) => (normalizeTier(show.tier) === selectedTier ? index : -1))
      .filter((index) => index >= 0);
  }, [rankedShowsForRanking, selectedTier]);
  const comparisonMidIndex = useMemo(() => {
    if (!selectedTier || rankingResultIndex !== null) return null;
    if (searchLow >= searchHigh) return null;
    return Math.floor((searchLow + searchHigh) / 2);
  }, [rankingResultIndex, searchHigh, searchLow, selectedTier]);
  const comparisonTarget =
    comparisonMidIndex !== null ? tierComparisonShows[comparisonMidIndex] : null;
  const predictedResultIndex = useMemo(() => {
    if (rankingResultIndex !== null) return rankingResultIndex;
    if (!selectedTier) return null;
    if (tierComparisonShows.length === 0) {
      return getBottomInsertionIndexForTier(rankedShowsForRanking, selectedTier);
    }
    if (searchLow >= searchHigh) {
      const relativeInsert = searchLow;
      if (tierAbsoluteIndices.length === 0) {
        return getBottomInsertionIndexForTier(rankedShowsForRanking, selectedTier);
      }
      if (relativeInsert >= tierAbsoluteIndices.length) {
        return tierAbsoluteIndices[tierAbsoluteIndices.length - 1] + 1;
      }
      return tierAbsoluteIndices[relativeInsert];
    }
    return null;
  }, [
    rankingResultIndex,
    rankedShowsForRanking,
    searchHigh,
    searchLow,
    selectedTier,
    tierAbsoluteIndices,
    tierComparisonShows.length,
  ]);
  const rankingPhase: "tier" | "comparison" | "result" = useMemo(() => {
    if (!selectedTier) return "tier";
    if (rankingResultIndex !== null) return "result";
    if (tierComparisonShows.length === 0) return "result";
    return searchLow >= searchHigh ? "result" : "comparison";
  }, [rankingResultIndex, searchHigh, searchLow, selectedTier, tierComparisonShows.length]);

  const getInsertionIndexForRelative = (
    tier: RankingTier,
    relativeInsertIndex: number
  ) => {
    if (tierAbsoluteIndices.length === 0) {
      return getBottomInsertionIndexForTier(rankedShowsForRanking, tier);
    }
    if (relativeInsertIndex >= tierAbsoluteIndices.length) {
      return tierAbsoluteIndices[tierAbsoluteIndices.length - 1] + 1;
    }
    return tierAbsoluteIndices[relativeInsertIndex];
  };

  useEffect(() => {
    if (shouldShowRankingSection) return;
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
  }, [shouldShowRankingSection]);

  const selectExistingShow = (showId: Id<"shows">) => {
    setSelectedShowId(showId);
    setCustomShowName(null);
    setQuery("");
    setSelectedProductionId(null);
    setUseOtherProduction(false);
    setCity("");
    setTheatre("");
    setKeepCurrentRanking(true);
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
  };

  const selectCustomShow = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCustomShowName(trimmed);
    setSelectedShowId(null);
    setQuery("");
    setSelectedProductionId(null);
    setUseOtherProduction(true);
    setCity("");
    setTheatre("");
    setKeepCurrentRanking(false);
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
  };

  const clearSelection = () => {
    setSelectedShowId(null);
    setCustomShowName(null);
    setSelectedProductionId(null);
    setUseOtherProduction(false);
    setCity("");
    setTheatre("");
    setNotes("");
    setKeepCurrentRanking(true);
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
  };

  const startTierRanking = (tier: RankingTier) => {
    if (isRankingsLoading) return;
    const tierShowsInRange = rankedShowsForRanking.filter(
      (show) => normalizeTier(show.tier) === tier
    );
    setSelectedTier(tier);
    setSearchLow(0);
    setSearchHigh(tierShowsInRange.length);
    if (tierShowsInRange.length === 0) {
      setRankingResultIndex(getBottomInsertionIndexForTier(rankedShowsForRanking, tier));
    } else {
      setRankingResultIndex(null);
    }
  };

  const handleTierChange = () => {
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
  };

  const handleComparisonAnswer = (prefersNewShow: boolean) => {
    if (comparisonMidIndex === null) return;
    if (prefersNewShow) {
      const nextHigh = comparisonMidIndex;
      setSearchHigh(nextHigh);
      if (searchLow >= nextHigh && selectedTier) {
        setRankingResultIndex(getInsertionIndexForRelative(selectedTier, searchLow));
      }
      return;
    }

    const nextLow = comparisonMidIndex + 1;
    setSearchLow(nextLow);
    if (nextLow >= searchHigh && selectedTier) {
      setRankingResultIndex(getInsertionIndexForRelative(selectedTier, nextLow));
    }
  };

  const restartRanking = () => {
    if (!selectedTier) return;
    setSearchLow(0);
    setSearchHigh(
      rankedShowsForRanking.filter((show) => normalizeTier(show.tier) === selectedTier)
        .length
    );
    setRankingResultIndex(null);
  };

  const handleSave = async () => {
    if (!hasSelectedShow || isSaving) return;
    setIsSaving(true);
    try {
      await createVisit({
        showId: selectedShowId ?? undefined,
        customShowName: customShowName ?? undefined,
        date: date.trim() || getTodayIsoDate(),
        productionId:
          useOtherProduction || !selectedProductionId
            ? undefined
            : selectedProductionId,
        city: useOtherProduction ? city.trim() || undefined : undefined,
        theatre: useOtherProduction ? theatre.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        keepCurrentRanking,
        selectedTier:
          shouldShowRankingSection && selectedTier ? selectedTier : undefined,
        completedInsertionIndex:
          shouldShowRankingSection &&
          rankingPhase === "result" &&
          predictedResultIndex !== null
            ? predictedResultIndex
            : undefined,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add Visit</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Show</Text>
            {hasSelectedShow ? (
              <View style={styles.selectedShowCard}>
                <Text style={styles.selectedShowLabel}>Selected</Text>
                <Text style={styles.selectedShowName}>{showNameForHeader}</Text>
                <Pressable onPress={clearSelection}>
                  <Text style={styles.changeShowText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search all shows..."
                  style={styles.input}
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {allShows !== undefined && (
                  <View style={styles.resultsCard}>
                    {!hasExactMatch && (
                      <Pressable
                        style={styles.customShowRow}
                        onPress={selectCustomShow}
                      >
                        <Text style={styles.customShowText}>
                          Add {query.trim()} as custom show
                        </Text>
                      </Pressable>
                    )}
                    {searchResults.length === 0 && query.trim().length > 0 && hasExactMatch && (
                      <View style={styles.noResultsRow}>
                        <Text style={styles.noResultsText}>No matching shows</Text>
                      </View>
                    )}
                    {query.trim().length === 0 && (
                      <View style={styles.suggestionHeaderRow}>
                        <Text style={styles.suggestionHeaderText}>Suggestions</Text>
                      </View>
                    )}
                    {searchResults.map((show) => (
                      (() => {
                        const status = userShowStatusById.get(show._id);
                        const badges: { label: string; style: "seen" | "added" }[] = [];
                        const hasSeen = visitedShowIds.has(show._id) || (status?.visitCount ?? 0) > 0;
                        if (status) {
                          if (status.isUnranked || status.tier === "unranked") {
                            badges.push({ label: "Added", style: "added" });
                          } else {
                            badges.push({ label: "Seen", style: "seen" });
                          }
                        } else if (hasSeen) {
                          badges.push({ label: "Seen", style: "seen" });
                        }

                        return (
                          <Pressable
                            key={show._id}
                            style={styles.resultRow}
                            onPress={() => selectExistingShow(show._id)}
                          >
                            <Text style={styles.resultName}>{show.name}</Text>
                            <View style={styles.resultMeta}>
                              {badges.map((badge) => (
                                <View
                                  key={badge.label}
                                  style={[
                                    styles.statusBadge,
                                    badge.style === "seen"
                                      ? styles.statusBadgeSeen
                                      : styles.statusBadgeAdded,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusBadgeText,
                                      badge.style === "seen"
                                        ? styles.statusBadgeIcon
                                        : null,
                                    ]}
                                  >
                                    {badge.style === "seen" ? "👁" : badge.label}
                                  </Text>
                                </View>
                              ))}
                              <Text style={styles.resultType}>
                                {TYPE_LABELS[show.type]}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })()
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {hasSelectedShow && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Visit Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Production / Location</Text>
                {selectedShowId ? (
                  <>
                    {productions === undefined ? (
                      <ActivityIndicator size="small" color="#999" />
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.productionRow}
                      >
                        {productionOptions.map((production) => {
                          const selected =
                            selectedProductionId === production._id &&
                            !useOtherProduction;
                          const labelParts = [production.theatre];
                          if (production.city) labelParts.push(production.city);
                          return (
                            <Pressable
                              key={production._id}
                              style={[
                                styles.productionChip,
                                selected && styles.productionChipSelected,
                              ]}
                              onPress={() => {
                                setSelectedProductionId(production._id);
                                setUseOtherProduction(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.productionChipText,
                                  selected && styles.productionChipTextSelected,
                                ]}
                              >
                                {labelParts.join(" · ")}
                              </Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          style={[
                            styles.productionChip,
                            useOtherProduction && styles.productionChipSelected,
                          ]}
                          onPress={() => {
                            setUseOtherProduction(true);
                            setSelectedProductionId(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.productionChipText,
                              useOtherProduction &&
                                styles.productionChipTextSelected,
                            ]}
                          >
                            Other
                          </Text>
                        </Pressable>
                      </ScrollView>
                    )}
                  </>
                ) : (
                  <Text style={styles.helperText}>
                    Custom shows use the Other location details below.
                  </Text>
                )}
                {useOtherProduction && (
                  <View style={styles.otherForm}>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="City (optional)"
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={styles.input}
                      value={theatre}
                      onChangeText={setTheatre}
                      placeholder="Theatre / venue / movie / pro-shot (optional)"
                      autoCapitalize="words"
                    />
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ranking</Text>
                {showContext?.hasRanking && (
                  <Pressable
                    style={styles.keepCurrentRow}
                    onPress={() => setKeepCurrentRanking((prev) => !prev)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        keepCurrentRanking && styles.checkboxChecked,
                      ]}
                    >
                      {keepCurrentRanking && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.keepCurrentText}>Keep Current Ranking</Text>
                  </Pressable>
                )}
                {showContext?.hasVisit && (
                  <Text style={styles.helperText}>
                    You already have at least one visit saved for this show.
                  </Text>
                )}
                {shouldShowRankingSection && (
                  <View style={styles.rankingCard}>
                    {selectedTier ? (
                      <View style={styles.selectedTierRow}>
                        <View>
                          <Text style={styles.selectedTierLabel}>Tier selected</Text>
                          <Text style={styles.selectedTierValue}>
                            {TIER_LABELS[selectedTier]}
                          </Text>
                        </View>
                        <Pressable onPress={handleTierChange}>
                          <Text style={styles.changeShowText}>Change</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.placeholderTitle}>
                          How did you feel about this show?
                        </Text>
                        {isRankingsLoading ? (
                          <ActivityIndicator size="small" color="#999" />
                        ) : (
                          <View style={styles.tierGrid}>
                            {TIER_ORDER.map((tier) => (
                              <Pressable
                                key={tier}
                                style={styles.tierButton}
                                onPress={() => startTierRanking(tier)}
                              >
                                <Text style={styles.tierButtonText}>
                                  {TIER_LABELS[tier]}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    {selectedTier && rankingPhase === "comparison" && comparisonTarget && (
                      <View style={styles.comparisonBlock}>
                        <Text style={styles.placeholderTitle}>
                          Which show do you prefer?
                        </Text>
                        <View style={styles.comparisonCards}>
                          <Pressable
                            style={styles.playbillCard}
                            onPress={() => handleComparisonAnswer(true)}
                          >
                            <View style={styles.playbillFallback}>
                              <Text style={styles.playbillFallbackText}>
                                {showNameForHeader}
                              </Text>
                            </View>
                            <Text style={styles.playbillName} numberOfLines={2}>
                              {showNameForHeader}
                            </Text>
                          </Pressable>

                          <Pressable
                            style={styles.playbillCard}
                            onPress={() => handleComparisonAnswer(false)}
                          >
                            {comparisonTarget.images[0] ? (
                              <Image
                                source={{ uri: comparisonTarget.images[0] }}
                                style={styles.playbillImage}
                              />
                            ) : (
                              <View style={styles.playbillFallback}>
                                <Text style={styles.playbillFallbackText}>
                                  {comparisonTarget.name}
                                </Text>
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
                          {`#${predictedResultIndex + 1} of ${
                            rankedShowsForRanking.length + 1
                          }`}
                        </Text>
                        <Pressable onPress={restartRanking}>
                          <Text style={styles.changeShowText}>Restart Ranking</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any extra details..."
                  multiline
                />
              </View>

              <Pressable
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save Visit"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e3e3e3",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  closeText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d3d3d3",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  selectedShowCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d3d3d3",
    borderRadius: 10,
    padding: 12,
    gap: 4,
    backgroundColor: "#f8f8ff",
  },
  selectedShowLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "500",
  },
  selectedShowName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  changeShowText: {
    marginTop: 4,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  resultsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e1e1",
    borderRadius: 10,
    overflow: "hidden",
  },
  customShowRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8f8ff",
  },
  customShowText: {
    color: "#007AFF",
    fontWeight: "500",
    fontSize: 14,
  },
  noResultsRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noResultsText: {
    color: "#999",
    fontSize: 14,
  },
  suggestionHeaderRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ededed",
    backgroundColor: "#fafafa",
  },
  suggestionHeaderText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ededed",
    gap: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
  },
  resultType: {
    fontSize: 12,
    color: "#888",
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeSeen: {
    backgroundColor: "#dff3ff",
  },
  statusBadgeAdded: {
    backgroundColor: "#f1f1f1",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 0.25,
    textTransform: "uppercase",
  },
  statusBadgeIcon: {
    fontSize: 11,
    letterSpacing: 0,
    textTransform: "none",
  },
  productionRow: {
    gap: 8,
  },
  productionChip: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cecece",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  productionChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  productionChipText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  productionChipTextSelected: {
    color: "#fff",
  },
  otherForm: {
    gap: 10,
  },
  helperText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  keepCurrentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  keepCurrentText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },
  rankingCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#dedede",
    backgroundColor: "#fafafa",
    padding: 12,
    gap: 6,
  },
  selectedTierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedTierLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "500",
  },
  selectedTierValue: {
    fontSize: 16,
    color: "#111",
    fontWeight: "700",
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  tierGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tierButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cfcfcf",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  tierButtonText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  comparisonBlock: {
    gap: 10,
    marginTop: 4,
  },
  comparisonCards: {
    flexDirection: "row",
    gap: 10,
  },
  playbillCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d4",
    backgroundColor: "#fff",
    overflow: "hidden",
    paddingBottom: 10,
  },
  playbillImage: {
    width: "100%",
    aspectRatio: 2 / 3,
    backgroundColor: "#eee",
  },
  playbillFallback: {
    width: "100%",
    aspectRatio: 2 / 3,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  playbillFallbackText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  playbillName: {
    fontSize: 13,
    color: "#222",
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  resultBlock: {
    marginTop: 8,
    gap: 6,
  },
  resultText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "800",
  },
  saveButton: {
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
