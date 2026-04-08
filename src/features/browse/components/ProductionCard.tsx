import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  closingStripBadge,
  fullStatusBadgeForProduction,
  type FullStatusBadge,
} from "@/features/browse/logic/closingStrip";
import { playbillMatBackground, styles } from "@/features/browse/styles";
import type { ProductionWithShow } from "@/features/browse/types";
import { getProductionStatus } from "@/utils/productions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { SmartShowImage } from "@/components/SmartShowImage";

export type { FullStatusBadge };

/** Status badges for the Search "Coming Soon" rail and grid (shared full-status + in-previews strip). */
export function railBadgeForProduction(
  production: {
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
  },
  isDark: boolean,
  todayStr: string
): FullStatusBadge | null {
  const status = getProductionStatus(production, todayStr);
  return fullStatusBadgeForProduction(production, status, todayStr, isDark);
}

/** Closing badge for the Search "Closing Soon" rail and grid (matches trip playbill strip copy). */
export function railBadgeForClosingSoon(
  production: { closingDate?: string | null | undefined },
  isDark: boolean,
  todayStr: string
): FullStatusBadge | null {
  const b = closingStripBadge(production.closingDate, todayStr, isDark);
  return b ? { primary: { label: b.label, bg: b.bg, text: b.text } } : null;
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
        <View style={badgeResult.secondary ? local.badgeOverlay : undefined}>
          {badgeResult.secondary ? (
            <View style={[local.badgeStrip, local.secondaryBadgeStrip, { backgroundColor: badgeResult.secondary.bg }]}>
              <Text style={[local.badgeText, { color: badgeResult.secondary.text }]}>{badgeResult.secondary.label}</Text>
            </View>
          ) : null}
          <View style={[local.badgeStrip, { backgroundColor: badgeResult.primary.bg }]}>
            <Text style={[local.badgeText, { color: badgeResult.primary.text }]}>{badgeResult.primary.label}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const local = StyleSheet.create({
  /** Absolutely-positioned wrapper so secondary+primary overlay the image bottom. */
  badgeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
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
