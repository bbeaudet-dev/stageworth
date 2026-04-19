import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/components/Toast";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ShowSelectionGrid } from "@/features/onboarding/components/ShowSelectionGrid";
import { useColorScheme } from "@/hooks/use-color-scheme";

const POPULAR_LIMIT = 60;
const SEARCH_LIMIT = 50;

export default function FavoriteShowsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedQuery = query.trim();
  const popularShows = useQuery(api.shows.popular, { limit: POPULAR_LIMIT });
  const searchResults = useQuery(
    api.shows.search,
    trimmedQuery.length > 0 ? { q: trimmedQuery, limit: SEARCH_LIMIT } : "skip"
  );

  const completeShowsPhase = useMutation(api.onboarding.completeShowsPhase);

  const items = useMemo(() => {
    if (trimmedQuery.length > 0) {
      return (searchResults ?? []).map((s) => ({
        _id: s._id as Id<"shows">,
        name: s.name,
        type: s.type,
        images: s.images,
      }));
    }
    return (popularShows ?? []).map((s) => ({
      _id: s._id as Id<"shows">,
      name: s.name,
      images: s.images,
    }));
  }, [trimmedQuery, searchResults, popularShows]);

  const toggle = (showId: Id<"shows">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(showId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const showIds = Array.from(selected) as unknown as Id<"shows">[];
      await completeShowsPhase({ showIds });
      router.replace("/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save";
      showToast({ message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    (trimmedQuery.length === 0 && popularShows === undefined) ||
    (trimmedQuery.length > 0 && searchResults === undefined);
  const hasSelections = selected.size > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top"]}
    >
      <View style={styles.headerWrap}>
        <Text style={[styles.title, { color: c.text }]}>
          Select your favorite show(s)
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={16} color={c.mutedText} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search shows…"
            placeholderTextColor={c.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <IconSymbol name="xmark.circle.fill" size={16} color={c.mutedText} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : items.length === 0 ? (
          <Text style={[styles.empty, { color: c.mutedText }]}>
            {trimmedQuery.length > 0
              ? "No shows match your search."
              : "No shows available yet."}
          </Text>
        ) : (
          <ShowSelectionGrid
            items={items}
            selected={selected}
            onToggle={toggle}
          />
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 12, backgroundColor: c.background },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[
            styles.actionBtn,
            hasSelections
              ? { backgroundColor: c.accent }
              : {
                  backgroundColor: "transparent",
                  borderColor: c.border,
                  borderWidth: StyleSheet.hairlineWidth,
                },
          ]}
          onPress={handleFinish}
          disabled={isSubmitting}
        >
          <Text
            style={[
              styles.actionText,
              { color: hasSelections ? c.onAccent : c.text },
            ]}
          >
            {isSubmitting
              ? "Saving…"
              : hasSelections
                ? `Finished (${selected.size})`
                : "Skip for now"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  empty: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 60,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
