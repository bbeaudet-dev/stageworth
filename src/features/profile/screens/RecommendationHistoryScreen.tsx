import { useMutation, useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate as formatDateShort } from "@/utils/dates";

type HistoryRow = Doc<"aiRecommendationHistory">;

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

type HistoryGroup = {
  key: string;
  kind: HistoryRow["kind"];
  createdAt: number;
  targetDate?: string;
  rows: HistoryRow[];
};

function buildGroups(rows: readonly HistoryRow[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();
  for (const row of rows) {
    const key = row.groupId ? `g:${row.groupId}` : `r:${row._id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      if (row.createdAt > existing.createdAt) existing.createdAt = row.createdAt;
    } else {
      groups.set(key, {
        key,
        kind: row.kind,
        createdAt: row.createdAt,
        targetDate: row.targetDate,
        rows: [row],
      });
    }
  }
  const out = Array.from(groups.values());
  for (const g of out) {
    g.rows.sort((a, b) => {
      if (a.rank === "primary" && b.rank !== "primary") return -1;
      if (b.rank === "primary" && a.rank !== "primary") return 1;
      return a._creationTime - b._creationTime;
    });
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export default function RecommendationHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const isDark = theme === "dark";
  const c = Colors[theme];

  const history = useQuery(api.recommendations.listRecommendationHistory);
  const clearHistory = useMutation(api.recommendations.clearRecommendationHistory);
  const deleteRec = useMutation(api.recommendations.deleteRecommendation);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildGroups(history ?? []), [history]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goToShow = (showId: Id<"shows">, showName: string) =>
    router.push({
      pathname: "/show/[showId]",
      params: { showId, name: showName },
    });

  const handleDeleteGroup = (group: HistoryGroup) => {
    const title =
      group.rows.length === 1
        ? "Remove recommendation"
        : "Remove this set of picks";
    const body =
      group.rows.length === 1
        ? `Remove the recommendation for "${group.rows[0].showNameSnapshot}"?`
        : `Remove all ${group.rows.length} picks from this ${KIND_LABELS[group.kind].toLowerCase()} run?`;
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await Promise.all(
              group.rows.map((row) => deleteRec({ id: row._id }))
            );
          } catch {
            Alert.alert("Error", "Could not remove. Please try again.");
          }
        },
      },
    ]);
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
        ) : groups.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={[s.emptyTitle, { color: c.text }]}>No recommendations yet</Text>
            <Text style={[s.emptySub, { color: c.mutedText }]}>
              Tap &quot;Would I like this?&quot; on any show detail page to get a personalized recommendation. Your results will appear here.
            </Text>
          </View>
        ) : (
          <>
            {groups.map((group) => {
              const isMulti = group.rows.length > 1;
              return isMulti ? (
                <MultiPickGroup
                  key={group.key}
                  group={group}
                  isDark={isDark}
                  theme={theme}
                  isExpanded={expandedKeys.has(group.key)}
                  onToggleExpanded={() => toggleExpanded(group.key)}
                  onDeleteGroup={() => handleDeleteGroup(group)}
                  onPressRow={(row) =>
                    goToShow(row.showId, row.showNameSnapshot)
                  }
                />
              ) : (
                <SinglePickCard
                  key={group.key}
                  row={group.rows[0]}
                  isDark={isDark}
                  theme={theme}
                  isExpanded={expandedKeys.has(group.key)}
                  onToggleExpanded={() => toggleExpanded(group.key)}
                  onDelete={() => handleDeleteGroup(group)}
                  onPress={() =>
                    goToShow(
                      group.rows[0].showId,
                      group.rows[0].showNameSnapshot
                    )
                  }
                />
              );
            })}

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

interface SinglePickCardProps {
  row: HistoryRow;
  isDark: boolean;
  theme: "light" | "dark";
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onPress: () => void;
}

function SinglePickCard({
  row,
  isDark,
  theme,
  isExpanded,
  onToggleExpanded,
  onDelete,
  onPress,
}: SinglePickCardProps) {
  const c = Colors[theme];
  const scoreColors =
    typeof row.score === "number"
      ? (isDark ? SCORE_COLORS_DARK : SCORE_COLORS)[row.score] ??
        (isDark ? SCORE_COLORS_DARK[3] : SCORE_COLORS[3])
      : null;
  const kindLabel = KIND_LABELS[row.kind] ?? row.kind;
  const matched = row.matchedElements ?? [];
  const mismatched = row.mismatchedElements ?? [];
  const body = row.reasoning ?? row.fit ?? "";

  return (
    <Pressable
      style={[s.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
      onPress={onPress}
    >
      <View style={s.cardHeader}>
        <View style={s.kindRow}>
          <View
            style={[
              s.kindChip,
              { backgroundColor: isDark ? "rgba(83,109,254,0.2)" : "#EEF2FF" },
            ]}
          >
            <Text
              style={[s.kindChipText, { color: isDark ? "#818CF8" : "#536DFE" }]}
            >
              {kindLabel}
            </Text>
          </View>
        </View>
        <View style={s.cardTitleRow}>
          <Text style={[s.showName, { color: c.text }]} numberOfLines={1}>
            {row.showNameSnapshot}
          </Text>
          <View style={s.cardTitleRight}>
            {scoreColors && (
              <View style={[s.scoreBadge, { backgroundColor: scoreColors.bg }]}>
                <Text style={[s.scoreText, { color: scoreColors.text }]}>
                  {row.score}/5
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              hitSlop={8}
            >
              <Text style={[s.deleteX, { color: c.mutedText }]}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[s.headline, { color: c.text }]}>{row.headline}</Text>
        <Text style={[s.date, { color: c.mutedText }]}>
          {formatTimestamp(row.createdAt)}
        </Text>
      </View>
      {!!body && (
        <>
          <Text
            style={[s.reasoning, { color: c.mutedText }]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {body}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleExpanded();
            }}
            hitSlop={4}
          >
            <Text style={[s.expandToggle, { color: c.accent }]}>
              {isExpanded ? "Show less" : "Read more"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {matched.length > 0 && (
        <View style={s.chipRow}>
          {matched.map((el) => (
            <View
              key={el}
              style={[
                s.chip,
                {
                  borderColor: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
                  backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "#ECFDF5",
                },
              ]}
            >
              <Text style={[s.chipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                {el}
              </Text>
            </View>
          ))}
        </View>
      )}
      {mismatched.length > 0 && (
        <View style={s.chipRow}>
          {mismatched.map((el) => (
            <View
              key={el}
              style={[
                s.chip,
                {
                  borderColor: isDark ? "rgba(239,68,68,0.25)" : "#FECACA",
                  backgroundColor: isDark ? "rgba(239,68,68,0.10)" : "#FEF2F2",
                },
              ]}
            >
              <Text style={[s.chipText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                {el}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

interface MultiPickGroupProps {
  group: HistoryGroup;
  isDark: boolean;
  theme: "light" | "dark";
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onDeleteGroup: () => void;
  onPressRow: (row: HistoryRow) => void;
}

function MultiPickGroup({
  group,
  isDark,
  theme,
  isExpanded,
  onToggleExpanded,
  onDeleteGroup,
  onPressRow,
}: MultiPickGroupProps) {
  const c = Colors[theme];
  const kindLabel = KIND_LABELS[group.kind] ?? group.kind;
  const targetDateLabel = group.targetDate
    ? ` · for ${formatDateShort(group.targetDate)}`
    : "";
  const primary = group.rows.find((r) => r.rank === "primary") ?? group.rows[0];
  const runnersUp = group.rows.filter((r) => r._id !== primary._id);

  return (
    <View
      style={[s.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
    >
      <View style={s.cardHeader}>
        <View style={s.kindRow}>
          <View
            style={[
              s.kindChip,
              { backgroundColor: isDark ? "rgba(83,109,254,0.2)" : "#EEF2FF" },
            ]}
          >
            <Text
              style={[s.kindChipText, { color: isDark ? "#818CF8" : "#536DFE" }]}
            >
              {kindLabel}
            </Text>
          </View>
          <View style={s.groupMetaRight}>
            <Text style={[s.date, { color: c.mutedText }]}>
              {formatTimestamp(group.createdAt)}
              {targetDateLabel}
            </Text>
            <TouchableOpacity onPress={onDeleteGroup} hitSlop={8}>
              <Text style={[s.deleteX, { color: c.mutedText }]}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Pressable onPress={() => onPressRow(primary)} style={s.groupRow}>
        <View style={s.groupRowLeft}>
          <Text style={[s.rankLabel, { color: c.accent }]}>WINNER</Text>
          <Text style={[s.showName, { color: c.text }]} numberOfLines={1}>
            {primary.showNameSnapshot}
          </Text>
          <Text style={[s.headline, { color: c.text }]} numberOfLines={2}>
            {primary.headline}
          </Text>
          {!!primary.fit && (
            <Text
              style={[s.reasoning, { color: c.mutedText }]}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {primary.fit}
            </Text>
          )}
          {isExpanded && !!primary.edge && (
            <View style={s.secondaryBlock}>
              <Text style={[s.secondaryLabel, { color: c.accent }]}>
                WHY THIS ONE
              </Text>
              <Text style={[s.secondaryText, { color: c.text }]}>
                {primary.edge}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {runnersUp.length > 0 && (
        <View style={s.runnersUpBlock}>
          <Text style={[s.runnersUpHeader, { color: c.mutedText }]}>
            Runners-up
          </Text>
          {runnersUp.map((row) => (
            <Pressable
              key={row._id}
              onPress={() => onPressRow(row)}
              style={[s.runnerUpRow, { borderTopColor: c.border }]}
            >
              <Text
                style={[s.runnerUpName, { color: c.text }]}
                numberOfLines={1}
              >
                {row.showNameSnapshot}
              </Text>
              {!!row.headline && (
                <Text
                  style={[s.runnerUpHeadline, { color: c.mutedText }]}
                  numberOfLines={1}
                >
                  {row.headline}
                </Text>
              )}
              {isExpanded && !!row.fit && (
                <Text
                  style={[s.reasoning, { color: c.mutedText }]}
                >
                  {row.fit}
                </Text>
              )}
              {isExpanded && !!row.tradeoff && (
                <View style={s.secondaryBlock}>
                  <Text style={[s.secondaryLabel, { color: c.mutedText }]}>
                    TRADEOFF
                  </Text>
                  <Text style={[s.secondaryText, { color: c.text }]}>
                    {row.tradeoff}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={onToggleExpanded} hitSlop={4}>
        <Text style={[s.expandToggle, { color: c.accent }]}>
          {isExpanded ? "Show less" : "Read more"}
        </Text>
      </TouchableOpacity>
    </View>
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
  kindRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "space-between",
  },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
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
  chipText: { fontSize: 11, fontWeight: "600" },
  clearAllBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  clearAllText: { fontSize: 15, fontWeight: "600" },
  groupMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupRow: { gap: 4 },
  groupRowLeft: { gap: 4 },
  rankLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  secondaryBlock: { marginTop: 4, gap: 2 },
  secondaryLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  secondaryText: { fontSize: 13, lineHeight: 18 },
  runnersUpBlock: { gap: 6, marginTop: 4 },
  runnersUpHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  runnerUpRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 2,
  },
  runnerUpName: { fontSize: 14, fontWeight: "700" },
  runnerUpHeadline: { fontSize: 12 },
});
