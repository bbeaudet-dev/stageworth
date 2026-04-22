import { usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/Toast";
import { useCelebration } from "@/components/CelebrationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isFutureDate } from "@/utils/dates";
import { getProductionStatus } from "@/utils/productions";
import {
  getBottomInsertionIndexForTier,
  getInsertionIndexForTierAndRelative,
} from "@/features/add-visit/logic/ranking";
import { useAddVisitData } from "@/features/add-visit/hooks/useAddVisitData";
import { useAddVisitFormState } from "@/features/add-visit/hooks/useAddVisitFormState";
import { useAddVisitRankingFlow } from "@/features/add-visit/hooks/useAddVisitRankingFlow";
import { useSuggestedRanking } from "@/features/add-visit/hooks/useSuggestedRanking";
import { styles } from "@/features/add-visit/styles";
import { ShowPickerSection } from "@/features/add-visit/components/ShowPickerSection";
import { VisitDateSection } from "@/features/add-visit/components/VisitDateSection";
import { LocationSection } from "@/features/add-visit/components/LocationSection";
import { RankingSection } from "@/features/add-visit/components/RankingSection";
import { NotesSection } from "@/features/add-visit/components/NotesSection";
import { SeatSection } from "@/features/add-visit/components/SeatSection";
import { SaveVisitButton } from "@/features/add-visit/components/SaveVisitButton";
import { TagFriendsSection } from "@/features/add-visit/components/TagFriendsSection";

function routeParamString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && s.length > 0 ? s : undefined;
}

