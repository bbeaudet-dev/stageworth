import { useMutation, useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotifyProfileDrawerReopenOnUnmount } from "@/features/profile/reopenSettingsDrawer";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  // Matches pattern of other drawer-navigated screens; ensures correct back-stack behaviour
  useNotifyProfileDrawerReopenOnUnmount();

  const history = useQuery(api.recommendations.listRecommendationHistory);
  const clearHistory = useMutation(api.recommendations.clearRecommendationHistory);

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
          // Explicit back button using router.back() avoids a known issue where the
          // native-header back button can appear but not respond on first visit.
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <IconSymbol name="chevron.left" size={20} color={c.accent} />
            </Pressable>
          ),
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
              const scoreColors = (isDark ? SCORE_COLORS_DARK : SCORE_COLORS)[item.score] ??
                (isDark ? SCORE_COLORS_DARK[3] : SCORE_COLORS[3]);
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
                    <View style={s.cardTitleRow}>
                      <Text style={[s.showName, { color: c.text }]} numberOfLines={1}>
                        {item.showNameSnapshot}
                      </Text>
                      <View style={[s.scoreBadge, { backgroundColor: scoreColors.bg }]}>
                        <Text style={[s.scoreText, { color: scoreColors.text }]}>
                          {item.score}/5
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.headline, { color: c.text }]}>{item.headline}</Text>
                    <Text style={[s.date, { color: c.mutedText }]}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text style={[s.reasoning, { color: c.mutedText }]} numberOfLines={3}>
                    {item.reasoning}
                  </Text>
                  {item.matchedElements.length > 0 && (
                    <View style={s.chipRow}>
                      {item.matchedElements.map((el) => (
                        <View key={el} style={[s.chip, s.matchChip, { borderColor: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0", backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "#ECFDF5" }]}>
                          <Text style={[s.chipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>{el}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.mismatchedElements.length > 0 && (
                    <View style={s.chipRow}>
                      {item.mismatchedElements.map((el) => (
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
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  showName: { fontSize: 15, fontWeight: "700", flex: 1 },
  scoreBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 13, fontWeight: "800" },
  headline: { fontSize: 14, fontWeight: "600" },
  date: { fontSize: 12 },
  reasoning: { fontSize: 13, lineHeight: 18 },
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
