import { Canvas, LinearGradient, RoundedRect, vec } from "@shopify/react-native-skia";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { BRAND_BLUE, BRAND_PURPLE, Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

// ─── types ────────────────────────────────────────────────────────────────────

type Category = "shows" | "visits" | "theatres" | "signups" | "streak" | "score";
type Scope = "all" | "friends";
type VisitsMode = "total" | "single_show" | "select_show";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "shows", label: "Shows" },
  { key: "visits", label: "Visits" },
  { key: "theatres", label: "Theatres" },
  { key: "signups", label: "Signups" },
  { key: "streak", label: "Streak" },
  { key: "score", label: "Score" },
];

const VISITS_MODES: { key: VisitsMode; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "single_show", label: "Single Show" },
  { key: "select_show", label: "Select Show" },
];

const ROW_RADIUS = 12;

// ─── gradient row background ─────────────────────────────────────────────────

type RowSize = { width: number; height: number };

function GradientRowBg({ rank, size }: { rank: number; size: RowSize }) {
  if (rank > 3 || size.width === 0) return null;
  const alpha = rank === 1 ? "ff" : rank === 2 ? "66" : "28";
  return (
    <Canvas style={[StyleSheet.absoluteFill, { borderRadius: ROW_RADIUS }]}>
      <RoundedRect x={0} y={0} width={size.width} height={size.height} r={ROW_RADIUS}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(size.width, 0)}
          colors={[BRAND_BLUE + alpha, BRAND_PURPLE + alpha]}
        />
      </RoundedRect>
    </Canvas>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const [category, setCategory] = useState<Category>("shows");
  const [scope, setScope] = useState<Scope>("all");
  const [visitsMode, setVisitsMode] = useState<VisitsMode>("total");
  const [showSearchQuery, setShowSearchQuery] = useState("");
  const [selectedShow, setSelectedShow] = useState<{
    _id: Id<"shows">;
    name: string;
    images?: string[] | null;
  } | null>(null);

  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  const chipBg = theme === "dark" ? "#111115" : "#fff";
  const chipBgActive = accentColor + "1f";
  const chipText = theme === "dark" ? "#b0b4bc" : "#666";
  const chipTextActive = accentColor;
  const chipBorderActive = accentColor + "66";

  // ── queries ──────────────────────────────────────────────────────────────────

  const showsData = useQuery(
    api.leaderboard.getByShows,
    category === "shows" ? { scope } : "skip",
  );
  const visitsData = useQuery(
    api.leaderboard.getByVisits,
    category === "visits" && visitsMode === "total" ? { scope, mode: "total" } : "skip",
  );
  const visitsSingleShowData = useQuery(
    api.leaderboard.getByVisits,
    category === "visits" && visitsMode === "single_show" ? { scope, mode: "single_show" } : "skip",
  );
  const visitsSelectShowData = useQuery(
    api.leaderboard.getByVisits,
    category === "visits" && visitsMode === "select_show" && selectedShow
      ? { scope, mode: "per_show", showId: selectedShow._id }
      : "skip",
  );
  const theatresData = useQuery(
    api.leaderboard.getByTheatres,
    category === "theatres" ? { scope } : "skip",
  );
  const signupsData = useQuery(
    api.leaderboard.getBySignups,
    category === "signups" ? { scope } : "skip",
  );
  const streakData = useQuery(
    api.leaderboard.getByStreak,
    category === "streak" ? { scope } : "skip",
  );
  const scoreData = useQuery(
    api.leaderboard.getByScore,
    category === "score" ? { scope } : "skip",
  );
  const showSearchResults = useQuery(
    api.shows.search,
    visitsMode === "select_show" && showSearchQuery.length >= 1
      ? { q: showSearchQuery, limit: 8 }
      : "skip",
  );

  // ── data resolution ──────────────────────────────────────────────────────────

  const activeVisitsData =
    visitsMode === "total"
      ? visitsData
      : visitsMode === "single_show"
        ? visitsSingleShowData
        : visitsSelectShowData;

  const data =
    category === "shows"
      ? showsData
      : category === "visits"
        ? activeVisitsData
        : category === "theatres"
          ? theatresData
          : category === "signups"
            ? signupsData
            : category === "streak"
              ? streakData
              : scoreData;

  const countLabel =
    category === "shows"
      ? "shows"
      : category === "visits"
        ? visitsMode === "single_show"
          ? "best"
          : "visits"
        : category === "theatres"
          ? "theatres"
          : category === "signups"
            ? "signups"
            : category === "streak"
              ? "wk streak"
              : "pts";

  // ── row renderer ─────────────────────────────────────────────────────────────

  const renderRow = ({ item }: { item: any }) => {
    const rank: number = item.rank;
    const isTop3 = rank <= 3;
    const isTop1 = rank === 1;
    const rowTextColor = isTop1 ? "#ffffff" : primaryTextColor;
    const rowMutedColor = isTop1 ? "rgba(255,255,255,0.7)" : mutedTextColor;
    const rowBorderColor = isTop3
      ? accentColor + (rank === 1 ? "00" : rank === 2 ? "55" : "33")
      : borderColor;
    const rowBg = isTop3 ? "transparent" : surfaceColor;

    return (
      <Pressable
        style={[styles.row, { backgroundColor: rowBg, borderColor: rowBorderColor, overflow: "hidden" }]}
        onLayout={(e) => {
          // size is read inline via onLayout callback in GradientRowBg wrapper below
        }}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/community/user/[username]",
            params: { username: item.user.username },
          })
        }
      >
        <RowWithGradient rank={rank}>
          <Text style={[styles.rankNum, { color: isTop1 ? "#ffffff" : rank <= 3 ? accentColor : mutedTextColor }]}>
            {rank}
          </Text>
          <View style={[styles.avatar, { backgroundColor: isTop1 ? "rgba(255,255,255,0.22)" : accentColor + "22" }]}>
            {item.user.avatarUrl ? (
              <Image
                source={{ uri: item.user.avatarUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            ) : (
              <Text style={[styles.avatarInitials, { color: isTop1 ? "#ffffff" : accentColor }]}>
                {getInitials(item.user.name, item.user.username)}
              </Text>
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowName, { color: rowTextColor }]} numberOfLines={1}>
              {item.user.name?.trim() || item.user.username}
            </Text>
            <Text style={[styles.rowHandle, { color: rowMutedColor }]}>
              @{item.user.username}
            </Text>
          </View>
          {/* Single-show playbill thumbnail */}
          {visitsMode === "single_show" && item.showImages?.[0] ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                if (item.showId) {
                  router.push({ pathname: "/show/[showId]", params: { showId: item.showId } });
                }
              }}
              style={styles.playbillThumb}
            >
              <Image source={{ uri: item.showImages[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            </Pressable>
          ) : null}
          <Text style={[styles.countText, { color: rowTextColor }]}>{item.count}</Text>
          <Text style={[styles.countLabel, { color: rowMutedColor }]}>{countLabel}</Text>
        </RowWithGradient>
      </Pressable>
    );
  };

  // ── list header: visits sub-filter + show search ──────────────────────────────

  const visitsHeader =
    category === "visits" ? (
      <View style={styles.visitsSubFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitsModeRow}>
          {VISITS_MODES.map((mode) => (
            <Pressable
              key={mode.key}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor },
                visitsMode === mode.key && { backgroundColor: chipBgActive, borderColor: chipBorderActive },
              ]}
              onPress={() => {
                setVisitsMode(mode.key);
                if (mode.key !== "select_show") {
                  setSelectedShow(null);
                  setShowSearchQuery("");
                }
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: chipText },
                  visitsMode === mode.key && { color: chipTextActive },
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {visitsMode === "select_show" && (
          <View style={styles.showSearchContainer}>
              {selectedShow ? (
              <View style={[styles.selectedShowRow, { backgroundColor: chipBgActive, borderColor: chipBorderActive }]}>
                {selectedShow.images?.[0] ? (
                  <Image source={{ uri: selectedShow.images[0] }} style={styles.selectedShowThumb} contentFit="cover" />
                ) : null}
                <Text style={[styles.selectedShowName, { color: accentColor }]} numberOfLines={1}>
                  {selectedShow.name}
                </Text>
                <Pressable onPress={() => { setSelectedShow(null); setShowSearchQuery(""); }} hitSlop={8}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={accentColor} />
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={[styles.showSearchInput, { backgroundColor: surfaceColor, borderColor, color: primaryTextColor }]}
                  placeholder="Search for a show..."
                  placeholderTextColor={mutedTextColor}
                  value={showSearchQuery}
                  onChangeText={setShowSearchQuery}
                  autoCorrect={false}
                />
                {showSearchResults && showSearchResults.length > 0 && (
                  <View style={[styles.showSearchResults, { backgroundColor: surfaceColor, borderColor }]}>
                    {showSearchResults.map((show: any) => (
                      <Pressable
                        key={String(show._id)}
                        style={[styles.showSearchRow, { borderBottomColor: borderColor }]}
                        onPress={() => {
                          setSelectedShow({ _id: show._id, name: show.name, images: show.images as string[] });
                          setShowSearchQuery("");
                        }}
                      >
                        {(show.images as string[])?.[0] ? (
                          <Image source={{ uri: (show.images as string[])[0] }} style={styles.showSearchThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.showSearchThumb, { backgroundColor: accentColor + "22" }]} />
                        )}
                        <Text style={[styles.showSearchName, { color: primaryTextColor }]} numberOfLines={1}>
                          {show.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol size={20} name="chevron.left" color={accentColor} />
        </Pressable>
        <Text style={[styles.title, { color: primaryTextColor }]}>Leaderboard</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Category chips — scrollable */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor },
                category === cat.key && { backgroundColor: chipBgActive, borderColor: chipBorderActive },
              ]}
              onPress={() => {
                setCategory(cat.key);
                if (cat.key !== "visits") {
                  setVisitsMode("total");
                  setSelectedShow(null);
                  setShowSearchQuery("");
                }
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: chipText },
                  category === cat.key && { color: chipTextActive },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={[
            styles.scopeToggle,
            { borderColor },
            scope === "friends" && { borderColor: accentColor + "66", backgroundColor: accentColor + "14" },
          ]}
          onPress={() => setScope(scope === "all" ? "friends" : "all")}
        >
          <Text
            style={[
              styles.scopeText,
              { color: mutedTextColor },
              scope === "friends" && { color: accentColor },
            ]}
          >
            {scope === "all" ? "All Users" : "Friends"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.user._id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={visitsHeader}
        ListEmptyComponent={
          data === undefined ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>Loading...</Text>
          ) : visitsMode === "select_show" && !selectedShow ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>Select a show above to see the leaderboard.</Text>
          ) : (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>No data yet.</Text>
          )
        }
        ListFooterComponent={
          category === "signups" ? (
            <Pressable
              style={[styles.inviteFooterBtn, { borderColor: accentColor + "44" }]}
              onPress={() => router.push("/invite-friend")}
            >
              <IconSymbol name="person.fill.badge.plus" size={16} color={accentColor} />
              <Text style={[styles.inviteFooterText, { color: accentColor }]}>Invite a Friend</Text>
            </Pressable>
          ) : null
        }
        renderItem={renderRow}
      />
    </SafeAreaView>
  );
}

// ─── gradient row wrapper ─────────────────────────────────────────────────────

function RowWithGradient({ rank, children }: { rank: number; children: React.ReactNode }) {
  const [size, setSize] = useState<RowSize>({ width: 0, height: 0 });
  return (
    <View
      style={styles.rowInner}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setSize({ width, height });
      }}
    >
      <GradientRowBg rank={rank} size={size} />
      {children}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  categoryRow: {
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  scopeToggle: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scopeText: { fontSize: 12, fontWeight: "600" },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  // visits sub-filter
  visitsSubFilter: {
    marginBottom: 12,
    gap: 10,
  },
  visitsModeRow: {
    gap: 8,
    flexDirection: "row",
  },
  showSearchContainer: {
    gap: 6,
  },
  selectedShowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  selectedShowThumb: {
    width: 30,
    height: 40,
    borderRadius: 4,
    overflow: "hidden",
  },
  selectedShowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  showSearchInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  showSearchResults: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  showSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  showSearchThumb: {
    width: 28,
    height: 38,
    borderRadius: 3,
    overflow: "hidden",
  },
  showSearchName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  // row
  row: {
    borderRadius: ROW_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
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
  avatarInitials: { fontSize: 14, fontWeight: "700" },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowHandle: { fontSize: 12, marginTop: 1 },
  playbillThumb: {
    width: 30,
    height: 40,
    borderRadius: 4,
    overflow: "hidden",
  },
  countText: { fontSize: 18, fontWeight: "700" },
  countLabel: { fontSize: 11, fontWeight: "500", width: 50 },
  emptyText: { fontSize: 15, textAlign: "center", marginTop: 40 },
  inviteFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inviteFooterText: { fontSize: 15, fontWeight: "600" },
});
