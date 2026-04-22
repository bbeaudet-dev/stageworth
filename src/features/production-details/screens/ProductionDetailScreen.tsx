import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DetailCard, detailCardStyles } from "@/components/detail-card";
import { NotesText } from "@/components/NotesText";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { playbillMatBackground } from "@/features/browse/styles";
import { formatDate } from "@/features/browse/logic/date";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getProductionStatus, type ProductionStatus } from "@/utils/productions";

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

function productionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    original: "Original production",
    revival: "Revival",
    transfer: "Transfer",
    touring: "Touring production",
    concert: "Concert",
    workshop: "Workshop",
    other: "Other",
  };
  return map[t] ?? t;
}

function statusBadge(status: ProductionStatus): { label: string; tone: "neutral" | "accent" | "warn" | "muted" } {
  switch (status) {
    case "open":
      return { label: "Now Playing", tone: "accent" };
    case "open_run":
      return { label: "Open Run", tone: "accent" };
    case "in_previews":
      return { label: "In Previews", tone: "warn" };
    case "announced":
      return { label: "Upcoming", tone: "neutral" };
    case "closed":
      return { label: "Closed", tone: "muted" };
  }
}

function formatRunningTime(minutes?: number, intermissions?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  const base = parts.join(" ");
  if (intermissions === 0) return `${base} · no intermission`;
  if (intermissions === 1) return `${base} · 1 intermission`;
  if (intermissions && intermissions > 1) return `${base} · ${intermissions} intermissions`;
  return base;
}

export default function ProductionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productionId?: string }>();
  const productionId = params.productionId ?? "";
  const production = useQuery(
    api.productions.getById,
    productionId ? { id: productionId as Id<"productions"> } : "skip",
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const renderStatusBadge = (status: ProductionStatus) => {
    const { label, tone } = statusBadge(status);
    const toneColors = {
      accent: { bg: c.accent, fg: "#ffffff" },
      warn: { bg: "#E65100", fg: "#ffffff" },
      neutral: { bg: c.surfaceElevated, fg: c.text },
      muted: { bg: c.surface, fg: c.mutedText },
    } as const;
    const palette = toneColors[tone];
    return (
      <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: c.border }]}>
        <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Production",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {production === undefined ? null : production === null ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: c.mutedText }]}>Production not found.</Text>
        </View>
      ) : (
        (() => {
          const status = getProductionStatus(production);
          const poster = production.posterUrl ?? production.show.images[0] ?? null;
          const showName = production.show.name;
          const runningTime = formatRunningTime(
            production.runningTime,
            production.intermissionCount,
          );
          const hasPreviewWindow =
            !!production.previewDate && !!production.openingDate;
          const previewWindow = hasPreviewWindow
            ? `${formatDate(production.previewDate) ?? "?"} → ${formatDate(production.openingDate) ?? "?"}`
            : null;
          const closingLabel = production.closingDate
            ? formatDate(production.closingDate)
            : production.isOpenRun
              ? "Open run"
              : production.isClosed
                ? "Closed"
                : null;

          return (
            <ScrollView contentContainerStyle={styles.content}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/show/[showId]",
                    params: { showId: String(production.showId) },
                  })
                }
                style={({ pressed }) => [
                  styles.hero,
                  {
                    backgroundColor: playbillMatBackground(theme),
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.heroPosterWrap}>
                  {poster ? (
                    <Image
                      source={{ uri: poster }}
                      style={styles.heroPoster}
                      contentFit="contain"
                    />
                  ) : (
                    <ShowPlaceholder
                      name={showName}
                      style={{ width: 72, height: 108, aspectRatio: undefined }}
                    />
                  )}
                </View>
                <View style={styles.heroText}>
                  <Text style={[styles.heroTitle, { color: c.text }]} numberOfLines={2}>
                    {showName}
                  </Text>
                  <Text style={[styles.heroSubtitle, { color: c.mutedText }]} numberOfLines={1}>
                    {productionTypeLabel(production.productionType)}
                  </Text>
                  <View style={styles.badgeRow}>{renderStatusBadge(status)}</View>
                </View>
              </Pressable>

              <DetailCard title="Theatre">
                {production.venueId ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/venue/[venueId]",
                        params: { venueId: String(production.venueId) },
                      })
                    }
                    accessibilityRole="link"
                    accessibilityLabel={`Open venue ${production.theatre ?? ""}`}
                  >
                    <Text
                      style={[
                        detailCardStyles.value,
                        styles.link,
                        { color: c.accent },
                      ]}
                      numberOfLines={2}
                    >
                      {production.theatre ?? "Venue"}
                    </Text>
                    {production.city ? (
                      <Text style={[detailCardStyles.subtle, { color: c.mutedText }]}>
                        {production.city}
                      </Text>
                    ) : null}
                  </Pressable>
                ) : (
                  <>
                    <Text style={[detailCardStyles.value, { color: c.text }]} numberOfLines={2}>
                      {production.theatre ?? "—"}
                    </Text>
                    {production.city ? (
                      <Text style={[detailCardStyles.subtle, { color: c.mutedText }]}>
                        {production.city}
                      </Text>
                    ) : null}
                  </>
                )}
              </DetailCard>

              <DetailCard title="District">
                <Text style={[detailCardStyles.value, { color: c.text }]}>
                  {districtLabel(production.district)}
                </Text>
              </DetailCard>

              {previewWindow ? (
                <DetailCard title="Previews">
                  <Text style={[detailCardStyles.value, { color: c.text }]}>
                    {previewWindow}
                  </Text>
                </DetailCard>
              ) : production.previewDate ? (
                <DetailCard title="First preview">
                  <Text style={[detailCardStyles.value, { color: c.text }]}>
                    {formatDate(production.previewDate)}
                  </Text>
                </DetailCard>
              ) : null}

              {production.openingDate ? (
                <DetailCard title="Opening">
                  <Text style={[detailCardStyles.value, { color: c.text }]}>
                    {formatDate(production.openingDate)}
                  </Text>
                </DetailCard>
              ) : null}

              {closingLabel ? (
                <DetailCard title="Closing">
                  <Text style={[detailCardStyles.value, { color: c.text }]}>
                    {closingLabel}
                  </Text>
                </DetailCard>
              ) : null}

              {runningTime ? (
                <DetailCard title="Running time">
                  <Text style={[detailCardStyles.value, { color: c.text }]}>
                    {runningTime}
                  </Text>
                </DetailCard>
              ) : null}

              {production.description ? (
                <DetailCard title="About this production">
                  <NotesText
                    text={production.description}
                    style={detailCardStyles.subtle}
                    color={c.mutedText}
                  />
                </DetailCard>
              ) : null}

              {production.notes ? (
                <DetailCard title="Notes">
                  <NotesText
                    text={production.notes}
                    style={detailCardStyles.subtle}
                    color={c.mutedText}
                  />
                </DetailCard>
              ) : null}
            </ScrollView>
          );
        })()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 15 },
  hero: {
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
  },
  heroPosterWrap: { width: 72, height: 108, borderRadius: 8, overflow: "hidden" },
  heroPoster: { width: "100%", height: "100%" },
  heroText: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 20, fontWeight: "700", lineHeight: 24 },
  heroSubtitle: { fontSize: 13 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  link: { textDecorationLine: "underline" },
});
