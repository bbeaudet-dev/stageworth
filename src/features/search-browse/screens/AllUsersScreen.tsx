import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

type UserRow = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
  viewerFollows: boolean;
};

export default function AllUsersScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const users = useQuery(api.social.profiles.listAllUsers, { q: query, limit: 200 });
  const { toggleFollow, isFollowPending } = useFollowToggle();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;

  const isLoading = users === undefined;

  const renderItem = useCallback(
    ({ item }: { item: UserRow }) => {
      const displayName = item.name?.trim() || item.username;
      const busy = isFollowPending(item._id);

      return (
        <View style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}>
          <Pressable
            style={styles.rowMain}
            onPress={() =>
              router.push({ pathname: "/user/[username]", params: { username: item.username } })
            }
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
              <Text style={[styles.name, { color: primaryTextColor }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.handle, { color: mutedTextColor }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => toggleFollow(item._id, item.viewerFollows)}
            style={[
              styles.followBtn,
              item.viewerFollows
                ? { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor }
                : { backgroundColor: accentColor },
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
                  { color: item.viewerFollows ? primaryTextColor : onAccent },
                ]}
              >
                {item.viewerFollows ? "Following" : "Follow"}
              </Text>
            )}
          </Pressable>
        </View>
      );
    },
    [
      accentColor,
      borderColor,
      isFollowPending,
      mutedTextColor,
      onAccent,
      primaryTextColor,
      router,
      surfaceColor,
      toggleFollow,
    ],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "All Users",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <View style={[styles.searchWrap, { borderColor, backgroundColor: surfaceColor }]}>
        <IconSymbol name="magnifyingglass" size={16} color={mutedTextColor} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search users"
          placeholderTextColor={mutedTextColor}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: primaryTextColor }]}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <IconSymbol name="xmark.circle.fill" size={16} color={mutedTextColor} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={accentColor} />
      ) : (
        <FlatList
          data={users as UserRow[]}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>
              {query.trim().length > 0 ? "No users match that search." : "No users yet."}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
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
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  handle: {
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
  followBtnDisabled: { opacity: 0.7 },
  followBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
