import { useMemo, useReducer } from "react";

import { getInitialAddVisitFormState, hasUnsavedAddVisitChanges } from "@/features/add-visit/logic/form";
import type { AddVisitFormState, RankedTier } from "@/features/add-visit/types";
import type { Id } from "@/convex/_generated/dataModel";

type Action =
  | { type: "SET_QUERY"; value: string }
  | { type: "SET_SELECTED_SHOW_ID"; value: Id<"shows"> | null }
  | { type: "SET_CUSTOM_SHOW_NAME"; value: string | null }
  | { type: "SET_DATE"; value: string }
  | { type: "SET_SELECTED_PRODUCTION_ID"; value: Id<"productions"> | null }
  | { type: "SET_USE_OTHER_PRODUCTION"; value: boolean }
  | { type: "SET_CITY"; value: string }
  | { type: "SET_THEATRE"; value: string }
  | { type: "SET_SEAT"; value: string }
  | { type: "SET_NOTES"; value: string }
  | { type: "SET_IS_SAVING"; value: boolean }
  | { type: "SET_KEEP_CURRENT_RANKING"; value: boolean }
  | { type: "SET_SELECTED_TIER"; value: RankedTier | null }
  | { type: "SET_SEARCH_LOW"; value: number }
  | { type: "SET_SEARCH_HIGH"; value: number }
  | { type: "SET_RANKING_RESULT_INDEX"; value: number | null }
  | { type: "SKIP_COMPARISON_INDEX"; value: number }
  | { type: "RESET_SKIPPED_COMPARISONS" }
  | { type: "RESET_RANKING_FLOW" }
  | {
      type: "APPLY_SUGGESTED_RANKING";
      tier: RankedTier;
      insertionIndex: number;
    }
  | { type: "SELECT_EXISTING_SHOW"; showId: Id<"shows"> }
  | { type: "SELECT_CUSTOM_SHOW"; name: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "RESET_FORM" }
  | { type: "TOGGLE_TAGGED_USER"; userId: Id<"users"> };

function reducer(state: AddVisitFormState, action: Action): AddVisitFormState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.value };
    case "SET_SELECTED_SHOW_ID":
      return { ...state, selectedShowId: action.value };
    case "SET_CUSTOM_SHOW_NAME":
      return { ...state, customShowName: action.value };
    case "SET_DATE":
      return { ...state, date: action.value };
    case "SET_SELECTED_PRODUCTION_ID":
      return { ...state, selectedProductionId: action.value };
    case "SET_USE_OTHER_PRODUCTION":
      return { ...state, useOtherProduction: action.value };
    case "SET_CITY":
      return { ...state, city: action.value };
    case "SET_THEATRE":
      return { ...state, theatre: action.value };
    case "SET_SEAT":
      return { ...state, seat: action.value };
    case "SET_NOTES":
      return { ...state, notes: action.value };
    case "SET_IS_SAVING":
      return { ...state, isSaving: action.value };
    case "SET_KEEP_CURRENT_RANKING":
      return { ...state, keepCurrentRanking: action.value };
    case "SET_SELECTED_TIER":
      return { ...state, selectedTier: action.value };
    case "SET_SEARCH_LOW":
      return { ...state, searchLow: action.value };
    case "SET_SEARCH_HIGH":
      return { ...state, searchHigh: action.value };
    case "SET_RANKING_RESULT_INDEX":
      return { ...state, rankingResultIndex: action.value };
    case "SKIP_COMPARISON_INDEX":
      return state.skippedComparisonIndices.includes(action.value)
        ? state
        : { ...state, skippedComparisonIndices: [...state.skippedComparisonIndices, action.value] };
    case "RESET_SKIPPED_COMPARISONS":
      return state.skippedComparisonIndices.length === 0
        ? state
        : { ...state, skippedComparisonIndices: [] };
    case "RESET_RANKING_FLOW":
      return {
        ...state,
        selectedTier: null,
        searchLow: 0,
        searchHigh: 0,
        rankingResultIndex: null,
        skippedComparisonIndices: [],
      };
    case "APPLY_SUGGESTED_RANKING":
      return {
        ...state,
        selectedTier: action.tier,
        searchLow: 0,
        searchHigh: 0,
        rankingResultIndex: action.insertionIndex,
        skippedComparisonIndices: [],
      };
    case "SELECT_EXISTING_SHOW":
      return {
        ...state,
        selectedShowId: action.showId,
        customShowName: null,
        query: "",
        selectedProductionId: null,
        useOtherProduction: false,
        city: "",
        theatre: "",
        keepCurrentRanking: true,
        selectedTier: null,
        searchLow: 0,
        searchHigh: 0,
        rankingResultIndex: null,
        skippedComparisonIndices: [],
      };
    case "SELECT_CUSTOM_SHOW":
      return {
        ...state,
        customShowName: action.name,
        selectedShowId: null,
        query: "",
        selectedProductionId: null,
        useOtherProduction: true,
        city: "",
        theatre: "",
        keepCurrentRanking: false,
        selectedTier: null,
        searchLow: 0,
        searchHigh: 0,
        rankingResultIndex: null,
        skippedComparisonIndices: [],
      };
    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedShowId: null,
        customShowName: null,
        selectedProductionId: null,
        useOtherProduction: false,
        city: "",
        theatre: "",
        seat: "",
        notes: "",
        keepCurrentRanking: true,
        selectedTier: null,
        searchLow: 0,
        searchHigh: 0,
        rankingResultIndex: null,
        skippedComparisonIndices: [],
      };
    case "RESET_FORM":
      return getInitialAddVisitFormState();
    case "TOGGLE_TAGGED_USER": {
      const isTagged = state.taggedUserIds.includes(action.userId);
      return {
        ...state,
        taggedUserIds: isTagged
          ? state.taggedUserIds.filter((id) => id !== action.userId)
          : [...state.taggedUserIds, action.userId],
      };
    }
    default:
      return state;
  }
}

