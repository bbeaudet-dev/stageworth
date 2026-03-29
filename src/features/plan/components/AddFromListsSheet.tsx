import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { BottomSheet } from "@/components/bottom-sheet";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface AddFromListsSheetProps {
  visible: boolean;
  onClose: () => void;
  tripId: Id<"trips">;
  alreadyOnTripShowIds: Set<string>;
  onAddShow: (showId: Id<"shows">) => Promise<void>;
}

export function AddFromListsSheet({
  visible,
  onClose,
  tripId,
  alreadyOnTripShowIds,
  onAddShow,
}: AddFromListsSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const chipBg = Colors[theme].surface;

  const profileLists = useQuery(api.lists.getProfileLists);

  // Which list is expanded
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Track adding state per show
  const [pendingShowIds, setPendingShowIds] = useState<Set<string>>(() => new Set());

  const handleAddShow = async (showId: Id<"shows">) => {
    const key = String(showId);
    if (pendingShowIds.has(key)) return;
    setPendingShowIds((prev) => new Set(prev).add(key));
    try {
      await onAddShow(showId);
    } finally {
      setPendingShowIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const systemLists = profileLists?.systemLists ?? [];
  const customLists = profileLists?.customLists ?? [];

  const allLists: Array<{
    id: string;
    name: string;
    showCount: number;
    listId: string | "seen";
    systemKey?: string;
    isSeen?: boolean;
  }> = [
    {
      id: "seen",
      name: "Seen",
      showCount: profileLists?.seen.showCount ?? 0,
      listId: "seen",
      isSeen: true,
    },
    ...systemLists.map((l) => ({
      id: String(l._id),
      name: l.name,
      showCount: l.showCount,
      listId: String(l._id),
      systemKey: l.systemKey,
    })),
    ...customLists.map((l) => ({
      id: String(l._id),
      name: l.name,
      showCount: l.showCount,
      listId: String(l._id),
    })),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View
        style={[
          styles.sheet,
          { backgroundColor, paddingBottom: insets.bottom + 8 },
        ]}
      >
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: primaryTextColor }]}>
              Add from Lists
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.doneText, { color: accentColor }]}>Done</Text>
            </Pressable>
          </View>

          {profileLists === undefined ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {allLists.map((list) => {
                const isExpanded = expandedListId === list.id;
                return (
                  <View
                    key={list.id}
                    style={[styles.listGroup, { backgroundColor: surfaceColor, borderColor }]}
                  >
                    <Pressable
                      style={styles.listGroupHeader}
                      onPress={() =>
                        setExpandedListId(isExpanded ? null : list.id)
                      }
                    >
                      <View style={styles.listGroupInfo}>
                        <Text style={[styles.listGroupName, { color: primaryTextColor }]}>
                          {list.name}
                        </Text>
                        <Text style={[styles.listGroupCount, { color: mutedTextColor }]}>
                          {list.showCount} shows
                        </Text>
                      </View>
                      <Text style={[styles.chevron, { color: mutedTextColor }]}>
                        {isExpanded ? "▲" : "▼"}
                      </Text>
                    </Pressable>

                    {isExpanded ? (
                      <ExpandedList
                        listId={list.listId}
                        isSeen={list.isSeen}
                        alreadyOnTripShowIds={alreadyOnTripShowIds}
                        pendingShowIds={pendingShowIds}
                        onAddShow={handleAddShow}
                        primaryTextColor={primaryTextColor}
                        mutedTextColor={mutedTextColor}
                        accentColor={accentColor}
                        chipBg={chipBg}
                        borderColor={borderColor}
                      />
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
      </View>
    </BottomSheet>
  );
}

function ExpandedList({
  listId,
  isSeen,
  alreadyOnTripShowIds,
  pendingShowIds,
  onAddShow,
  primaryTextColor,
  mutedTextColor,
  accentColor,
  chipBg,
  borderColor,
}: {
  listId: string;
  isSeen?: boolean;
  alreadyOnTripShowIds: Set<string>;
  pendingShowIds: Set<string>;
  onAddShow: (showId: Id<"shows">) => Promise<void>;
  primaryTextColor: string;
  mutedTextColor: string;
  accentColor: string;
  chipBg: string;
  borderColor: string;
}) {
  const listData = useQuery(
    api.lists.getListById,
    !isSeen && listId !== "seen"
      ? { listId: listId as Id<"userLists"> }
      : "skip"
  );

  const seenData = useQuery(
    api.lists.getSeenDerivedList,
    isSeen ? {} : "skip"
  );

  const shows = isSeen ? seenData?.shows : listData?.shows;
  const isLoading = isSeen ? seenData === undefined : listData === undefined;

  if (isLoading) {
    return (
      <View style={styles.expandedLoading}>
        <ActivityIndicator color={accentColor} size="small" />
      </View>
    );
  }

  if (!shows || shows.length === 0) {
    return (
      <View style={styles.expandedEmpty}>
        <Text style={[styles.expandedEmptyText, { color: mutedTextColor }]}>
          No shows in this list
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.expandedShows}>
      {shows.map((show: any) => {
        const showId = String(show._id);
        const isOnTrip = alreadyOnTripShowIds.has(showId);
        const isPending = pendingShowIds.has(showId);
        const image = show.images?.[0];

        return (
          <View
            key={showId}
            style={[styles.showRow, { borderTopColor: borderColor }]}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.showThumb} contentFit="cover" />
            ) : (
              <View style={[styles.showThumbFallback, { backgroundColor: chipBg }]} />
            )}
            <Text
              style={[styles.showName, { color: primaryTextColor }]}
              numberOfLines={2}
            >
              {show.name}
            </Text>
            {isOnTrip ? (
              <View style={[styles.addedBadge, { backgroundColor: accentColor + "18" }]}>
                <Text style={[styles.addedBadgeText, { color: accentColor }]}>✓</Text>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: accentColor },
                  isPending && styles.disabledButton,
                ]}
                onPress={() => onAddShow(show._id)}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>+</Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  listGroup: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  listGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  listGroupInfo: {
    flex: 1,
  },
  listGroupName: {
    fontSize: 15,
    fontWeight: "600",
  },
  listGroupCount: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 10,
  },
  expandedLoading: {
    padding: 16,
    alignItems: "center",
  },
  expandedEmpty: {
    padding: 14,
    alignItems: "center",
  },
  expandedEmptyText: {
    fontSize: 13,
  },
  expandedShows: {
    gap: 0,
  },
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  showThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  showThumbFallback: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  showName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  addedBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addedBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
