import { useMutation, useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate as formatDateShort } from "@/utils/dates";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const KIND_LABELS: Record<string, string> = {
  would_i_like: "Would I like this?",
  find_a_show: "Find a show",
  help_me_decide: "Help me decide",
};

const SCORE_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#FEF2F2", text: "#991B1B" },
  2: { bg: "#FFF7ED", text: "#C2410C" },
  3: { bg: "#FEFCE8", text: "#854D0E" },
  4: { bg: "#F0FDF4", text: "#166534" },
  5: { bg: "#F0FDF4", text: "#14532D" },
};

const SCORE_COLORS_DARK: Record<number, { bg: string; text: string }> = {
  1: { bg: "rgba(239,68,68,0.12)", text: "#FCA5A5" },
  2: { bg: "rgba(249,115,22,0.12)", text: "#FDBA74" },
  3: { bg: "rgba(234,179,8,0.12)", text: "#FDE047" },
  4: { bg: "rgba(34,197,94,0.12)", text: "#86EFAC" },
  5: { bg: "rgba(34,197,94,0.15)", text: "#4ADE80" },
};

export default function RecommendationHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];

  const history = useQuery(api.recommendations.listRecommendationHistory);
  const clearHistory = useMutation(api.recommendations.clearRecommendationHistory);
  const deleteRec = useMutation(api.recommendations.deleteRecommendation);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteOne = (id: Id<"aiRecommendationHistory">, showName: string) => {
    Alert.alert(
      "Remove recommendation",
      `Remove the recommendation for "${showName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteRec({ id }).catch(() => Alert.alert("Error", "Could not remove. Please try again.")),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear all recommendations",
      "This will permanently delete your entire recommendation history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearHistory();
            } catch {
              Alert.alert("Error", "Could not clear history. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Recommendation History",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {history === undefined ? (
          <Text style={[s.empty, { color: c.mutedText }]}>Loading…</Text>
        ) : history.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={[s.emptyTitle, { color: c.text }]}>No recommendations yet</Text>
            <Text style={[s.emptySub, { color: c.mutedText }]}>
              Tap &quot;Would I like this?&quot; on any show detail page to get a personalized recommendation. Your results will appear here.
            </Text>
          </View>
        ) : (
          <>
            {history.map((item) => {
              const kind = item.kind ?? "would_i_like";
              const hasScore = typeof item.score === "number";
              const scoreColors = hasScore
                ? (isDark ? SCORE_COLORS_DARK : SCORE_COLORS)[item.score as number] ??
                  (isDark ? SCORE_COLORS_DARK[3] : SCORE_COLORS[3])
                : null;
              const isExpanded = expandedIds.has(item._id);
              const kindLabel = KIND_LABELS[kind] ?? "Recommendation";
              const rankLabel =
                item.rank === "alternate" ? "Alternate" : null;
              const targetDateLabel = item.targetDate
                ? ` · for ${formatDateShort(item.targetDate)}`
                : "";
              const matched = item.matchedElements ?? [];
              const mismatched = item.mismatchedElements ?? [];
              return (
                <Pressable
                  key={item._id}
                  style={[s.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
                  onPress={() =>
                    router.push({
                      pathname: "/show/[showId]",
                      params: { showId: item.showId, name: item.showNameSnapshot },
                    })
                  }
                >
                  <View style={s.cardHeader}>
                    <View style={s.kindRow}>
                      <View
                        style={[
                          s.kindChip,
                          {
                            backgroundColor: isDark ? "rgba(83,109,254,0.2)" : "#EEF2FF",
                          },
                        ]}
                      >
                        <Text
                          style={[s.kindChipText, { color: isDark ? "#818CF8" : "#536DFE" }]}
                        >
                          {kindLabel}
                        </Text>
                      </View>
                      {rankLabel && (
                        <View
                          style={[
                            s.kindChip,
                            s.kindChipGhost,
                            { borderColor: c.border },
                          ]}
                        >
                          <Text style={[s.kindChipText, { color: c.mutedText }]}>
                            {rankLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardTitleRow}>
                      <Text style={[s.showName, { color: c.text }]} numberOfLines={1}>
                        {item.showNameSnapshot}
                      </Text>
                      <View style={s.cardTitleRight}>
                        {scoreColors && (
                          <View style={[s.scoreBadge, { backgroundColor: scoreColors.bg }]}>
                            <Text style={[s.scoreText, { color: scoreColors.text }]}>
                              {item.score}/5
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); handleDeleteOne(item._id, item.showNameSnapshot); }}
                          hitSlop={8}
                        >
                          <Text style={[s.deleteX, { color: c.mutedText }]}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[s.headline, { color: c.text }]}>{item.headline}</Text>
                    <Text style={[s.date, { color: c.mutedText }]}>
                      {formatTimestamp(item.createdAt)}
                      {targetDateLabel}
                    </Text>
                  </View>
                  <Text style={[s.reasoning, { color: c.mutedText }]} numberOfLines={isExpanded ? undefined : 3}>
                    {item.reasoning}
                  </Text>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); toggleExpanded(item._id); }}
                    hitSlop={4}
                  >
                    <Text style={[s.expandToggle, { color: c.accent }]}>
                      {isExpanded ? "Show less" : "Read more"}
                    </Text>
                  </TouchableOpacity>
                  {matched.length > 0 && (
                    <View style={s.chipRow}>
                      {matched.map((el) => (
                        <View key={el} style={[s.chip, s.matchChip, { borderColor: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0", backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "#ECFDF5" }]}>
                          <Text style={[s.chipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>{el}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {mismatched.length > 0 && (
                    <View style={s.chipRow}>
                      {mismatched.map((el) => (
                        <View key={el} style={[s.chip, { borderColor: isDark ? "rgba(239,68,68,0.25)" : "#FECACA", backgroundColor: isDark ? "rgba(239,68,68,0.10)" : "#FEF2F2" }]}>
                          <Text style={[s.chipText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>{el}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* Clear All at bottom of list */}
            <Pressable
              style={[s.clearAllBtn, { borderColor: c.danger + "55" }]}
              onPress={handleClearAll}
            >
              <Text style={[s.clearAllText, { color: c.danger }]}>Clear All History</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  empty: { textAlign: "center", paddingVertical: 40, fontSize: 14 },
  emptyState: { paddingTop: 48, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  cardHeader: { gap: 3 },
  kindRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 2 },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  kindChipGhost: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitleRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  showName: { fontSize: 15, fontWeight: "700", flex: 1 },
  deleteX: { fontSize: 22, lineHeight: 24, fontWeight: "300" },
  scoreBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 13, fontWeight: "800" },
  headline: { fontSize: 14, fontWeight: "600" },
  date: { fontSize: 12 },
  reasoning: { fontSize: 13, lineHeight: 18 },
  expandToggle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchChip: {},
  chipText: { fontSize: 11, fontWeight: "600" },
  clearAllBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  clearAllText: { fontSize: 15, fontWeight: "600" },
});
