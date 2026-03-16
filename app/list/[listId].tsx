import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";

const SYSTEM_LIST_INFO: Record<string, string> = {
  seen:
    "This list is auto-generated from all of your saved visits.",
  uncategorized:
    "Newly announced shows are auto-added here. Shows are auto-removed once added to your Visits or to another List.",
  want_to_see:
    "Shows you plan to see soon. Moving a show here removes it from Uncategorized and Look Into.",
  look_into:
    "A shortlist for shows you want to research more before deciding.",
  not_interested:
    "Shows you have no current interest in seeing.",
};

export default function ListDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    listId?: string;
    name?: string;
    seen?: string;
    systemKey?: string;
  }>();
  const listId = params.listId ?? "";
  const isSeen = params.seen === "1" || listId === "seen";
  const systemKey = typeof params.systemKey === "string" ? params.systemKey : undefined;
  const title = typeof params.name === "string" && params.name.trim().length > 0
    ? params.name
    : "List";
  const updateCustomListDescription = useMutation(api.lists.updateCustomListDescription);
  const addShowToList = useMutation(api.lists.addShowToList);

  const seenList = useQuery(api.lists.getSeenDerivedList, isSeen ? {} : "skip");
  const regularList = useQuery(
    api.lists.getListById,
    !isSeen && listId ? { listId: listId as Id<"userLists"> } : "skip"
  );
  const allShows = useQuery(api.shows.list, isSeen ? "skip" : {});

  const rows = useMemo(
    () =>
      (isSeen ? (seenList?.shows ?? []) : (regularList?.shows ?? [])) as {
        _id: string;
        name: string;
        images?: string[];
      }[],
    [isSeen, regularList?.shows, seenList?.shows]
  );
  const count = rows.length;
  const isSystemList = isSeen || regularList?.kind === "system";
  const infoText = useMemo(() => {
    if (isSeen) return SYSTEM_LIST_INFO.seen;
    if (!systemKey) return "This is a system list with automatic behavior.";
    return SYSTEM_LIST_INFO[systemKey] ?? "This is a system list with automatic behavior.";
  }, [isSeen, systemKey]);
  const [showInfo, setShowInfo] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showSearchOpen, setShowSearchOpen] = useState(false);
  const [showQuery, setShowQuery] = useState("");
  const [isAddingShow, setIsAddingShow] = useState(false);

  useEffect(() => {
    if (!regularList || regularList.kind !== "custom") return;
    setDescriptionDraft(regularList.description ?? "");
  }, [regularList]);

  const saveDescription = async () => {
    if (!regularList || regularList.kind !== "custom") return;
    setIsSavingDescription(true);
    try {
      await updateCustomListDescription({
        listId: regularList._id,
        description: descriptionDraft.trim() || undefined,
      });
      setIsEditingDescription(false);
    } finally {
      setIsSavingDescription(false);
    }
  };

  const filteredShowResults = useMemo(() => {
    if (!allShows) return [];
    const lower = showQuery.trim().toLowerCase();
    const alreadyInList = new Set(rows.map((show) => show._id));
    return allShows
      .filter((show) => !alreadyInList.has(show._id))
      .filter((show) =>
        lower.length === 0 ? true : show.name.toLowerCase().includes(lower)
      )
      .slice(0, 12);
  }, [allShows, rows, showQuery]);

  const onAddShow = async (showId: Id<"shows">) => {
    if (isSeen || !regularList || isAddingShow) return;
    setIsAddingShow(true);
    try {
      await addShowToList({ listId: regularList._id, showId });
      setShowQuery("");
      setShowSearchOpen(false);
    } finally {
      setIsAddingShow(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <View style={styles.headerRow}>
        <Text style={styles.countText}>{count} shows</Text>
        {isSystemList ? (
          <Pressable style={styles.infoButton} onPress={() => setShowInfo((prev) => !prev)}>
            <IconSymbol size={14} name="info.circle" color="#2c67b8" />
            <Text style={styles.infoButtonText}>What is this list?</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
      {showInfo && isSystemList ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{infoText}</Text>
        </View>
      ) : null}

      {!isSystemList && regularList ? (
        <View style={styles.descriptionBlock}>
          {isEditingDescription ? (
            <>
              <TextInput
                style={styles.descriptionInput}
                value={descriptionDraft}
                onChangeText={setDescriptionDraft}
                placeholder="Add a short description..."
                autoCapitalize="sentences"
                blurOnSubmit
                returnKeyType="done"
                onSubmitEditing={saveDescription}
              />
              <View style={styles.descriptionActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setDescriptionDraft(regularList.description ?? "");
                    setIsEditingDescription(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveDescriptionButton, isSavingDescription && styles.disabledButton]}
                  onPress={saveDescription}
                  disabled={isSavingDescription}
                >
                  <Text style={styles.saveDescriptionText}>
                    {isSavingDescription ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.descriptionPreviewRow}>
              <Text style={styles.descriptionPreviewText} numberOfLines={2}>
                {regularList.description?.trim() || "No description yet."}
              </Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsEditingDescription(true)}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>No shows in this list yet.</Text>
        ) : (
          rows.map((show) => (
            <Pressable
              key={show._id}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/show/[showId]",
                  params: { showId: String(show._id), name: show.name },
                })
              }
            >
              <Text style={styles.name}>{show.name}</Text>
            </Pressable>
          ))
        )}

        {!isSeen ? (
          <View style={styles.addShowContainer}>
            <Pressable
              style={styles.addShowToggle}
              onPress={() => setShowSearchOpen((prev) => !prev)}
            >
              <IconSymbol
                size={14}
                name={showSearchOpen ? "xmark.circle" : "plus.circle"}
                color="#2c67b8"
              />
              <Text style={styles.infoButtonText}>
                {showSearchOpen ? "Cancel" : "Add show"}
              </Text>
            </Pressable>

            {showSearchOpen && regularList ? (
              <View style={styles.addShowBlock}>
                <TextInput
                  style={styles.addShowInput}
                  value={showQuery}
                  onChangeText={setShowQuery}
                  placeholder="Search shows to add..."
                  autoCapitalize="words"
                />
                <View style={styles.addShowResults}>
                  {filteredShowResults.length === 0 ? (
                    <Text style={styles.noSearchResultsText}>No matches.</Text>
                  ) : (
                    filteredShowResults.map((show) => (
                      <Pressable
                        key={show._id}
                        style={styles.addShowRow}
                        onPress={() => onAddShow(show._id)}
                        disabled={isAddingShow}
                      >
                        <Text style={styles.addShowName}>{show.name}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e1e1e1",
  },
  infoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoButtonText: {
    fontSize: 13,
    color: "#2c67b8",
    fontWeight: "600",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#c6dcff",
    backgroundColor: "#eef5ff",
    padding: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#34507a",
    lineHeight: 18,
  },
  descriptionBlock: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  descriptionInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 40,
  },
  descriptionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  descriptionPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  descriptionPreviewText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cfcfcf",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "700",
  },
  saveDescriptionButton: {
    borderRadius: 8,
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveDescriptionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
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
  addShowBlock: {
    gap: 8,
  },
  addShowContainer: {
    marginTop: 8,
    gap: 8,
  },
  addShowToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  addShowInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addShowResults: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  addShowRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ededed",
  },
  addShowName: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },
  noSearchResultsText: {
    fontSize: 13,
    color: "#999",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
