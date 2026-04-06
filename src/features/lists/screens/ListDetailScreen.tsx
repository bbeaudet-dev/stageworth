import { Image } from "expo-image";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

const COLS = 4;
const GAP = 8;
const PAD = 16;

const SYSTEM_LIST_INFO: Record<string, string> = {
  seen: "Auto-generated from all of your saved visits.",
  uncategorized:
    "Newly announced shows are auto-added here. Shows are auto-removed once added to your Visits or to another List.",
  want_to_see: "Shows you plan to see soon. Moving a show here removes it from Uncategorized and Look Into.",
  look_into: "A shortlist for shows you want to research more before deciding.",
  not_interested: "Shows you have no current interest in seeing.",
};

export default function ListDetailScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{
    listId?: string;
    name?: string;
    seen?: string;
    systemKey?: string;
  }>();
  const listId = params.listId ?? "";
  const isSeen = params.seen === "1" || listId === "seen";
  const systemKey = typeof params.systemKey === "string" ? params.systemKey : undefined;
  const title =
    typeof params.name === "string" && params.name.trim().length > 0 ? params.name : "List";

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
    if (!systemKey) return "This is a system list.";
    return SYSTEM_LIST_INFO[systemKey] ?? "This is a system list.";
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
      .filter((show) => (lower.length === 0 ? true : show.name.toLowerCase().includes(lower)))
      .slice(0, 20);
  }, [allShows, rows, showQuery]);

  const onAddShow = async (showId: Id<"shows">) => {
    if (isSeen || !regularList || isAddingShow) return;
    setIsAddingShow(true);
    try {
      await addShowToList({ listId: regularList._id, showId });
      setShowQuery("");
    } finally {
      setIsAddingShow(false);
    }
  };

  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const cardWidth = (screenWidth - PAD * 2 - GAP * (COLS - 1)) / COLS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{ title, headerShown: true, headerBackButtonDisplayMode: "minimal" }}
      />

      {/* Meta row */}
      <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
        <Text style={[styles.countText, { color: c.mutedText }]}>{count} shows</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {isSystemList ? (
            <Pressable style={styles.infoButton} onPress={() => setShowInfo((p) => !p)}>
              <IconSymbol size={14} name="info.circle" color={c.accent} />
              <Text style={[styles.infoButtonText, { color: c.accent }]}>About</Text>
            </Pressable>
          ) : null}
          {!isSeen ? (
            <Pressable
              style={[styles.addToggle, { borderColor: c.border }]}
              onPress={() => setShowSearchOpen((p) => !p)}
            >
              <IconSymbol size={13} name={showSearchOpen ? "xmark.circle" : "plus.circle"} color={c.accent} />
              <Text style={[styles.infoButtonText, { color: c.accent }]}>
                {showSearchOpen ? "Done" : "Add show"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showInfo && isSystemList ? (
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.infoText, { color: c.mutedText }]}>{infoText}</Text>
        </View>
      ) : null}

      {/* Description for custom lists */}
      {!isSystemList && regularList ? (
        <View style={styles.descriptionBlock}>
          {isEditingDescription ? (
            <>
              <TextInput
                style={[
                  styles.descriptionInput,
                  { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                ]}
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
                  style={[styles.secondaryButton, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => { setDescriptionDraft(regularList.description ?? ""); setIsEditingDescription(false); }}
                >
                  <Text style={[styles.secondaryButtonText, { color: c.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveDescriptionButton, { backgroundColor: c.accent }, isSavingDescription && styles.disabledButton]}
                  onPress={saveDescription}
                  disabled={isSavingDescription}
                >
                  <Text style={[styles.saveDescriptionText, { color: c.onAccent }]}>
                    {isSavingDescription ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.descriptionPreviewRow}>
              <Text style={[styles.descriptionPreviewText, { color: c.mutedText }]} numberOfLines={2}>
                {regularList.description?.trim() || "No description yet."}
              </Text>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => setIsEditingDescription(true)}
              >
                <Text style={[styles.secondaryButtonText, { color: c.text }]}>Edit</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {/* Add show search inline */}
      {showSearchOpen && regularList ? (
        <View style={[styles.searchBlock, { borderBottomColor: c.border, backgroundColor: c.background }]}>
          <View style={[styles.searchInputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <IconSymbol size={14} name="magnifyingglass" color={c.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: c.text }]}
              value={showQuery}
              onChangeText={setShowQuery}
              placeholder="Search shows to add..."
              placeholderTextColor={c.mutedText}
              autoCapitalize="words"
              autoFocus
            />
            {showQuery.length > 0 && (
              <Pressable onPress={() => setShowQuery("")} hitSlop={8}>
                <Text style={{ color: c.mutedText, fontSize: 16, lineHeight: 18 }}>×</Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            style={[styles.searchResults, { backgroundColor: c.surface, borderColor: c.border }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!allShows ? (
              <ActivityIndicator style={{ margin: 12 }} color={c.accent} />
            ) : filteredShowResults.length === 0 ? (
              <Text style={[styles.noResults, { color: c.mutedText }]}>
                {showQuery.trim().length > 0 ? "No matches." : "Type to search shows…"}
              </Text>
            ) : (
              filteredShowResults.map((show) => (
                <Pressable
                  key={show._id}
                  style={[styles.searchRow, { borderBottomColor: c.border }]}
                  onPress={() => onAddShow(show._id as Id<"shows">)}
                  disabled={isAddingShow}
                >
                  <Text style={[styles.searchRowName, { color: c.text }]}>{show.name}</Text>
                  {isAddingShow ? null : (
                    <IconSymbol size={14} name="plus.circle" color={c.accent} />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* Main grid */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: PAD, paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {rows.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedText }]}>No shows in this list yet.</Text>
        ) : (
          chunkRows(rows, COLS).map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((show) => {
                const image = show.images?.[0];
                return (
                  <Pressable
                    key={show._id}
                    style={[styles.playbillCard, { width: cardWidth, backgroundColor: c.surfaceElevated }]}
                    onPress={() =>
                      router.push({
                        pathname: "/show/[showId]",
                        params: { showId: String(show._id), name: show.name },
                      })
                    }
                  >
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        style={[
                          styles.playbillImg,
                          { backgroundColor: playbillMatBackground(theme) },
                        ]}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.playbillFb, { backgroundColor: c.surface }]}>
                        <Text style={[styles.playbillFbText, { color: c.mutedText }]} numberOfLines={4}>
                          {show.name}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {row.length < COLS
                ? Array.from({ length: COLS - row.length }).map((_, i) => (
                    <View key={i} style={{ width: cardWidth }} />
                  ))
                : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoButtonText: { fontSize: 13, fontWeight: "600" },
  addToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  infoText: { fontSize: 13, lineHeight: 18 },
  descriptionBlock: { marginHorizontal: 16, marginTop: 10, gap: 8 },
  descriptionInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 40,
  },
  descriptionActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  descriptionPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  descriptionPreviewText: { flex: 1, fontSize: 13 },
  secondaryButton: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 6 },
  secondaryButtonText: { fontSize: 12, fontWeight: "700" },
  saveDescriptionButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveDescriptionText: { fontWeight: "700", fontSize: 12 },
  disabledButton: { opacity: 0.6 },
  countText: { fontSize: 13, fontWeight: "600" },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 260,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchResults: { borderRadius: 10, flexGrow: 0 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRowName: { flex: 1, fontSize: 14, fontWeight: "500" },
  noResults: { fontSize: 13, paddingHorizontal: 12, paddingVertical: 12 },
  content: { paddingTop: 14, gap: 0 },
  emptyText: { fontSize: 15, marginTop: 24 },
  gridRow: { flexDirection: "row", gap: GAP, marginBottom: GAP },
  playbillCard: { borderRadius: 10, overflow: "hidden" },
  playbillImg: { width: "100%", aspectRatio: 2 / 3 },
  playbillFb: {
    width: "100%",
    aspectRatio: 2 / 3,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  playbillFbText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
