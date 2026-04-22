import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { playbillMatBackground } from "@/features/browse/styles";
import { daysUntil, earliestFutureRunDate, formatDate } from "@/features/browse/logic/date";
import { getProductionStatus, type ProductionStatus } from "@/utils/productions";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ColorScheme = "light" | "dark";

function districtLabel(d: string): string {
  const map: Record<string, string> = {
    broadway: "Broadway",
    off_broadway: "Off-Broadway",
    off_off_broadway: "Off-Off-Broadway",
    west_end: "West End",
    touring: "Touring",
    regional: "Regional",
    other: "Other",
  };
  return map[d] ?? d;
}

function productionStatusLine(
  p: { previewDate?: string; openingDate?: string; closingDate?: string; isOpenRun?: boolean | null },
  status: ProductionStatus,
  todayStr: string
): string {
  if (status === "closed") {
    const c = formatDate(p.closingDate);
    return c ? `Closed ${c}` : "Closed";
  }
  if (p.closingDate) {
    const c = formatDate(p.closingDate);
    if (c) {
      const d = daysUntil(p.closingDate);
      if (d === 0) return "Closes today";
      if (d === 1) return "Closes tomorrow";
      return `Closes ${c}`;
    }
  }
  switch (status) {
    case "announced": {
      const m = earliestFutureRunDate(p.previewDate, p.openingDate, todayStr);
      if (!m) return "Announced";
      const formatted = formatDate(m);
      if (!formatted) return "Announced";
      if (p.previewDate === m) return `Previews ${formatted}`;
      return `Opens ${formatted}`;
    }
    case "in_previews": {
      const parts: string[] = ["In previews"];
      if (p.openingDate && p.openingDate >= todayStr) {
        const o = formatDate(p.openingDate);
        if (o) parts.push(`opens ${o}`);
      }
      return parts.join(" · ");
    }
    case "open_run": return "Open run";
    case "open": return "Running";
    default: return "";
  }
}

interface Production {
  _id: string;
  theatre?: string;
  city?: string | null;
  district: string;
  posterUrl?: string | null;
  previewDate?: string;
  openingDate?: string;
  closingDate?: string;
  isOpenRun?: boolean | null;
}

interface ProductionsRailProps {
  productions: Production[] | undefined;
  todayStr: string;
}

export function ProductionsRail({ productions, todayStr }: ProductionsRailProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const router = useRouter();

  if (productions !== undefined && productions.length === 0) return null;

  return (
    <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
      <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Productions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.prodRailContent}
      >
        {productions === undefined ? (
          [0, 1, 2].map((i) => (
            <View key={i} style={[styles.prodCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.prodThumb, { backgroundColor: c.border }]} />
              <View style={[styles.prodInfo, { gap: 6 }]}>
                <View style={[styles.prodSkeletonLine, { backgroundColor: c.border, width: 90 }]} />
                <View style={[styles.prodSkeletonLine, { backgroundColor: c.border, width: 70 }]} />
                <View style={[styles.prodSkeletonLine, { backgroundColor: c.border, width: 80 }]} />
              </View>
            </View>
          ))
        ) : (
          productions.map((p) => {
            const status = getProductionStatus(p, todayStr);
            const isActive = status !== "closed";
            const statusLine = productionStatusLine(p, status, todayStr);
            const warmClosing = isActive && Boolean(p.closingDate) && statusLine.startsWith("Closes");
            const locationLine = [p.city, districtLabel(p.district)].filter(Boolean).join(" · ");
            return (
              <Pressable
                key={p._id}
                onPress={() =>
                  router.push({
                    pathname: "/production/[productionId]",
                    params: { productionId: String(p._id) },
                  })
                }
                style={({ pressed }) => [
                  styles.prodCard,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open production details${p.theatre ? ` at ${p.theatre}` : ""}`}
              >
                {p.posterUrl ? (
                  <Image
                    source={{ uri: p.posterUrl }}
                    style={[styles.prodThumb, { backgroundColor: playbillMatBackground(theme as ColorScheme) }]}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.prodThumb, { backgroundColor: c.border }]} />
                )}
                <View style={styles.prodInfo}>
                  {p.theatre ? <Text style={[styles.prodVenue, { color: c.text }]} numberOfLines={1}>{p.theatre}</Text> : null}
                  {locationLine ? (
                    <Text style={[styles.prodMeta, { color: c.mutedText }]} numberOfLines={1}>{locationLine}</Text>
                  ) : null}
                  <Text
                    style={[styles.prodMeta, { color: warmClosing ? "#E65100" : c.mutedText }]}
                    numberOfLines={1}
                  >
                    {statusLine}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  prodRailContent: { paddingHorizontal: 10, paddingBottom: 12, paddingTop: 2, flexDirection: "row", gap: 8 },
  prodCard: { width: 210, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 8 },
  prodThumb: { width: 44, height: 62, borderRadius: 5, flexShrink: 0 },
  prodInfo: { flex: 1, gap: 3, overflow: "hidden" },
  prodSkeletonLine: { height: 10, borderRadius: 5 },
  prodVenue: { fontSize: 13, fontWeight: "700" },
  prodMeta: { fontSize: 11 },
});
