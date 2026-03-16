import type { AddVisitFormState } from "@/features/add-visit/types";

export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getInitialAddVisitFormState(): AddVisitFormState {
  return {
    query: "",
    selectedShowId: null,
    customShowName: null,
    date: getTodayIsoDate(),
    selectedProductionId: null,
    useOtherProduction: false,
    city: "",
    theatre: "",
    notes: "",
    isSaving: false,
    keepCurrentRanking: true,
    selectedTier: null,
    searchLow: 0,
    searchHigh: 0,
    rankingResultIndex: null,
  };
}

export function hasUnsavedAddVisitChanges(state: AddVisitFormState) {
  return (
    state.query.trim().length > 0 ||
    state.selectedShowId !== null ||
    state.customShowName !== null ||
    state.date !== getTodayIsoDate() ||
    state.selectedProductionId !== null ||
    state.useOtherProduction ||
    state.city.trim().length > 0 ||
    state.theatre.trim().length > 0 ||
    state.notes.trim().length > 0 ||
    state.keepCurrentRanking !== true ||
    state.selectedTier !== null ||
    state.searchLow !== 0 ||
    state.searchHigh !== 0 ||
    state.rankingResultIndex !== null
  );
}
