/**
 * Shared show-type colour and label definitions.
 *
 * Single source of truth for every place that needs to display a type label,
 * an accent colour (text/icon), or a chip/badge background for a show type:
 *   - ShowDetailScreen type chip
 *   - TheatreCloud show-tile overlays
 *   - Add Visit show picker row labels
 *   - Any future show-type badge
 *
 * Adding a new show type? Add one entry here — nowhere else.
 */

import type { ShowType } from "@/features/add-visit/types";

export type ShowTypeColorEntry = {
  /** Display label used in chips, badges, and pickers. */
  label: string;
  /** Accent colour for text/icon on a neutral surface. */
  accent: {
    light: string;
    dark: string;
  };
  /**
   * Background colour for the pill/chip that wraps the label.
   * Text colour for the chip should use `accent`.
   */
  chipBg: {
    light: string;
    dark: string;
  };
};

export const SHOW_TYPE_COLORS: Record<ShowType, ShowTypeColorEntry> = {
  musical: {
    label: "Musical",
    accent: { light: "#E65100", dark: "#FFB74D" },
    chipBg: { light: "#FFF3E0", dark: "rgba(230,81,0,0.18)" },
  },
  play: {
    label: "Play",
    accent: { light: "#1B5E20", dark: "#81C784" },
    chipBg: { light: "#E8F5E9", dark: "rgba(27,94,32,0.2)" },
  },
  opera: {
    label: "Opera",
    accent: { light: "#4A148C", dark: "#CE93D8" },
    chipBg: { light: "#EDE7F6", dark: "rgba(74,20,140,0.2)" },
  },
  dance: {
    label: "Dance",
    accent: { light: "#880E4F", dark: "#F48FB1" },
    chipBg: { light: "#FCE4EC", dark: "rgba(136,14,79,0.2)" },
  },
  revue: {
    label: "Revue",
    accent: { light: "#0277BD", dark: "#4FC3F7" },
    chipBg: { light: "#E1F5FE", dark: "rgba(2,119,189,0.2)" },
  },
  comedy: {
    label: "Comedy",
    accent: { light: "#F57F17", dark: "#FFCC02" },
    chipBg: { light: "#FFFDE7", dark: "rgba(245,127,23,0.18)" },
  },
  magic: {
    label: "Magic",
    accent: { light: "#6A1B9A", dark: "#BA68C8" },
    chipBg: { light: "#F3E5F5", dark: "rgba(106,27,154,0.2)" },
  },
  other: {
    label: "Other",
    accent: { light: "#37474F", dark: "#B0BEC5" },
    chipBg: { light: "#ECEFF1", dark: "rgba(55,71,79,0.2)" },
  },
};

function resolveEntry(type: string | undefined | null): ShowTypeColorEntry {
  return (type ? SHOW_TYPE_COLORS[type as ShowType] : undefined) ?? SHOW_TYPE_COLORS.other;
}

/** Convenience: label for a type string, falling back to "Other". */
export function showTypeLabel(type: string | undefined | null): string {
  return resolveEntry(type).label;
}

/**
 * Convenience: accent colour for a type string on the given colour scheme,
 * falling back to the "other" entry.
 */
export function showTypeAccent(
  type: string | undefined | null,
  scheme: "light" | "dark"
): string {
  return resolveEntry(type).accent[scheme];
}

/**
 * Convenience: chip colours (background + text) for the given colour scheme.
 */
export function showTypeChip(
  type: string | undefined | null,
  scheme: "light" | "dark"
): { bg: string; text: string } {
  const entry = resolveEntry(type);
  return { bg: entry.chipBg[scheme], text: entry.accent[scheme] };
}
