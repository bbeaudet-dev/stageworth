import { useMutation, useQuery } from "convex/react";
import { useRef, useState, useCallback, useMemo, memo } from "react";
import {
  ActivityIndicator,
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

type ViewMode = "list" | "cloud";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

type RankedShow = {
  _id: Id<"shows">;
  _creationTime: number;
  name: string;
  type: ShowType;
  subtype?: string;
  images: string[];
  tier?: "liked" | "neutral" | "disliked";
};

const MAX_RESULTS = 10;

const TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};

const AddShowInput = memo(function AddShowInput() {
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

  if (!isAdding) {
    return (
      <View style={styles.footer}>
        {pendingRows}
        <Pressable style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Text style={styles.addButtonText}>+ Add Show</Text>
        </Pressable>
      </View>
    );
  }

  const showResults = query.trim().length > 0;
  const showCreateOption = showResults && !hasExactMatch;

  return (
    <View style={styles.footer}>
      {pendingRows}
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

        {showResults && (
          <View style={styles.resultsList}>
            {filteredShows.map((show) => (
              <Pressable
                key={show._id}
                style={styles.resultRow}
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

            {filteredShows.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No matching shows</Text>
              </View>
            )}

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
          </View>
        )}
      </View>
    </View>
  );
});

export default function MyShowsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const rankedShows = useQuery(api.rankings.getRankedShows);
  const reorder = useMutation(api.rankings.reorder);

  const handleDragEnd = useCallback(
    async ({ data }: { data: RankedShow[] }) => {
      if (!rankedShows) return;

      for (let i = 0; i < data.length; i++) {
        if (data[i]._id !== rankedShows[i]?._id) {
          await reorder({ showId: data[i]._id, newPosition: i });
          break;
        }
      }
    },
    [rankedShows, reorder]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<RankedShow>) => {
      const index = getIndex();
      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            disabled={isActive}
            style={[styles.showRow, isActive && styles.showRowActive]}
          >
            <Text style={styles.rank}>#{(index ?? 0) + 1}</Text>
            <Text style={styles.showName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.dragHandle}>☰</Text>
          </Pressable>
        </ScaleDecorator>
      );
    },
    []
  );

  const renderFooter = useCallback(() => <AddShowInput />, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Shows</Text>
        <View style={styles.toggle}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "list" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "list" && styles.toggleTextActive,
              ]}
            >
              List
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "cloud" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("cloud")}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "cloud" && styles.toggleTextActive,
              ]}
            >
              Cloud
            </Text>
          </Pressable>
        </View>
      </View>

      {rankedShows === undefined ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : viewMode === "list" ? (
        <DraggableFlatList
          data={rankedShows as RankedShow[]}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No shows ranked yet.</Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.cloudPlaceholder}>
          <Text style={styles.cloudPlaceholderText}>
            Theatre Cloud coming soon!
          </Text>
        </View>
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  showRowActive: {
    backgroundColor: "#e8e8e8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  rank: {
    fontSize: 14,
    fontWeight: "bold",
    width: 36,
    color: "#333",
  },
  showName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  dragHandle: {
    fontSize: 18,
    color: "#ccc",
    paddingLeft: 8,
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
  footer: {
    marginTop: 4,
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
    overflow: "hidden",
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
  resultsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
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
  cloudPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  cloudPlaceholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
});
