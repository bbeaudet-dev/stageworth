import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, useCallback } from "react";
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
  const reorder = useMutation(api.rankings.reorder);
  const removeShow = useMutation(api.rankings.removeShow);

  const [optimisticOrder, setOptimisticOrder] = useState<RankedShow[] | null>(
    null
  );

  useEffect(() => {
    setOptimisticOrder(null);
  }, [rankedShows]);

  const displayShows = (optimisticOrder ??
    rankedShows) as RankedShow[] | undefined;

  const handleDragEnd = useCallback(
    async ({
      data,
      from,
      to,
    }: {
      data: RankedShow[];
      from: number;
      to: number;
    }) => {
      if (from === to || !rankedShows) return;
      const showId = rankedShows[from]._id;
      setOptimisticOrder(data);
      await reorder({ showId, newPosition: to });
    },
    [rankedShows, reorder]
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
    ({ item, drag, isActive, getIndex }: RenderItemParams<RankedShow>) => {
      const index = getIndex();
      return (
        <ScaleDecorator>
          <ShowRowAccordion
            item={item}
            index={index ?? 0}
            isExpanded={expandedShowId === item._id}
            isRemoving={pendingRemoveIds.has(item._id)}
            onToggle={() =>
              setExpandedShowId((prev) =>
                prev === item._id ? null : item._id
              )
            }
            onRemove={() => handleRemoveShow(item._id)}
            drag={drag}
            isActive={isActive}
          />
        </ScaleDecorator>
      );
    },
    [expandedShowId, pendingRemoveIds, handleRemoveShow]
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
      ) : displayShows === undefined ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : viewMode === "list" ? (
        <View style={styles.listWrapper}>
          <DraggableFlatList
            data={displayShows}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item._id}
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
            shows={displayShows}
            onShowPress={(showId) => setSelectedShowId(showId)}
          />
          {selectedShowId && (() => {
            const idx = displayShows.findIndex(
              (s) => s._id === selectedShowId
            );
            const show = idx >= 0 ? displayShows[idx] : null;
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
});
