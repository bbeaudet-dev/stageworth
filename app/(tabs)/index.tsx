import { useMutation, useQuery } from "convex/react";
import { useState, useCallback, memo } from "react";
import {
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

type RankedShow = {
  _id: Id<"shows">;
  _creationTime: number;
  name: string;
  type: "musical" | "play" | "opera" | "dance" | "other";
  subtype?: string;
  images: string[];
  tier?: "liked" | "neutral" | "disliked";
};

const AddShowInput = memo(function AddShowInput() {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");

  const createShow = useMutation(api.shows.create);
  const addToRankings = useMutation(api.rankings.addShow);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }

    const showId = await createShow({
      name: trimmed,
      type: "musical",
      images: [],
    });

    await addToRankings({
      showId,
      tier: "liked",
      position: Infinity,
    });

    setName("");
    setIsAdding(false);
    Keyboard.dismiss();
  };

  if (!isAdding) {
    return (
      <View style={styles.footer}>
        <Pressable style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Text style={styles.addButtonText}>+ Add Show</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.footer}>
      <View style={styles.addInputRow}>
        <TextInput
          style={styles.addInput}
          value={name}
          onChangeText={setName}
          placeholder="Show name..."
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <View style={styles.addActions}>
          <Pressable
            onPress={() => {
              setName("");
              setIsAdding(false);
              Keyboard.dismiss();
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSubmit} style={styles.confirmButton}>
            <Text style={styles.confirmText}>Add</Text>
          </Pressable>
        </View>
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
  addInputRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
    overflow: "hidden",
  },
  addInput: {
    padding: 14,
    fontSize: 15,
  },
  addActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#ddd",
  },
  cancelText: {
    fontSize: 14,
    color: "#999",
  },
  confirmButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
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
