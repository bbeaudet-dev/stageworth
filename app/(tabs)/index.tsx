import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DiaryView } from "@/components/diary-view";
import {
  ShowRowAccordion,
  type RankedShow,
} from "@/components/show-row-accordion";
import { TheatreCloud } from "@/components/theatre-cloud";
import { ShowDetailModal } from "@/components/show-detail-modal";

type ViewMode = "list" | "cloud" | "diary";
type RankingTier = "loved" | "liked" | "okay" | "disliked";
type SpecialLine = "wouldSeeAgain" | "stayedHome";
type ListItem =
  | { key: string; kind: "show"; show: RankedShow }
  | { key: string; kind: "line"; line: SpecialLine }
  | { key: string; kind: "tier"; tier: RankingTier };

const TIER_HEADERS: Record<
  RankingTier,
  { label: string; color: string; textColor: string }
> = {
  loved: { label: "Loved It", color: "#ef5da8", textColor: "#111" },
  liked: { label: "Liked It", color: "#2f8f46", textColor: "#fff" },
  okay: { label: "It Was Okay", color: "#e9c84f", textColor: "#111" },
  disliked: { label: "Didn't Like It", color: "#dd4b39", textColor: "#fff" },
};
const LINE_META: Record<SpecialLine, { label: string; color: string; arrow: string }> = {
  wouldSeeAgain: {
    label: "Would See Again",
    color: "#9ad94f",
    arrow: "↑",
  },
  stayedHome: {
    label: "Should've Stayed Home",
    color: "#f39c46",
    arrow: "↓",
  },
};

function normalizeTier(value: string | undefined): RankingTier {
  if (value === "loved" || value === "liked" || value === "okay" || value === "disliked") {
    return value;
  }
  return "liked";
}

