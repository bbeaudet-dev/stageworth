import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Props {
  visible: boolean;
  onClose: () => void;
  alreadyOnTripShowIds: Set<string>;
  onAddShow: (showId: Id<"shows">) => Promise<void>;
}

export function AddShowToTripSheet({ visible, onClose, alreadyOnTripShowIds, onAddShow }: Props) {
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

  const [query, setQuery] = useState("");
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const allShows = useQuery(api.shows.list);

  const results = useMemo(() => {
    if (!allShows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return allShows.slice(0, 30);
    return allShows.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 40);
  }, [allShows, query]);

  const handleAdd = async (showId: Id<"shows">) => {
    const sid = String(showId);
    if (addingIds.has(sid)) return;
    setAddingIds((prev) => new Set(prev).add(sid));
    try {
      await onAddShow(showId);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    }
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.headerTitle, { color: primaryTextColor }]}>Add a Show</Text>
          <Pressable onPress={handleClose}>
            <Text style={[styles.headerCancel, { color: accentColor }]}>Done</Text>
          </Pressable>
        </View>

        {/* Search input */}
        <View style={[styles.searchRow, { backgroundColor: chipBg, borderColor }]}>
          <IconSymbol size={15} name="magnifyingglass" color={mutedTextColor} />
          <TextInput
            style={[styles.searchInput, { color: primaryTextColor }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search shows…"
            placeholderTextColor={mutedTextColor}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ color: mutedTextColor, fontSize: 18, lineHeight: 18 }}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Results */}
        {allShows === undefined ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {results.length === 0 ? (
              <Text style={[styles.emptyText, { color: mutedTextColor }]}>
                {query.trim() ? `No shows matching "${query}"` : "No shows yet."}
              </Text>
            ) : (
              results.map((show) => {
                const sid = String(show._id);
                const isOnTrip = alreadyOnTripShowIds.has(sid);
                const isAdding = addingIds.has(sid);
                const image = show.images?.[0] ?? null;

                return (
                  <View key={sid} style={[styles.row, { borderBottomColor: borderColor }]}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: chipBg }]}>
                        <Text style={[styles.thumbFallbackText, { color: mutedTextColor }]} numberOfLines={2}>
                          {show.name}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.showName, { color: primaryTextColor }]} numberOfLines={2}>
                      {show.name}
                    </Text>
                    {isOnTrip ? (
                      <View style={[styles.addedBadge, { backgroundColor: accentColor + "18" }]}>
                        <Text style={[styles.addedBadgeText, { color: accentColor }]}>✓ Added</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.addBtn, { backgroundColor: accentColor }, isAdding && styles.disabled]}
                        onPress={() => handleAdd(show._id)}
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.addBtnText}>+ Add</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerCancel: { fontSize: 15, fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 15 },
  loading: { paddingVertical: 32, alignItems: "center" },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  emptyText: { fontSize: 14, fontStyle: "italic", paddingVertical: 16, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 42,
    height: 56,
    borderRadius: 4,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbFallbackText: { fontSize: 9, fontWeight: "600", textAlign: "center" },
  showName: { flex: 1, fontSize: 14, fontWeight: "600" },
  addedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addedBadgeText: { fontSize: 12, fontWeight: "700" },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 54,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
