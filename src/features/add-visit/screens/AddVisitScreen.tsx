import { useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getBottomInsertionIndexForTier } from "@/features/add-visit/logic/ranking";
import { getTodayIsoDate } from "@/features/add-visit/logic/form";
import { useAddVisitData } from "@/features/add-visit/hooks/useAddVisitData";
import { useAddVisitFormState } from "@/features/add-visit/hooks/useAddVisitFormState";
import { useAddVisitRankingFlow } from "@/features/add-visit/hooks/useAddVisitRankingFlow";
import { styles } from "@/features/add-visit/styles";
import { ShowPickerSection } from "@/features/add-visit/components/ShowPickerSection";
import { VisitDateSection } from "@/features/add-visit/components/VisitDateSection";
import { LocationSection } from "@/features/add-visit/components/LocationSection";
import { RankingSection } from "@/features/add-visit/components/RankingSection";
import { NotesSection } from "@/features/add-visit/components/NotesSection";
import { SaveVisitButton } from "@/features/add-visit/components/SaveVisitButton";

export default function AddVisitScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const allowRemoveRef = useRef(false);
  const {
    state,
    hasUnsavedChanges,
    setQuery,
    setDate,
    setSelectedProductionId,
    setUseOtherProduction,
    setCity,
    setTheatre,
    setNotes,
    setIsSaving,
    setKeepCurrentRanking,
    setSelectedTier,
    setSearchLow,
    setSearchHigh,
    setRankingResultIndex,
    resetRankingFlow,
    selectExistingShow,
    selectCustomShow,
    clearSelection,
  } = useAddVisitFormState();

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
    createVisit,
  } = useAddVisitData({
    query: state.query,
    selectedShowId: state.selectedShowId,
  });

  const {
    isRankingsLoading,
    rankedShowsForRanking,
    comparisonMidIndex,
    comparisonTarget,
    predictedResultIndex,
    rankingPhase,
    getInsertionIndexForRelative,
  } = useAddVisitRankingFlow({
    rankedShows,
    selectedShowId: state.selectedShowId,
    selectedTier: state.selectedTier,
    searchLow: state.searchLow,
    searchHigh: state.searchHigh,
    rankingResultIndex: state.rankingResultIndex,
  });

  const hasSelectedShow = state.selectedShowId !== null || state.customShowName !== null;
  const showNameForHeader = selectedShow?.name ?? state.customShowName ?? "";
  const shouldShowRankingSection = hasSelectedShow && !(showContext?.hasRanking && state.keepCurrentRanking);

  useEffect(() => {
    if (shouldShowRankingSection) return;
    resetRankingFlow();
  }, [resetRankingFlow, shouldShowRankingSection]);

  useEffect(() => {
    if (!shouldForceOtherLocation) return;
    setUseOtherProduction(true);
    setSelectedProductionId(null);
  }, [setSelectedProductionId, setUseOtherProduction, shouldForceOtherLocation]);

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
    if (comparisonMidIndex === null || !state.selectedTier) return;
    if (prefersNewShow) {
      const nextHigh = comparisonMidIndex;
      setSearchHigh(nextHigh);
      if (state.searchLow >= nextHigh) {
        setRankingResultIndex(getInsertionIndexForRelative(state.selectedTier, state.searchLow));
      }
      return;
    }

    const nextLow = comparisonMidIndex + 1;
    setSearchLow(nextLow);
    if (nextLow >= state.searchHigh) {
      setRankingResultIndex(getInsertionIndexForRelative(state.selectedTier, nextLow));
    }
  };

  const handleSave = async () => {
    if (!hasSelectedShow || state.isSaving) return;
    setIsSaving(true);
    try {
      await createVisit({
        showId: state.selectedShowId ?? undefined,
        customShowName: state.customShowName ?? undefined,
        date: state.date.trim() || getTodayIsoDate(),
        productionId:
          state.useOtherProduction || !state.selectedProductionId
            ? undefined
            : state.selectedProductionId,
        city: state.useOtherProduction ? state.city.trim() || undefined : undefined,
        theatre: state.useOtherProduction ? state.theatre.trim() || undefined : undefined,
        notes: state.notes.trim() || undefined,
        keepCurrentRanking: state.keepCurrentRanking,
        selectedTier: shouldShowRankingSection && state.selectedTier ? state.selectedTier : undefined,
        completedInsertionIndex:
          shouldShowRankingSection &&
          rankingPhase === "result" &&
          predictedResultIndex !== null
            ? predictedResultIndex
            : undefined,
      });
      allowRemoveRef.current = true;
      router.replace("/(tabs)");
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

  const searchableResults = useMemo(
    () =>
      searchResults as {
        _id: any;
        name: string;
        type: "musical" | "play" | "opera" | "dance" | "other";
      }[],
    [searchResults]
  );

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
          <ShowPickerSection
            hasSelectedShow={hasSelectedShow}
            showNameForHeader={showNameForHeader}
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
                onComparisonAnswer={handleComparisonAnswer}
                predictedResultIndex={predictedResultIndex}
                rankedShowsForRanking={rankedShowsForRanking}
              />
              <NotesSection notes={state.notes} setNotes={setNotes} />
              <SaveVisitButton isSaving={state.isSaving} onSave={handleSave} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
