import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useToast } from "@/components/Toast";

interface Props {
  visible: boolean;
  showId: Id<"shows"> | null;
  showName: string;
  onClose: () => void;
}

export function AddToListSheet({ visible, showId, showName, onClose }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [addingToList, setAddingToList] = useState(false);
  const [optimisticallyInLists, setOptimisticallyInLists] = useState<Set<string>>(new Set());

  // Reset optimistic state whenever the sheet opens for a different show
  useEffect(() => {
    setOptimisticallyInLists(new Set());
  }, [showId]);

  const myLists = useQuery(
    api.lists.getProfileLists,
    visible && showId ? { showId } : "skip"
  );
  const addShowToList = useMutation(api.lists.addShowToList);
  const removeShowFromList = useMutation(api.lists.removeShowFromList);

  const allLists = [
    ...(myLists?.systemLists ?? []),
    ...(myLists?.customLists ?? []),
  ];

  async function handleAddToList(listId: Id<"userLists">, listName: string) {
    if (!showId || addingToList) return;
    setOptimisticallyInLists((prev) => new Set([...prev, listId]));
    onClose();
    showToast({ message: `Added "${showName}" to ${listName}` });
    setAddingToList(true);
    try {
      await addShowToList({ listId, showId });
    } catch {
      setOptimisticallyInLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    } finally {
      setAddingToList(false);
    }
  }

  async function handleRemoveFromList(listId: Id<"userLists">, listName: string) {
    if (!showId || addingToList) return;
    setOptimisticallyInLists((prev) => {
      const next = new Set(prev);
      next.delete(listId);
      return next;
    });
    onClose();
    showToast({ message: `Removed "${showName}" from ${listName}` });
    setAddingToList(true);
    try {
      await removeShowFromList({ listId, showId });
    } finally {
      setAddingToList(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
        <View style={[s.handle, { backgroundColor: c.border }]} />
        <Text style={[s.title, { color: c.text }]}>Add to List</Text>
        <ScrollView>
          {allLists.length === 0 ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : (
            allLists.map((list) => {
              const alreadyIn = (list.containsShow ?? false) || optimisticallyInLists.has(list._id);
              return (
                <Pressable
                  key={list._id}
                  style={({ pressed }) => [
                    s.row,
                    { borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() =>
                    alreadyIn
                      ? handleRemoveFromList(list._id as Id<"userLists">, list.name)
                      : handleAddToList(list._id as Id<"userLists">, list.name)
                  }
                  disabled={addingToList}
                >
                  <Text style={[s.rowText, { color: alreadyIn ? c.mutedText : c.text }]}>
                    {list.name}
                  </Text>
                  {alreadyIn ? (
                    <Text style={[s.rowCheck, { color: c.accent }]}>✓</Text>
                  ) : (
                    <Text style={[s.rowCount, { color: c.mutedText }]}>{list.showCount}</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    maxHeight: "65%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  loadingRow: {
    alignItems: "center",
    paddingVertical: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16, fontWeight: "600" },
  rowCount: { fontSize: 14, fontWeight: "500" },
  rowCheck: { fontSize: 19, fontWeight: "700" },
});
