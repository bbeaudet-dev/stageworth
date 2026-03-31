import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Category = "shows" | "visits" | "theatres";
type Scope = "all" | "friends";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "shows", label: "Shows" },
  { key: "visits", label: "Visits" },
  { key: "theatres", label: "Theatres" },
];

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const [category, setCategory] = useState<Category>("shows");
  const [scope, setScope] = useState<Scope>("all");

  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  const segmentBg = theme === "dark" ? "#111115" : "#fff";
  const segmentBgActive = theme === "dark" ? "#fff" : "#1f1f1f";
  const segmentText = theme === "dark" ? "#b0b4bc" : "#444";
  const segmentTextActive = theme === "dark" ? "#111" : "#fff";

  const showsData = useQuery(
    api.leaderboard.getByShows,
    category === "shows" ? { scope } : "skip",
  );
  const visitsData = useQuery(
    api.leaderboard.getByVisits,
    category === "visits" ? { scope, mode: "total" } : "skip",
  );
  const theatresData = useQuery(
    api.leaderboard.getByTheatres,
    category === "theatres" ? { scope } : "skip",
  );

  const data =
    category === "shows"
      ? showsData
      : category === "visits"
        ? visitsData
        : theatresData;

  const countLabel =
    category === "shows"
      ? "shows"
      : category === "visits"
        ? "visits"
        : "theatres";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol size={20} name="chevron.left" color={accentColor} />
        </Pressable>
        <Text style={[styles.title, { color: primaryTextColor }]}>
          Leaderboard
        </Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Category chips */}
      <View style={styles.filtersRow}>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.chip,
                { borderColor: borderColor, backgroundColor: segmentBg },
                category === cat.key && {
                  backgroundColor: segmentBgActive,
                  borderColor: segmentBgActive,
                },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: segmentText },
                  category === cat.key && { color: segmentTextActive },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.scopeToggle, { borderColor }]}
          onPress={() => setScope(scope === "all" ? "friends" : "all")}
        >
          <Text style={[styles.scopeText, { color: mutedTextColor }]}>
            {scope === "all" ? "All Users" : "Friends"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.user._id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          data === undefined ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>
              Loading...
            </Text>
          ) : (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>
              No data yet.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/community/user/[username]",
                params: { username: item.user.username },
              })
            }
          >
            <Text style={[styles.rankNum, { color: mutedTextColor }]}>
              {item.rank}
            </Text>
            <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
              {item.user.avatarUrl ? (
                <Image
                  source={{ uri: item.user.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: accentColor }]}>
                  {getInitials(item.user.name, item.user.username)}
                </Text>
              )}
            </View>
            <View style={styles.rowText}>
              <Text
                style={[styles.rowName, { color: primaryTextColor }]}
                numberOfLines={1}
              >
                {item.user.name?.trim() || item.user.username}
              </Text>
              <Text style={[styles.rowHandle, { color: mutedTextColor }]}>
                @{item.user.username}
              </Text>
            </View>
            <Text style={[styles.countText, { color: primaryTextColor }]}>
              {item.count}
            </Text>
            <Text style={[styles.countLabel, { color: mutedTextColor }]}>
              {countLabel}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scopeToggle: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scopeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  rankNum: {
    fontSize: 15,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  countText: {
    fontSize: 18,
    fontWeight: "700",
  },
  countLabel: {
    fontSize: 11,
    fontWeight: "500",
    width: 50,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
});
