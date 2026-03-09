import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import {
  ActivityIndicator,
  type FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

const MAX_RESULTS = 10;

const TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};

const AddShowInput = memo(function AddShowInput({
  scrollToEnd,
}: {
  scrollToEnd: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const allShows = useQuery(api.shows.list);
  const rankings = useQuery(api.rankings.get);
  const createShow = useMutation(api.shows.create);
  const addToRankings = useMutation(api.rankings.addShow);

  const rankedShowIds = useMemo(
    () => new Set(rankings?.showIds ?? []),
    [rankings?.showIds]
  );

  const filteredShows = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || !allShows) return [];
    const lower = trimmed.toLowerCase();
    return allShows
      .filter(
        (show) =>
          show.name.toLowerCase().includes(lower) &&
          !rankedShowIds.has(show._id)
      )
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lower);
        const bStarts = b.name.toLowerCase().startsWith(lower);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);
  }, [query, allShows, rankedShowIds]);

  const hasExactMatch = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return (
      lower.length > 0 &&
      filteredShows.some((s) => s.name.toLowerCase() === lower)
    );
  }, [query, filteredShows]);

  const removePending = useCallback((name: string) => {
    setPendingNames((prev) => {
      const idx = prev.indexOf(name);
      return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
    });
  }, []);

  const handleSelectShow = (showId: Id<"shows">) => {
    const show = allShows?.find((s) => s._id === showId);
    const name = show?.name ?? "Adding...";
    setPendingNames((prev) => [...prev, name]);
    setQuery("");
    inputRef.current?.focus();

    addToRankings({ showId, tier: "liked", position: Infinity })
      .then(() => setTimeout(scrollToEnd, 50))
      .finally(() => removePending(name));
  };

  const handleCreateCustomShow = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setPendingNames((prev) => [...prev, trimmed]);
    setQuery("");
    inputRef.current?.focus();

    createShow({
      name: trimmed,
      type: "other",
      images: [],
      isUserCreated: true,
    })
      .then((showId) =>
        addToRankings({ showId, tier: "liked", position: Infinity })
      )
      .then(() => setTimeout(scrollToEnd, 50))
      .finally(() => removePending(trimmed));
  };

  const handleSubmit = () => {
    if (filteredShows.length > 0) {
      handleSelectShow(filteredShows[0]._id);
    } else if (query.trim()) {
      handleCreateCustomShow();
    } else {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setQuery("");
    setIsAdding(false);
    Keyboard.dismiss();
  };

  const pendingRows = pendingNames.map((name, i) => (
    <View key={`pending-${i}`} style={styles.pendingRow}>
      <ActivityIndicator size="small" color="#999" style={styles.pendingSpinner} />
      <Text style={styles.pendingName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  ));

  const showResults = isAdding && query.trim().length > 0;
  const showCreateOption = showResults && !hasExactMatch;

  const topResults = useMemo(() => filteredShows.slice(0, 3), [filteredShows]);

  return (
    <View style={styles.addShowBar}>
      {showResults && (
        <View style={styles.resultsOverlay}>
          {showCreateOption && (
            <Pressable
              style={styles.createCustomRow}
              onPress={handleCreateCustomShow}
            >
              <Text style={styles.createCustomText}>
                Add "{query.trim()}" as custom show
              </Text>
            </Pressable>
          )}

          {filteredShows.length === 0 && !showCreateOption && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No matching shows</Text>
            </View>
          )}

          {[...topResults].reverse().map((show) => (
            <Pressable
              key={show._id}
              style={[
                styles.resultRow,
                topResults.length === 1 && styles.singleResultHighlight,
              ]}
              onPress={() => handleSelectShow(show._id)}
            >
              <Text style={styles.resultName} numberOfLines={1}>
                {show.name}
              </Text>
              <Text style={styles.resultType}>
                {TYPE_LABELS[show.type]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {pendingRows}

      {isAdding ? (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputRow}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search shows..."
              autoFocus
              returnKeyType="search"
              blurOnSubmit={false}
              onSubmitEditing={handleSubmit}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable onPress={handleCancel} style={styles.searchCancel}>
              <Text style={styles.searchCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.addButton}
          onPress={() => {
            setIsAdding(true);
            setTimeout(scrollToEnd, 100);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Show</Text>
        </Pressable>
      )}
    </View>
  );
});

export default function MyShowsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedShowId, setExpandedShowId] = useState<Id<"shows"> | null>(
    null
  );
  const [selectedShowId, setSelectedShowId] = useState<Id<"shows"> | null>(
    null
  );

  const listRef = useRef<FlatList<RankedShow>>(null);

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

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

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
            ref={listRef}
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
          <AddShowInput
            scrollToEnd={scrollToEnd}
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
    paddingBottom: 72,
    gap: 6,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    opacity: 0.6,
    marginBottom: 6,
  },
  pendingSpinner: {
    width: 36,
  },
  pendingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#999",
  },
  addShowBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  addButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
  searchContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },
  searchCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchCancelText: {
    fontSize: 14,
    color: "#999",
  },
  resultsOverlay: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    marginBottom: 4,
    marginHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  resultName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  resultType: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
    fontWeight: "500",
  },
  noResults: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  noResultsText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  createCustomRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#f8f8ff",
  },
  createCustomText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  singleResultHighlight: {
    backgroundColor: "#e6f7ea",
  },
});
