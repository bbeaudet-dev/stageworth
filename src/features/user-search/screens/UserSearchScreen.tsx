import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const MAX_RECENT_SEARCHES = 6;

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

type SearchRow = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
  viewerFollows: boolean;
};

export default function UserSearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const chipBg = Colors[theme].surface;

  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const queryText = input.trim();

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }, [])
  );

  const results = useQuery(api.profiles.searchUsers, { q: queryText });
  const currentUserId = useQuery(api.auth.getConvexUserIdQuery);

  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const [pendingFollowUserId, setPendingFollowUserId] = useState<string | null>(null);

  const navigateToProfile = useCallback(
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
        pathname: "/user/[username]",
        params: { username },
      });
    },
    [queryText, router]
  );

  const handleToggleFollow = useCallback(
    async (userId: Id<"users">, viewerFollows: boolean) => {
      setPendingFollowUserId(String(userId));
      try {
        if (viewerFollows) {
          await unfollowUser({ userId });
        } else {
          await followUser({ userId });
        }
      } finally {
        setPendingFollowUserId(null);
      }
    },
    [followUser, unfollowUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) => {
      const displayName = item.name?.trim() || item.username;
      const busy = pendingFollowUserId === String(item._id);
      const isSelf = currentUserId !== undefined && item._id === currentUserId;

      return (
        <View
          style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}
        >
          <Pressable
            style={styles.rowMain}
            onPress={() => navigateToProfile(item.username)}
          >
            <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
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
              onPress={() => handleToggleFollow(item._id, item.viewerFollows)}
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
                  color={item.viewerFollows ? mutedTextColor : "#fff"}
                />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    item.viewerFollows
                      ? { color: primaryTextColor }
                      : { color: "#fff" },
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
      handleToggleFollow,
      mutedTextColor,
      navigateToProfile,
      pendingFollowUserId,
      primaryTextColor,
      surfaceColor,
    ]
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
        {queryText.length === 0
          ? "Recently joined"
          : "Search results"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Search Users",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchField,
            { backgroundColor: chipBg, borderColor },
          ]}
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
