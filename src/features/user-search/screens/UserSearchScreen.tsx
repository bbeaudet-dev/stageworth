import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFollowToggle } from "@/hooks/use-follow-toggle";
import { getInitials } from "@/utils/user";

const MAX_RECENT_SEARCHES = 6;

type SearchRow = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
  viewerFollows: boolean;
};

export default function UserSearchScreen() {
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;

  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const queryText = input.trim();

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }, []),
  );

  const results = useQuery(api.social.profiles.searchUsers, { q: queryText });
  const currentUserId = useQuery(api.auth.getConvexUserIdQuery);

  const { toggleFollow, isFollowPending } = useFollowToggle();

  const openProfile = useCallback(
    (username: string) => {
      const q = queryText;
      if (q.length >= 1) {
        setRecentSearches((prev) => {
          const next = [
            q,
            ...prev.filter((t) => t.toLowerCase() !== q.toLowerCase()),
          ];
          return next.slice(0, MAX_RECENT_SEARCHES);
        });
      }
      router.push({
        pathname: "/(tabs)/community/user/[username]",
        params: { username },
      });
    },
    [queryText, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) => {
      const displayName = item.name?.trim() || item.username;
      const busy = isFollowPending(item._id);
      const isSelf = currentUserId !== undefined && item._id === currentUserId;

      return (
        <View
          style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}
        >
          <Pressable
            style={styles.rowMain}
            onPress={() => openProfile(item.username)}
          >
            <View
              style={[styles.avatar, { backgroundColor: accentColor + "22" }]}
            >
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: accentColor }]}>
                  {getInitials(item.name, item.username)}
                </Text>
              )}
            </View>
            <View style={styles.rowText}>
              <Text
                style={[styles.rowName, { color: primaryTextColor }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={[styles.rowUsername, { color: mutedTextColor }]}
                numberOfLines={1}
              >
                @{item.username}
              </Text>
            </View>
          </Pressable>
          {isSelf ? (
            <View style={styles.selfBadge}>
              <Text style={[styles.selfBadgeText, { color: mutedTextColor }]}>
                You
              </Text>
            </View>
          ) : (
            <Pressable
              disabled={busy}
              onPress={() => toggleFollow(item._id, item.viewerFollows)}
              style={[
                styles.followBtn,
                item.viewerFollows
                  ? {
                      backgroundColor: "transparent",
                      borderColor,
                      borderWidth: StyleSheet.hairlineWidth,
                    }
                  : { backgroundColor: accentColor, borderWidth: 0 },
                busy && styles.followBtnDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={item.viewerFollows ? mutedTextColor : onAccent}
                />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    item.viewerFollows
                      ? { color: primaryTextColor }
                      : { color: onAccent },
                  ]}
                >
                  {item.viewerFollows ? "Following" : "Follow"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      );
    },
    [
      accentColor,
      borderColor,
      currentUserId,
      isFollowPending,
      mutedTextColor,
      openProfile,
      primaryTextColor,
      surfaceColor,
      toggleFollow,
    ],
  );

  const listEmpty =
    results !== undefined && results.length === 0 ? (
      <Text style={[styles.emptyHint, { color: mutedTextColor }]}>
        {queryText.length > 0
          ? `No users match "${queryText}".`
          : "Nothing to show yet."}
      </Text>
    ) : null;

  const listHeader = (
    <View style={styles.listHeader}>
      {recentSearches.length > 0 ? (
        <View style={styles.recentBlock}>
          <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>
            Recent searches
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentChipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {recentSearches.map((term) => (
              <Pressable
                key={term}
                onPress={() => setInput(term)}
                style={[
                  styles.recentChip,
                  { backgroundColor: chipBg, borderColor },
                ]}
              >
                <Text
                  style={[styles.recentChipText, { color: primaryTextColor }]}
                  numberOfLines={1}
                >
                  {term}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>
        {queryText.length === 0 ? "Recently joined" : "Search results"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top", "bottom"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={primaryTextColor} />
        </Pressable>
        <Text style={[styles.navTitle, { color: primaryTextColor }]}>Search Users</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchWrap}>
        <View
          style={[styles.searchField, { backgroundColor: chipBg, borderColor }]}
        >
          <IconSymbol size={18} name="magnifyingglass" color={mutedTextColor} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: primaryTextColor }]}
            value={input}
            onChangeText={setInput}
            placeholder="Name or @username"
            placeholderTextColor={mutedTextColor}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {results === undefined ? (
        <ActivityIndicator style={styles.loader} color={accentColor} />
      ) : (
        <FlatList
          data={results as SearchRow[]}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    alignItems: "center",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loader: {
    marginTop: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 12,
    gap: 10,
  },
  recentBlock: {
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  recentChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  recentChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  followBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnDisabled: {
    opacity: 0.7,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  selfBadge: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  selfBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
