import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";
import { useCelebration } from "@/components/CelebrationContext";
import { Colors } from "@/constants/theme";
import { playbillMatBackground } from "@/features/browse/styles";
import { isFutureDate, formatDate } from "@/utils/dates";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { styles } from "@/features/add-visit/styles";
import { NotesSection } from "@/features/add-visit/components/NotesSection";
import { RankingSection } from "@/features/add-visit/components/RankingSection";
import { useAddVisitRankingFlow } from "@/features/add-visit/hooks/useAddVisitRankingFlow";
import { useSuggestedRanking } from "@/features/add-visit/hooks/useSuggestedRanking";
import {
  getBottomInsertionIndexForTier,
  getInsertionIndexForTierAndRelative,
} from "@/features/add-visit/logic/ranking";
import type { RankedTier } from "@/features/add-visit/types";

export default function AcceptVisitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { celebrate } = useCelebration();
  const params = useLocalSearchParams<{ visitId?: string }>();
  const visitId = (params.visitId ?? "") as Id<"visits">;

  const visit = useQuery(api.visits.getById, visitId ? { visitId } : "skip");
  const rankedShows = useQuery(api.rankings.getRankedShows);
  const acceptTag = useMutation(api.visitParticipants.acceptVisitTag);
  const declineTag = useMutation(api.visitParticipants.declineVisitTag);

  const [notes, setNotes] = useState("");
  const [keepCurrentRanking, setKeepCurrentRanking] = useState(true);
  const [selectedTier, setSelectedTier] = useState<RankedTier | null>(null);
  const [searchLow, setSearchLow] = useState(0);
  const [searchHigh, setSearchHigh] = useState(0);
  const [rankingResultIndex, setRankingResultIndex] = useState<number | null>(null);
  const [skippedComparisonIndices, setSkippedComparisonIndices] = useState<number[]>([]);
  const [busy, setBusy] = useState<"accepting" | "declining" | null>(null);

  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const visitDate = visit?.date ?? null;
  const isVisitInFuture = visitDate ? isFutureDate(visitDate) : false;

  // Context for which ranking UI to show: if the user already has this show
  // ranked, offer "keep current" before forcing a re-rank.
  const showContext = useQuery(
    api.visits.getAddVisitContext,
    visit?.showId ? { showId: visit.showId } : "skip",
  );
  const shouldShowRankingSection =
    Boolean(visit) &&
    !isVisitInFuture &&
    !(showContext?.hasRanking && keepCurrentRanking);

  const {
    isRankingsLoading,
    rankedShowsForRanking,
    comparisonIndex,
    comparisonTarget,
    canSkipComparison,
    predictedResultIndex,
    rankingPhase,
    getInsertionIndexForRelative,
  } = useAddVisitRankingFlow({
    rankedShows,
    selectedShowId: visit?.showId ?? null,
    selectedShowType: visit?.show?.type as any,
    selectedTier,
    searchLow,
    searchHigh,
    rankingResultIndex,
    skippedComparisonIndices,
  });

  const suggestedTargetId =
    shouldShowRankingSection && !selectedTier ? visit?.showId ?? null : null;
  const { state: suggestedRanking, refresh: refreshSuggestedRanking } =
    useSuggestedRanking(suggestedTargetId);

  const resetRankingFlow = () => {
    setSelectedTier(null);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(null);
    setSkippedComparisonIndices([]);
  };

  const startTierRanking = (tier: RankedTier) => {
    if (isRankingsLoading) return;
    const tierShowsInRange = rankedShowsForRanking.filter((s) => s.tier === tier);
    setSelectedTier(tier);
    setSearchLow(0);
    setSearchHigh(tierShowsInRange.length);
    setSkippedComparisonIndices([]);
    if (tierShowsInRange.length === 0) {
      setRankingResultIndex(getBottomInsertionIndexForTier(rankedShowsForRanking, tier));
    } else {
      setRankingResultIndex(null);
    }
  };

  const handleComparisonAnswer = (prefersNewShow: boolean) => {
    if (comparisonIndex === null || !selectedTier) return;
    setSkippedComparisonIndices([]);
    if (prefersNewShow) {
      const nextHigh = comparisonIndex;
      setSearchHigh(nextHigh);
      if (searchLow >= nextHigh) {
        setRankingResultIndex(getInsertionIndexForRelative(selectedTier, searchLow));
      }
      return;
    }
    const nextLow = comparisonIndex + 1;
    setSearchLow(nextLow);
    if (nextLow >= searchHigh) {
      setRankingResultIndex(getInsertionIndexForRelative(selectedTier, nextLow));
    }
  };

  const handleSkipComparison = () => {
    if (comparisonIndex === null) return;
    setSkippedComparisonIndices((prev) =>
      prev.includes(comparisonIndex) ? prev : [...prev, comparisonIndex],
    );
  };

  const handleUseSuggestedRanking = () => {
    if (suggestedRanking.status !== "ready") return;
    const insertionIndex = getInsertionIndexForTierAndRelative(
      rankedShowsForRanking,
      suggestedRanking.tier,
      suggestedRanking.relativeIndex,
    );
    setSelectedTier(suggestedRanking.tier);
    setSearchLow(0);
    setSearchHigh(0);
    setRankingResultIndex(insertionIndex);
    setSkippedComparisonIndices([]);
  };

  const handleAccept = async () => {
    if (!visit || busy) return;
    setBusy("accepting");
    try {
      await acceptTag({
        visitId: visit._id,
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
      const celebrationData = {
        showName: visit.show?.name ?? "",
        imageUrl: visit.show?.images[0] ?? null,
      };
      router.back();
      setTimeout(() => celebrate(celebrationData), 120);
    } catch (err) {
      Alert.alert(
        "Couldn't accept visit",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    if (!visit || busy) return;
    Alert.alert("Decline visit tag?", "You won't see this visit in your list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          setBusy("declining");
          try {
            await declineTag({ visitId: visit._id });
            router.back();
            showToast({ message: "Visit declined" });
          } catch (err) {
            Alert.alert(
              "Couldn't decline",
              err instanceof Error ? err.message : "Please try again.",
            );
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const locationLabel = useMemo(() => {
    return [visit?.theatre, visit?.city].filter(Boolean).join(" • ") || "—";
  }, [visit?.theatre, visit?.city]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>Accept Visit</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} disabled={busy !== null}>
            <Text style={[styles.closeText, { color: c.accent }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {!visit ? (
            <View style={{ paddingTop: 40, alignItems: "center" }}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : visit.viewerParticipantStatus === "accepted" ? (
            <View style={{ paddingTop: 40, gap: 12 }}>
              <Text style={[styles.title, { color: c.text, textAlign: "center" }]}>
                You&rsquo;ve already accepted this visit.
              </Text>
              <Pressable
                style={[styles.saveButton, { backgroundColor: c.accent }]}
                onPress={() => {
                  router.replace({
                    pathname: "/visit/[visitId]",
                    params: { visitId: String(visit._id) },
                  });
                }}
              >
                <Text style={[styles.saveButtonText, { color: c.onAccent }]}>
                  Open visit
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Read-only hero — shared fields are owned by the creator. */}
              <View
                style={[
                  localStyles.hero,
                  { backgroundColor: playbillMatBackground(theme) },
                ]}
              >
                {visit.show?.images[0] ? (
                  <Image
                    source={{ uri: visit.show.images[0] }}
                    style={localStyles.heroImage}
                    contentFit="contain"
                  />
                ) : null}
                <View style={localStyles.heroText}>
                  <Text
                    style={[localStyles.heroTitle, { color: c.text }]}
                    numberOfLines={2}
                  >
                    {visit.show?.name ?? "Unknown Show"}
                  </Text>
                  <Text style={[localStyles.heroMeta, { color: c.mutedText }]}>
                    {formatDate(visit.date)}
                  </Text>
                  <Text
                    style={[localStyles.heroMeta, { color: c.mutedText }]}
                    numberOfLines={1}
                  >
                    {locationLabel}
                  </Text>
                </View>
              </View>

              <Text style={[localStyles.helper, { color: c.mutedText }]}>
                These details were set by the person who tagged you. Add your
                own notes and ranking below — they stay private to your side of
                the visit.
              </Text>

              {!isVisitInFuture && (
                <RankingSection
                  showHasRanking={Boolean(showContext?.hasRanking)}
                  showHasVisit={Boolean(showContext?.hasVisit)}
                  keepCurrentRanking={keepCurrentRanking}
                  setKeepCurrentRanking={setKeepCurrentRanking}
                  shouldShowRankingSection={shouldShowRankingSection}
                  selectedTier={selectedTier}
                  onChangeTier={resetRankingFlow}
                  isRankingsLoading={isRankingsLoading}
                  startTierRanking={startTierRanking}
                  rankingPhase={rankingPhase}
                  comparisonTarget={comparisonTarget}
                  showNameForHeader={visit.show?.name ?? ""}
                  showImageForHeader={visit.show?.images[0] ?? null}
                  onComparisonAnswer={handleComparisonAnswer}
                  onSkipComparison={handleSkipComparison}
                  canSkipComparison={canSkipComparison}
                  predictedResultIndex={predictedResultIndex}
                  rankedShowsForRanking={rankedShowsForRanking}
                  suggestedRanking={suggestedRanking}
                  onUseSuggestedRanking={handleUseSuggestedRanking}
                  onRefreshSuggestedRanking={refreshSuggestedRanking}
                />
              )}

              <NotesSection notes={notes} setNotes={setNotes} />

              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: c.accent },
                  busy !== null && styles.saveButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={busy !== null}
              >
                {busy === "accepting" ? (
                  <ActivityIndicator color={c.onAccent} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: c.onAccent }]}>
                    Accept visit
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={localStyles.declineButton}
                onPress={handleDecline}
                disabled={busy !== null}
              >
                {busy === "declining" ? (
                  <ActivityIndicator color={c.mutedText} />
                ) : (
                  <Text style={[localStyles.declineText, { color: c.mutedText }]}>
                    Decline tag
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  hero: {
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
  },
  heroImage: {
    width: 72,
    height: 108,
    borderRadius: 8,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  heroMeta: {
    fontSize: 13,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
  declineButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  declineText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
