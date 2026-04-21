import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FindShowPickCard } from "@/features/find-show/components/FindShowPickCard";
import {
  CompareShowPicker,
  type CompareCandidate,
} from "@/features/help-me-decide/components/CompareShowPicker";
import { useCompareShows } from "@/features/help-me-decide/hooks/useCompareShows";
import { useColorScheme } from "@/hooks/use-color-scheme";

const MIN_SELECT = 2;
const MAX_SELECT = 6;

export default function HelpMeDecideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = (typeof params.tripId === "string" && params.tripId.length > 0
    ? (params.tripId as Id<"trips">)
    : undefined);

  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const data = useQuery(api.compareShows.getHelpMeDecideCandidates, {
    tripId,
  });

  const { loading, result, error, run, reset } = useCompareShows();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSeededFromTrip, setHasSeededFromTrip] = useState(false);

  const candidates: CompareCandidate[] = useMemo(
    () => data?.shows ?? [],
    [data?.shows]
  );

  useEffect(() => {
    if (hasSeededFromTrip) return;
    if (data?.source !== "trip") return;
    if (candidates.length === 0) return;
    const seeded = new Set<string>();
    for (const candidate of candidates.slice(0, MAX_SELECT)) {
      seeded.add(String(candidate.showId));
    }
    setSelectedIds(seeded);
    setHasSeededFromTrip(true);
  }, [data?.source, candidates, hasSeededFromTrip]);

  const onToggle = (showId: Id<"shows">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(showId);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_SELECT) next.add(key);
      return next;
    });
  };

  const selectedShowIds: Id<"shows">[] = useMemo(() => {
    return candidates
      .filter((cand) => selectedIds.has(String(cand.showId)))
      .map((cand) => cand.showId);
  }, [candidates, selectedIds]);

  const canRun = selectedShowIds.length >= MIN_SELECT && !loading;

  const handleRun = () => {
    if (!canRun) return;
    void run({
      showIds: selectedShowIds,
      tripStartDate: data?.tripStartDate ?? undefined,
      tripEndDate: data?.tripEndDate ?? undefined,
    });
  };

  const handleResetAndReselect = () => {
    reset();
  };

  const handlePickPress = (showId: string) => {
    router.push({ pathname: "/show/[showId]", params: { showId } });
  };

  const isLoadingCandidates = data === undefined;
  const hasCandidates = candidates.length > 0;
  const sourceLabel = data?.source === "trip" ? "this trip" : "your Want to See list";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <IconSymbol name="chevron.left" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          Help Me Decide
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* When we have a result, show it at the top and collapse picker. */}
        {result?.kind === "ok" ? (
          <View style={styles.results}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: c.text }]}>
                Our pick
              </Text>
              <Text style={[styles.resultsSub, { color: c.mutedText }]}>
                from {selectedShowIds.length} shows
              </Text>
            </View>

            <FindShowPickCard
              pick={result.winner}
              variant="primary"
              onPress={() => handlePickPress(String(result.winner.showId))}
            />

            {result.runnersUp.length > 0 && (
              <>
                <Text
                  style={[styles.alternatesTitle, { color: c.mutedText }]}
                >
                  Runners-up
                </Text>
                {result.runnersUp.map((rp) => (
                  <FindShowPickCard
                    key={String(rp.showId)}
                    pick={rp}
                    variant="alternate"
                    onPress={() => handlePickPress(String(rp.showId))}
                  />
                ))}
              </>
            )}

            <Pressable
              onPress={handleResetAndReselect}
              style={({ pressed }) => [
                styles.secondaryCta,
                {
                  borderColor: c.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="arrow.clockwise" size={14} color={c.accent} />
              <Text style={[styles.secondaryCtaText, { color: c.accent }]}>
                Adjust selection
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.introBlock}>
              <Text style={[styles.introTitle, { color: c.text }]}>
                Which one should you see?
              </Text>
              <Text style={[styles.introSub, { color: c.mutedText }]}>
                Pick {MIN_SELECT}–{MAX_SELECT} shows from {sourceLabel} and
                we&apos;ll tell you which one you&apos;ll probably love most.
              </Text>
            </View>

            {isLoadingCandidates ? (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="small" color={c.mutedText} />
              </View>
            ) : !hasCandidates ? (
              <View
                style={[
                  styles.errorCard,
                  { backgroundColor: c.surfaceElevated, borderColor: c.border },
                ]}
              >
                <Text style={[styles.errorTitle, { color: c.text }]}>
                  {data?.source === "trip"
                    ? "No shows on this trip yet"
                    : "Your Want to See list is empty"}
                </Text>
                <Text style={[styles.errorSub, { color: c.mutedText }]}>
                  {data?.source === "trip"
                    ? "Add shows to the trip first, then come back."
                    : "Add at least two shows to your Want to See list, then come back."}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.counterRow}>
                  <Text style={[styles.counterText, { color: c.mutedText }]}>
                    {selectedIds.size} / {MAX_SELECT} selected
                  </Text>
                  {selectedIds.size > 0 && (
                    <Pressable
                      onPress={() => setSelectedIds(new Set())}
                      hitSlop={8}
                    >
                      <Text style={[styles.clearText, { color: c.accent }]}>
                        Clear
                      </Text>
                    </Pressable>
                  )}
                </View>
                <CompareShowPicker
                  candidates={candidates}
                  selectedIds={selectedIds}
                  onToggle={onToggle}
                  maxSelectable={MAX_SELECT}
                />
              </>
            )}

            {hasCandidates && (
              <Pressable
                onPress={handleRun}
                disabled={!canRun}
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor: c.accent,
                    opacity: !canRun ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {loading ? (
                  <View style={styles.ctaLoadingRow}>
                    <ActivityIndicator size="small" color={c.onAccent} />
                    <Text style={[styles.ctaText, { color: c.onAccent }]}>
                      Deciding…
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.ctaText, { color: c.onAccent }]}>
                    {selectedIds.size < MIN_SELECT
                      ? `Pick at least ${MIN_SELECT}`
                      : "Help me decide"}
                  </Text>
                )}
              </Pressable>
            )}

            {error && (
              <View
                style={[
                  styles.errorCard,
                  { backgroundColor: c.surfaceElevated, borderColor: c.border },
                ]}
              >
                <Text style={[styles.errorTitle, { color: c.text }]}>
                  Couldn&apos;t get a recommendation
                </Text>
                <Text style={[styles.errorSub, { color: c.mutedText }]}>
                  {error}
                </Text>
              </View>
            )}

            {result?.kind === "insufficient_context" && (
              <View
                style={[
                  styles.errorCard,
                  { backgroundColor: c.surfaceElevated, borderColor: c.border },
                ]}
              >
                <Text style={[styles.errorTitle, { color: c.text }]}>
                  No clear winner yet
                </Text>
                <Text style={[styles.errorSub, { color: c.mutedText }]}>
                  {result.reason.trim().replace(/\.$/, "")}. Try a different
                  combination or rank a few more shows to sharpen the
                  comparison.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  introBlock: { gap: 6, marginTop: 4 },
  introTitle: { fontSize: 22, fontWeight: "800" },
  introSub: { fontSize: 14, lineHeight: 20 },
  centerBlock: { alignItems: "center", paddingVertical: 40 },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  clearText: { fontSize: 13, fontWeight: "700" },
  cta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
  ctaLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  errorTitle: { fontSize: 15, fontWeight: "700" },
  errorSub: { fontSize: 13, lineHeight: 18 },
  results: { gap: 12 },
  resultsHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  resultsTitle: { fontSize: 16, fontWeight: "800" },
  resultsSub: { fontSize: 13, fontWeight: "600" },
  alternatesTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 10,
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  secondaryCtaText: { fontSize: 14, fontWeight: "700" },
});
