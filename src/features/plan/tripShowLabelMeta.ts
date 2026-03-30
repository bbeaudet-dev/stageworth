import type { IconSymbolName } from "@/components/ui/icon-symbol";

export type TripShowLabel =
  | "must_see"
  | "want_see"
  | "indifferent"
  | "dont_know"
  | "dont_want";

export const TRIP_SHOW_LABEL_OPTIONS: TripShowLabel[] = [
  "must_see",
  "want_see",
  "indifferent",
  "dont_know",
  "dont_want",
];

export function tripShowLabelMeta(label: TripShowLabel): {
  title: string;
  shortTitle: string;
  icon: IconSymbolName;
  color: string;
} {
  switch (label) {
    case "must_see":
      return {
        title: "Must see",
        shortTitle: "Must see",
        icon: "exclamationmark.2",
        color: "#EF4444",
      };
    case "want_see":
      return {
        title: "Want to see",
        shortTitle: "Want",
        icon: "hand.thumbsup.fill",
        color: "#16A34A",
      };
    case "indifferent":
      return {
        title: "Indifferent",
        shortTitle: "Indifferent",
        icon: "minus.circle",
        color: "#737373",
      };
    case "dont_know":
      return {
        title: "Don't know",
        shortTitle: "Unsure",
        icon: "questionmark.circle.fill",
        color: "#60A5FA",
      };
    case "dont_want":
      return {
        title: "No thanks",
        shortTitle: "Pass",
        icon: "hand.thumbsdown.fill",
        color: "#FB923C",
      };
  }
}
