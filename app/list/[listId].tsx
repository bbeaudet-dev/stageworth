import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ listId?: string; name?: string; seen?: string }>();
  const listId = params.listId ?? "";
  const isSeen = params.seen === "1" || listId === "seen";
  const title = typeof params.name === "string" && params.name.trim().length > 0
    ? params.name
    : "List";

  const seenList = useQuery(api.lists.getSeenDerivedList, isSeen ? {} : "skip");
  const regularList = useQuery(
    api.lists.getListById,
    !isSeen && listId ? { listId: listId as Id<"userLists"> } : "skip"
  );

  const rows = (isSeen ? (seenList?.shows ?? []) : (regularList?.shows ?? [])) as {
    _id: string;
    name: string;
  }[];
  const count = rows.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <View style={styles.headerRow}>
        <Text style={styles.countText}>{count} shows</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>No shows in this list yet.</Text>
        ) : (
          rows.map((show) => (
            <View key={show._id} style={styles.row}>
              <Text style={styles.name}>{show.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e1e1e1",
  },
  countText: {
    fontSize: 13,
    color: "#777",
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 15,
    color: "#8a8a8a",
  },
  row: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  name: {
    fontSize: 16,
    color: "#222",
    fontWeight: "600",
  },
});
