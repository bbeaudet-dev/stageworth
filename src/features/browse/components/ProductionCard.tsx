import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  closingStripBadge,
  fullStatusBadgeForProduction,
  openingSoonPlaybillColors,
} from "@/features/browse/logic/closingStrip";
import {
  daysUntil,
  earliestFutureRunDate,
  openingMilestoneLabel,
} from "@/features/browse/logic/date";
import { playbillMatBackground, styles } from "@/features/browse/styles";
import type { ProductionWithShow } from "@/features/browse/types";
import { getProductionStatus } from "@/utils/productions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";

type BadgeConfig = { label: string; bg: string; text: string };

/** Opening / preview badge for the Search "Coming Soon" rail and grid. */
export function railBadgeForProduction(
  production: {
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
  },
  isDark: boolean,
  todayStr: string
): BadgeConfig | null {
  const milestone = earliestFutureRunDate(
    production.previewDate,
    production.openingDate,
    todayStr
  );
  if (milestone) {
    const d = daysUntil(milestone);
    if (d >= 0) {
      const { bg, text } = openingSoonPlaybillColors(isDark);
      return { label: openingMilestoneLabel(milestone), bg, text };
    }
  }
  return null;
}

/** Closing badge for the Search "Closing Soon" rail and grid (matches trip playbill strip copy). */
export function railBadgeForClosingSoon(
  production: { closingDate?: string | null | undefined },
  isDark: boolean,
  todayStr: string
): BadgeConfig | null {
  const b = closingStripBadge(production.closingDate, todayStr, isDark);
  return b ? { label: b.label, bg: b.bg, text: b.text } : null;
}

export function ProductionCard({
  production,
  onPress,
}: {
  production: ProductionWithShow;
  onPress: () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const status = getProductionStatus(production, todayStr);
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];
  const badgeResult = fullStatusBadgeForProduction(production, status, todayStr, isDark);
  const show = production.show;
  const image = production.posterUrl ?? show?.images?.[0];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <Pressable
      style={[styles.playbillCard, { backgroundColor: c.surfaceElevated }]}
      onPress={onPress}
    >
      {image && !imageFailed ? (
        <SmartShowImage
          key={image}
          uri={image}
          style={styles.playbillImage}
          matBackground={playbillMatBackground(isDark ? "dark" : "light")}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <ShowPlaceholder name={show?.name ?? ""} type={show?.type} />
      )}
      {production.ticketmasterEventUrl && image ? (
        <View style={local.attributionRow}>
          <Text style={[local.attributionText, { color: c.mutedText }]}>
            via Ticketmaster
          </Text>
        </View>
      ) : null}
      {badgeResult ? (
        <>
          {badgeResult.secondary ? (
            <View style={[local.badgeStrip, local.secondaryBadgeStrip, { backgroundColor: badgeResult.secondary.bg }]}>
              <Text style={[local.badgeText, { color: badgeResult.secondary.text }]}>{badgeResult.secondary.label}</Text>
            </View>
          ) : null}
          <View style={[local.badgeStrip, { backgroundColor: badgeResult.primary.bg }]}>
            <Text style={[local.badgeText, { color: badgeResult.primary.text }]}>{badgeResult.primary.label}</Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const local = StyleSheet.create({
  badgeStrip: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  secondaryBadgeStrip: {
    opacity: 0.85,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
  attributionRow: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  attributionText: {
    fontSize: 7,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
});