export default function AddVisitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showId?: string; showName?: string }>();
  const paramShowName = routeParamString(params.showName);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const allowRemoveRef = useRef(false);
  const { showToast } = useToast();
  const { celebrate } = useCelebration();
  const {
    state,
    hasUnsavedChanges,
    setQuery,
    setDate,
    setSelectedProductionId,
    setUseOtherProduction,
    setCity,
    setTheatre,
    setSeat,
    setNotes,
    setIsSaving,
    setKeepCurrentRanking,
    setSelectedTier,
    setSearchLow,
    setSearchHigh,
    setRankingResultIndex,
    skipComparisonIndex,
    resetSkippedComparisons,
    resetRankingFlow,
    applySuggestedRanking,
    selectExistingShow,
    selectCustomShow,
    clearSelection,
    toggleTaggedUser,
    addTaggedGuest,
    removeTaggedGuest,
  } = useAddVisitFormState();

  const selectExistingShowRef = useRef(selectExistingShow);
  selectExistingShowRef.current = selectExistingShow;

  useEffect(() => {
    const sid = routeParamString(params.showId);
    if (!sid) return;
    selectExistingShowRef.current(sid as Id<"shows">);
  }, [params.showId]);

  const {
    allShows,
    rankedShows,
    showContext,
    productions,
    productionOptions,
    selectedShow,
    userShowStatusById,
    visitedShowIds,
    searchResults,
    hasExactMatch,
    exactMatches,
    hasOfficialProductions,
    shouldForceOtherLocation,
    myFollowing,
    createVisit,
  } = useAddVisitData({
    query: state.query,
    selectedShowId: state.selectedShowId,
  });

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
    selectedShowId: state.selectedShowId,
    selectedShowType: selectedShow?.type,
    selectedTier: state.selectedTier,
    searchLow: state.searchLow,
    searchHigh: state.searchHigh,
    rankingResultIndex: state.rankingResultIndex,
    skippedComparisonIndices: state.skippedComparisonIndices,
  });

  const hasSelectedShow = state.selectedShowId !== null || state.customShowName !== null;
  const showNameForHeader =
    selectedShow?.name ?? state.customShowName ?? paramShowName ?? "";

  const selectedShowArt = useMemo(() => {
    if (!hasSelectedShow) return null;
    if (state.customShowName) {
      return { imageUrl: null as string | null, type: "other" as const };
    }
    if (state.selectedShowId) {
      return {
        imageUrl: selectedShow?.images?.[0] ?? null,
        type: selectedShow?.type,
      };
    }
    return null;
  }, [hasSelectedShow, state.customShowName, state.selectedShowId, selectedShow]);
  const isVisitInFuture = isFutureDate(state.date);
  const shouldShowRankingSection =
    hasSelectedShow &&
    !isVisitInFuture &&
    !(showContext?.hasRanking && state.keepCurrentRanking);

  useEffect(() => {
    if (shouldShowRankingSection) return;
    resetRankingFlow();
  }, [resetRankingFlow, shouldShowRankingSection]);

  const suggestedRankingTargetId =
    shouldShowRankingSection && !state.selectedTier ? state.selectedShowId : null;
  const { state: suggestedRanking, refresh: refreshSuggestedRanking } =
    useSuggestedRanking(suggestedRankingTargetId);

  const handleUseSuggestedRanking = () => {
    if (suggestedRanking.status !== "ready") return;
    const insertionIndex = getInsertionIndexForTierAndRelative(
      rankedShowsForRanking,
      suggestedRanking.tier,
      suggestedRanking.relativeIndex,
    );
    applySuggestedRanking(suggestedRanking.tier, insertionIndex);
  };

  useEffect(() => {
    if (!shouldForceOtherLocation) return;
    setUseOtherProduction(true);
    setSelectedProductionId(null);
  }, [setSelectedProductionId, setUseOtherProduction, shouldForceOtherLocation]);

  // Auto-select a production when available. Preference:
  //   1. Any currently-running production (open / open_run / in_previews)
  //   2. Otherwise the first listed production
  //   3. Skip entirely if every listed production is closed
  // Only runs when the user hasn't already chosen one or switched to "Other".
  const autoSelectedShowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.selectedShowId) return;
    if (state.selectedProductionId !== null) return;
    if (state.useOtherProduction) return;
    if (!productionOptions || productionOptions.length === 0) return;
    // Only auto-select once per selected show to avoid clobbering if the user
    // deselects a chip back to "nothing selected".
    if (autoSelectedShowIdRef.current === state.selectedShowId) return;

    const running = productionOptions.find((p) => {
      const status = getProductionStatus(p);
      return status === "open" || status === "open_run" || status === "in_previews";
    });
    const hasAnyNonClosed = productionOptions.some(
      (p) => getProductionStatus(p) !== "closed",
    );
    const pick = running ?? (hasAnyNonClosed ? productionOptions[0] : null);
    if (!pick) return;

    autoSelectedShowIdRef.current = state.selectedShowId;
    setSelectedProductionId(pick._id);
  }, [
    productionOptions,
    setSelectedProductionId,
    state.selectedProductionId,
    state.selectedShowId,
    state.useOtherProduction,
  ]);

  const startTierRanking = (tier: "loved" | "liked" | "okay" | "disliked") => {
    if (isRankingsLoading) return;
    const tierShowsInRange = rankedShowsForRanking.filter((show) => show.tier === tier);
    setSelectedTier(tier);
    setSearchLow(0);
    setSearchHigh(tierShowsInRange.length);
    if (tierShowsInRange.length === 0) {
      setRankingResultIndex(getBottomInsertionIndexForTier(rankedShowsForRanking, tier));
    } else {
      setRankingResultIndex(null);
    }
  };

  const handleComparisonAnswer = (prefersNewShow: boolean) => {
    if (comparisonIndex === null || !state.selectedTier) return;
    // Any answer advances the search window, so the per-step "skipped" set is
    // no longer meaningful and should be cleared.
    resetSkippedComparisons();
    if (prefersNewShow) {
      const nextHigh = comparisonIndex;
      setSearchHigh(nextHigh);
      if (state.searchLow >= nextHigh) {
        setRankingResultIndex(getInsertionIndexForRelative(state.selectedTier, state.searchLow));
      }
      return;
    }

    const nextLow = comparisonIndex + 1;
    setSearchLow(nextLow);
    if (nextLow >= state.searchHigh) {
      setRankingResultIndex(getInsertionIndexForRelative(state.selectedTier, nextLow));
    }
  };

  const handleSkipComparison = () => {
    if (comparisonIndex === null) return;
    skipComparisonIndex(comparisonIndex);
  };

  const handleSave = async () => {
    if (!hasSelectedShow || state.isSaving) return;
    setIsSaving(true);
    try {
      await createVisit({
        showId: state.selectedShowId ?? undefined,
        customShowName: state.customShowName ?? undefined,
        date: state.date,
        productionId:
          state.useOtherProduction || !state.selectedProductionId
            ? undefined
            : state.selectedProductionId,
        city: state.useOtherProduction ? state.city.trim() || undefined : undefined,
        theatre: state.useOtherProduction ? state.theatre.trim() || undefined : undefined,
        seat: state.seat.trim() || undefined,
        notes: state.notes.trim() || undefined,
        keepCurrentRanking: state.keepCurrentRanking,
        selectedTier: shouldShowRankingSection && state.selectedTier ? state.selectedTier : undefined,
        completedInsertionIndex:
          shouldShowRankingSection &&
          rankingPhase === "result" &&
          predictedResultIndex !== null
            ? predictedResultIndex
            : undefined,
        taggedUserIds: state.taggedUserIds.length > 0 ? state.taggedUserIds : undefined,
        taggedGuestNames:
          state.taggedGuestNames.length > 0 ? state.taggedGuestNames : undefined,
      });
      const isNewShow = state.customShowName !== null || !showContext?.hasVisit;
      const celebrationData = isNewShow
        ? {
            showName: selectedShow?.name ?? state.customShowName ?? "",
            imageUrl: selectedShow?.images?.[0] ?? null,
          }
        : null;
      allowRemoveRef.current = true;
      Keyboard.dismiss();
      router.back();
      if (celebrationData) {
        InteractionManager.runAfterInteractions(() => {
          celebrate(celebrationData);
        });
      } else {
        showToast({ message: "Visit saved!" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectCustomShowFromQuery = () => {
    const trimmed = state.query.trim();
    if (!trimmed) return;
    selectCustomShow(trimmed);
  };

  usePreventRemove(hasUnsavedChanges && !state.isSaving && !allowRemoveRef.current, (event) => {
    Alert.alert("Discard changes?", "You have unsaved Add Visit details.", [
      { text: "Keep working", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          allowRemoveRef.current = true;
          navigation.dispatch(event.data.action);
        },
      },
    ]);
  });

  const allShowsLoaded = allShows !== undefined;
  const theme = useColorScheme() ?? "light";
  const bg = Colors[theme].background;
  const text = Colors[theme].text;
  const accent = Colors[theme].accent;
  const border = Colors[theme].border;

  const searchableResults = useMemo(
    () =>
      searchResults as {
        _id: any;
        name: string;
        type: "musical" | "play" | "opera" | "dance" | "revue" | "comedy" | "magic" | "other";
      }[],
    [searchResults]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Text style={[styles.title, { color: text }]}>Add Visit</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[styles.closeText, { color: accent }]}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <ShowPickerSection
            hasSelectedShow={hasSelectedShow}
            showNameForHeader={showNameForHeader}
            selectedShowArt={selectedShowArt}
            clearSelection={clearSelection}
            query={state.query}
            setQuery={setQuery}
            searchResults={searchableResults}
            hasExactMatch={hasExactMatch}
            exactMatches={exactMatches as any}
            allShowsLoaded={allShowsLoaded}
            selectCustomShow={selectCustomShowFromQuery}
            selectExistingShow={selectExistingShow}
            userShowStatusById={userShowStatusById}
            visitedShowIds={visitedShowIds}
          />

          {hasSelectedShow && (
            <>
              <VisitDateSection date={state.date} setDate={setDate} />
              <LocationSection
                selectedShowId={state.selectedShowId}
                productions={productions as any}
                hasOfficialProductions={hasOfficialProductions}
                productionOptions={productionOptions as any}
                selectedProductionId={state.selectedProductionId}
                useOtherProduction={state.useOtherProduction}
                setSelectedProductionId={setSelectedProductionId}
                setUseOtherProduction={setUseOtherProduction}
                city={state.city}
                setCity={setCity}
                theatre={state.theatre}
                setTheatre={setTheatre}
              />
              {!isVisitInFuture && (
                <RankingSection
                  showHasRanking={Boolean(showContext?.hasRanking)}
                  showHasVisit={Boolean(showContext?.hasVisit)}
                  keepCurrentRanking={state.keepCurrentRanking}
                  setKeepCurrentRanking={setKeepCurrentRanking}
                  shouldShowRankingSection={shouldShowRankingSection}
                  selectedTier={state.selectedTier}
                  onChangeTier={resetRankingFlow}
                  isRankingsLoading={isRankingsLoading}
                  startTierRanking={startTierRanking}
                  rankingPhase={rankingPhase}
                  comparisonTarget={comparisonTarget}
                  showNameForHeader={showNameForHeader}
                  showImageForHeader={selectedShowArt?.imageUrl ?? null}
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
              <SeatSection seat={state.seat} setSeat={setSeat} />
              <NotesSection notes={state.notes} setNotes={setNotes} />
              <TagFriendsSection
                following={myFollowing}
                taggedUserIds={state.taggedUserIds}
                onToggle={toggleTaggedUser}
                guestNames={state.taggedGuestNames}
                onAddGuest={addTaggedGuest}
                onRemoveGuest={removeTaggedGuest}
              />
              <SaveVisitButton isSaving={state.isSaving} onSave={handleSave} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
