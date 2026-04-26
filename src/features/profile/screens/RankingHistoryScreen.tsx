import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SOURCE_LABELS: Record<string, string> = {
  my_shows_save: "My Shows",
  add_visit: "Add Visit",
  accept_visit: "Accepted Visit",
  direct_ranking: "Ranking Update",
  migration: "Imported",
};

function formatSnapshotDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildSummary(snapshot: {
  source: string;
  changeSummary: {
    addedCount: number;
    removedCount: number;
    reorderedCount: number;
    removedVisitCount: number;
  };
}) {
  const { changeSummary } = snapshot;
  const parts: string[] = [];

  if (changeSummary.addedCount > 0) {
    parts.push(`Added ${pluralize(changeSummary.addedCount, "show")}`);
  }
  if (changeSummary.removedCount > 0) {
    const visitSuffix =
      changeSummary.removedVisitCount > 0
        ? ` (${pluralize(changeSummary.removedVisitCount, "visit")})`
        : "";
    parts.push(`Removed ${pluralize(changeSummary.removedCount, "show")}${visitSuffix}`);
  }
  if (changeSummary.reorderedCount > 0) {
    parts.push(`Reordered ${pluralize(changeSummary.reorderedCount, "show")}`);
  }

  return parts.length > 0 ? parts.join(" • ") : SOURCE_LABELS[snapshot.source] ?? "Ranking saved";
}

export default function RankingHistoryScreen() {
  const snapshots = useQuery(api.rankingSnapshots.list, { limit: 100 });
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Ranking History",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {snapshots === undefined ? (
          <Text style={[s.empty, { color: c.mutedText }]}>Loading…</Text>
        ) : snapshots.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={[s.emptyTitle, { color: c.text }]}>No ranking history yet</Text>
            <Text style={[s.emptySub, { color: c.mutedText }]}>
              When you save rankings from My Shows or log visits, snapshots of your list appear here.
            </Text>
          </View>
        ) : (
          <View style={[s.listCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            {snapshots.map((snapshot, index) => (
              <View
                key={snapshot._id}
                style={[
                  s.row,
                  index > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[s.dot, { backgroundColor: c.accent }]} />
                <View style={s.rowText}>
                  <Text style={[s.summary, { color: c.text }]}>{buildSummary(snapshot)}</Text>
                  <Text style={[s.meta, { color: c.mutedText }]} numberOfLines={2}>
                    {formatSnapshotDate(snapshot.capturedAt)} •{" "}
                    {SOURCE_LABELS[snapshot.source] ?? snapshot.source}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { textAlign: "center", paddingVertical: 40, fontSize: 14 },
  emptyState: { paddingTop: 48, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  listCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    alignItems: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  summary: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