export function useAddVisitFormState() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialAddVisitFormState);
  const hasUnsavedChanges = useMemo(() => hasUnsavedAddVisitChanges(state), [state]);

  return {
    state,
    hasUnsavedChanges,
    setQuery: (value: string) => dispatch({ type: "SET_QUERY", value }),
    setSelectedShowId: (value: Id<"shows"> | null) => dispatch({ type: "SET_SELECTED_SHOW_ID", value }),
    setCustomShowName: (value: string | null) => dispatch({ type: "SET_CUSTOM_SHOW_NAME", value }),
    setDate: (value: string) => dispatch({ type: "SET_DATE", value }),
    setSelectedProductionId: (value: Id<"productions"> | null) =>
      dispatch({ type: "SET_SELECTED_PRODUCTION_ID", value }),
    setUseOtherProduction: (value: boolean) => dispatch({ type: "SET_USE_OTHER_PRODUCTION", value }),
    setCity: (value: string) => dispatch({ type: "SET_CITY", value }),
    setTheatre: (value: string) => dispatch({ type: "SET_THEATRE", value }),
    setSeat: (value: string) => dispatch({ type: "SET_SEAT", value }),
    setNotes: (value: string) => dispatch({ type: "SET_NOTES", value }),
    setIsSaving: (value: boolean) => dispatch({ type: "SET_IS_SAVING", value }),
    setKeepCurrentRanking: (value: boolean) => dispatch({ type: "SET_KEEP_CURRENT_RANKING", value }),
    setSelectedTier: (value: RankedTier | null) => dispatch({ type: "SET_SELECTED_TIER", value }),
    setSearchLow: (value: number) => dispatch({ type: "SET_SEARCH_LOW", value }),
    setSearchHigh: (value: number) => dispatch({ type: "SET_SEARCH_HIGH", value }),
    setRankingResultIndex: (value: number | null) => dispatch({ type: "SET_RANKING_RESULT_INDEX", value }),
    skipComparisonIndex: (value: number) => dispatch({ type: "SKIP_COMPARISON_INDEX", value }),
    resetSkippedComparisons: () => dispatch({ type: "RESET_SKIPPED_COMPARISONS" }),
    resetRankingFlow: () => dispatch({ type: "RESET_RANKING_FLOW" }),
    applySuggestedRanking: (tier: RankedTier, insertionIndex: number) =>
      dispatch({ type: "APPLY_SUGGESTED_RANKING", tier, insertionIndex }),
    selectExistingShow: (showId: Id<"shows">) => dispatch({ type: "SELECT_EXISTING_SHOW", showId }),
    selectCustomShow: (name: string) => dispatch({ type: "SELECT_CUSTOM_SHOW", name }),
    clearSelection: () => dispatch({ type: "CLEAR_SELECTION" }),
    resetForm: () => dispatch({ type: "RESET_FORM" }),
    toggleTaggedUser: (userId: Id<"users">) => dispatch({ type: "TOGGLE_TAGGED_USER", userId }),
  };
}