export default function MyShowsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedShowId, setExpandedShowId] = useState<Id<"shows"> | null>(
    null
  );
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(
    null
  );

  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<Id<"shows">>>(
    () => new Set()
  );

  const rankedShows = useQuery(api.rankings.getRankedShows);
  const rankingsMeta = useQuery(api.rankings.get);
  const reorder = useMutation(api.rankings.reorder);
  const removeShow = useMutation(api.rankings.removeShow);
  const updateSpecialLinePosition = useMutation(
    api.rankings.updateSpecialLinePosition
  );

  const [optimisticOrder, setOptimisticOrder] = useState<RankedShow[] | null>(
    null
  );
  const [optimisticTierByShowId, setOptimisticTierByShowId] = useState<
    Record<string, RankingTier>
  >({});
  const mutationQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    setOptimisticOrder(null);
    setOptimisticTierByShowId({});
  }, [rankedShows]);

  const displayShows = (optimisticOrder ??
    rankedShows) as RankedShow[] | undefined;
  const showsForDisplay = displayShows ?? [];

  const showCount = displayShows?.length ?? 0;
  const wouldSeeAgainLineIndex = Math.max(
    0,
    Math.min(
      rankingsMeta?.wouldSeeAgainLineIndex ?? Math.floor(showCount * 0.45),
      showCount
    )
  );
  const stayedHomeLineIndex = Math.max(
    0,
    Math.min(
      rankingsMeta?.stayedHomeLineIndex ?? Math.floor(showCount * 0.85),
      showCount
    )
  );

  const getShowTier = useCallback(
    (show: RankedShow): RankingTier =>
      optimisticTierByShowId[show._id] ?? normalizeTier(show.tier),
    [optimisticTierByShowId]
  );

  const listItems: ListItem[] | undefined = displayShows
    ? (() => {
        const items: ListItem[] = [];
        let previousShowTier: RankingTier | null = null;
        for (let slot = 0; slot <= displayShows.length; slot += 1) {
          if (slot === wouldSeeAgainLineIndex) {
            items.push({
              key: "line-wouldSeeAgain",
              kind: "line",
              line: "wouldSeeAgain",
            });
          }
          if (slot === stayedHomeLineIndex) {
            items.push({
              key: "line-stayedHome",
              kind: "line",
              line: "stayedHome",
            });
          }
          if (slot < displayShows.length) {
            const currentShow = displayShows[slot];
            const currentTier = getShowTier(currentShow);
            if (currentTier !== previousShowTier) {
              items.push({
                key: `tier-${currentTier}-${slot}`,
                kind: "tier",
                tier: currentTier,
              });
            }
            items.push({ key: currentShow._id, kind: "show", show: currentShow });
            previousShowTier = currentTier;
          }
        }
        return items;
      })()
    : undefined;

  const handleDragEnd = useCallback(
    async ({
      data,
      from,
      to,
    }: {
      data: ListItem[];
      from: number;
      to: number;
    }) => {
      if (!listItems || !displayShows) return;
      const movedItem = listItems[from];
      if (!movedItem) return;

      if (movedItem.kind === "show") {
        const fromPosition = displayShows.findIndex(
          (show) => show._id === movedItem.show._id
        );
        const showData = data
          .filter(
            (
              item
            ): item is { key: string; kind: "show"; show: RankedShow } =>
              item.kind === "show"
          )
          .map((item) => item.show);
        const newPosition = showData.findIndex(
          (show) => show._id === movedItem.show._id
        );
        if (newPosition === -1) return;

        if (fromPosition !== -1 && newPosition !== fromPosition) {
          setOptimisticOrder(showData);
          mutationQueueRef.current = mutationQueueRef.current
            .then(() => reorder({ showId: movedItem.show._id, newPosition }))
            .then(() => undefined)
            .catch((error) => {
              console.error("Failed to reorder show:", error);
            });
        }
        return;
      }

      if (movedItem.kind === "tier") return;

      const linePosition = data
        .slice(0, to + 1)
        .filter((item) => item.kind === "show").length;
      mutationQueueRef.current = mutationQueueRef.current
        .then(() =>
          updateSpecialLinePosition({
            line: movedItem.line,
            position: linePosition,
          })
        )
        .then(() => undefined)
        .catch((error) => {
          console.error("Failed to update special line position:", error);
        });
    },
    [
      displayShows,
      listItems,
      reorder,
      updateSpecialLinePosition,
    ]
  );

  const handleRemoveShow = useCallback(
    (showId: Id<"shows">) => {
      setExpandedShowId(null);
      setPendingRemoveIds((prev) => new Set(prev).add(showId));
      removeShow({ showId }).finally(() => {
        setPendingRemoveIds((prev) => {
          const next = new Set(prev);
          next.delete(showId);
          return next;
        });
      });
    },
    [removeShow]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ListItem>) => {
      const listIndex = getIndex() ?? 0;

      if (item.kind === "line") {
        const meta = LINE_META[item.line];
        return (
          <ScaleDecorator>
            <Pressable
              onLongPress={drag}
              delayLongPress={120}
              style={[
                styles.specialLineRow,
                isActive && styles.specialLineRowActive,
              ]}
            >
              <Text style={[styles.specialLineArrow, { color: meta.color }]}>
                {meta.arrow}
              </Text>
              <View style={[styles.specialLineTrack, { borderTopColor: meta.color }]} />
              <Text style={[styles.specialLineLabel, { color: meta.color }]}>
                {meta.label}
              </Text>
            </Pressable>
          </ScaleDecorator>
        );
      }

      if (item.kind === "tier") {
        const tier = TIER_HEADERS[item.tier];
        return (
          <View style={styles.tierHeaderRow}>
            <View
              style={[
                styles.tierHeaderBadge,
                { backgroundColor: tier.color },
              ]}
            >
              <Text
                style={[
                  styles.tierHeaderBadgeText,
                  { color: tier.textColor },
                ]}
              >
                {tier.label}
              </Text>
            </View>
          </View>
        );
      }

      const showIndex = listItems
        ?.slice(0, listIndex + 1)
        .filter((listItem) => listItem.kind === "show").length;

      return (
        <ScaleDecorator>
          <ShowRowAccordion
            item={item.show}
            index={(showIndex ?? 1) - 1}
            tierHeader={null}
            isExpanded={expandedShowId === item.show._id}
            isRemoving={pendingRemoveIds.has(item.show._id)}
            onToggle={() =>
              setExpandedShowId((prev) =>
                prev === item.show._id ? null : item.show._id
              )
            }
            onRemove={() => handleRemoveShow(item.show._id)}
            drag={drag}
            isActive={isActive}
          />
        </ScaleDecorator>
      );
    },
    [listItems, expandedShowId, pendingRemoveIds, handleRemoveShow]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Shows</Text>
        <View style={styles.toggle}>
          {(["list", "cloud", "diary"] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.toggleButton,
                viewMode === mode && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === mode && styles.toggleTextActive,
                ]}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {viewMode === "diary" ? (
        <DiaryView />
      ) : listItems === undefined ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : viewMode === "list" ? (
        <View style={styles.listWrapper}>
          <DraggableFlatList
            data={listItems}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) =>
              item.key
            }
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No shows ranked yet.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : (
        <>
          <TheatreCloud
            shows={showsForDisplay}
            onShowPress={(showId) => setSelectedShowId(showId)}
          />
          {selectedShowId && (() => {
            const idx = showsForDisplay.findIndex(
              (s) => s._id === selectedShowId
            );
            const show = idx >= 0 ? showsForDisplay[idx] : null;
            return (
              <ShowDetailModal
                showId={selectedShowId}
                showName={show?.name ?? ""}
                rank={idx + 1}
                onClose={() => setSelectedShowId(null)}
              />
            );
          })()}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  toggleTextActive: {
    color: "#333",
  },
  loading: {
    fontSize: 16,
    color: "#666",
    padding: 16,
  },
  empty: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  tierHeaderRow: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  tierHeaderBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 2,
  },
  tierHeaderBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  specialLineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginTop: 0,
    marginBottom: 0,
    minHeight: 14,
  },
  specialLineRowActive: {
    opacity: 0.72,
  },
  specialLineLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginLeft: 6,
  },
  specialLineTrack: {
    flex: 1,
    borderTopWidth: 2,
    marginTop: 0,
  },
  specialLineArrow: {
    fontSize: 11,
    fontWeight: "800",
    marginRight: 6,
  },
});
