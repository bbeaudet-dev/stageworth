import { useReducer, useMemo } from "react";

import type { Id } from "@/convex/_generated/dataModel";

export type EditVisitFormState = {
  date: string;
  selectedProductionId: Id<"productions"> | null;
  useOtherProduction: boolean;
  city: string;
  theatre: string;
  seat: string;
  notes: string;
  isSaving: boolean;
  taggedUserIds: Id<"users">[];
  taggedGuestNames: string[];
};

type InitialValues = {
  date: string;
  productionId?: Id<"productions"> | null;
  city?: string | null;
  theatre?: string | null;
  seat?: string | null;
  notes?: string | null;
  taggedUserIds?: Id<"users">[] | null;
  taggedGuestNames?: string[] | null;
};

function buildInitialState(initial: InitialValues): EditVisitFormState {
  return {
    date: initial.date,
    selectedProductionId: initial.productionId ?? null,
    useOtherProduction: !initial.productionId,
    city: initial.city ?? "",
    theatre: initial.theatre ?? "",
    seat: initial.seat ?? "",
    notes: initial.notes ?? "",
    isSaving: false,
    taggedUserIds: initial.taggedUserIds ?? [],
    taggedGuestNames: initial.taggedGuestNames ?? [],
  };
}

type Action =
  | { type: "SET_DATE"; value: string }
  | { type: "SET_SELECTED_PRODUCTION_ID"; value: Id<"productions"> | null }
  | { type: "SET_USE_OTHER_PRODUCTION"; value: boolean }
  | { type: "SET_CITY"; value: string }
  | { type: "SET_THEATRE"; value: string }
  | { type: "SET_SEAT"; value: string }
  | { type: "SET_NOTES"; value: string }
  | { type: "SET_IS_SAVING"; value: boolean }
  | { type: "TOGGLE_TAGGED_USER"; userId: Id<"users"> }
  | { type: "ADD_TAGGED_GUEST"; name: string }
  | { type: "REMOVE_TAGGED_GUEST"; name: string }
  | { type: "REINITIALIZE"; initial: InitialValues };

function reducer(state: EditVisitFormState, action: Action): EditVisitFormState {
  switch (action.type) {
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
    case "TOGGLE_TAGGED_USER": {
      const isTagged = state.taggedUserIds.includes(action.userId);
      return {
        ...state,
        taggedUserIds: isTagged
          ? state.taggedUserIds.filter((id) => id !== action.userId)
          : [...state.taggedUserIds, action.userId],
      };
    }
    case "ADD_TAGGED_GUEST": {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      const exists = state.taggedGuestNames.some(
        (n) => n.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return state;
      return { ...state, taggedGuestNames: [...state.taggedGuestNames, trimmed] };
    }
    case "REMOVE_TAGGED_GUEST":
      return {
        ...state,
        taggedGuestNames: state.taggedGuestNames.filter((n) => n !== action.name),
      };
    case "REINITIALIZE":
      return buildInitialState(action.initial);
    default:
      return state;
  }
}

export function useEditVisitFormState(initial: InitialValues) {
  const [state, dispatch] = useReducer(reducer, initial, buildInitialState);

  const reinitialize = useMemo(
    () => (values: InitialValues) => dispatch({ type: "REINITIALIZE", initial: values }),
    []
  );

  return {
    state,
    reinitialize,
    setDate: (value: string) => dispatch({ type: "SET_DATE", value }),
    setSelectedProductionId: (value: Id<"productions"> | null) =>
      dispatch({ type: "SET_SELECTED_PRODUCTION_ID", value }),
    setUseOtherProduction: (value: boolean) =>
      dispatch({ type: "SET_USE_OTHER_PRODUCTION", value }),
    setCity: (value: string) => dispatch({ type: "SET_CITY", value }),
    setTheatre: (value: string) => dispatch({ type: "SET_THEATRE", value }),
    setSeat: (value: string) => dispatch({ type: "SET_SEAT", value }),
    setNotes: (value: string) => dispatch({ type: "SET_NOTES", value }),
    setIsSaving: (value: boolean) => dispatch({ type: "SET_IS_SAVING", value }),
    toggleTaggedUser: (userId: Id<"users">) =>
      dispatch({ type: "TOGGLE_TAGGED_USER", userId }),
    addTaggedGuest: (name: string) => dispatch({ type: "ADD_TAGGED_GUEST", name }),
    removeTaggedGuest: (name: string) =>
      dispatch({ type: "REMOVE_TAGGED_GUEST", name }),
  };
}
