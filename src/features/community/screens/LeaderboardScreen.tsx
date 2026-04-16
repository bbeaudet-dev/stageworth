import { Canvas, LinearGradient, RoundedRect, vec } from "@shopify/react-native-skia";
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
import { BRAND_BLUE, BRAND_PURPLE, Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { LeaderboardFilters } from "@/features/community/components/LeaderboardFilters";
import { VisitsModeHeader, type SelectedShow } from "@/features/community/components/VisitsModeHeader";
import {
  useLeaderboardData,
  type Category,
  type Scope,
  type VisitsMode,
} from "@/features/community/hooks/useLeaderboardData";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

// ─── gradient row background ─────────────────────────────────────────────────

const ROW_RADIUS = 12;

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

// ─── screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const [category, setCategory] = useState<Category>("shows");
  const [scope, setScope] = useState<Scope>("all");
  const [visitsMode, setVisitsMode] = useState<VisitsMode>("total");
  const [showSearchQuery, setShowSearchQuery] = useState("");
  const [selectedShow, setSelectedShow] = useState<SelectedShow | null>(null);

  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  const { data, countLabel, showSearchResults } = useLeaderboardData({
    category,
    scope,
    visitsMode,
    selectedShowId: selectedShow?._id,
    showSearchQuery,
  });

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    if (cat !== "visits") {
      setVisitsMode("total");
      setSelectedShow(null);
      setShowSearchQuery("");
    }
  };

  const handleVisitsModeChange = (mode: VisitsMode) => {
    setVisitsMode(mode);
    if (mode !== "select_show") {
      setSelectedShow(null);
      setShowSearchQuery("");
    }
  };

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
        onPress={() => router.push({ pathname: "/user/[username]", params: { username: item.user.username } })}
      >
        <RowWithGradient rank={rank}>
          <Text style={[styles.rankNum, { color: isTop1 ? "#ffffff" : rank <= 3 ? accentColor : mutedTextColor }]}>
            {rank}
          </Text>
          <View style={[styles.avatar, { backgroundColor: isTop1 ? "rgba(255,255,255,0.22)" : accentColor + "22" }]}>
            {item.user.avatarUrl ? (
              <Image source={{ uri: item.user.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
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
            <Text style={[styles.rowHandle, { color: rowMutedColor }]}>@{item.user.username}</Text>
          </View>
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

  const visitsHeader =
    category === "visits" ? (
      <VisitsModeHeader
        visitsMode={visitsMode}
        selectedShow={selectedShow}
        showSearchQuery={showSearchQuery}
        showSearchResults={showSearchResults as SelectedShow[] | undefined}
        onVisitsModeChange={handleVisitsModeChange}
        onShowSelect={(show) => { setSelectedShow(show); setShowSearchQuery(""); }}
        onShowQueryChange={setShowSearchQuery}
        onClearShow={() => { setSelectedShow(null); setShowSearchQuery(""); }}
      />
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

      <LeaderboardFilters
        category={category}
        scope={scope}
        onCategoryChange={handleCategoryChange}
        onScopeChange={setScope}
      />

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.user._id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={visitsHeader}
        ListEmptyComponent={
          visitsMode === "select_show" && !selectedShow ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: mutedTextColor }]}>Search for a show above to see who&apos;s seen it the most.</Text>
            </View>
          ) : data === undefined ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>Loading...</Text>
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
  listContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },
  row: { borderRadius: ROW_RADIUS, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  rowInner: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
  rankNum: { fontSize: 15, fontWeight: "700", width: 28, textAlign: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 14, fontWeight: "700" },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowHandle: { fontSize: 12, marginTop: 1 },
  playbillThumb: { width: 30, height: 40, borderRadius: 4, overflow: "hidden" },
  countText: { fontSize: 18, fontWeight: "700" },
  countLabel: { fontSize: 11, fontWeight: "500", width: 50 },
  emptyState: { paddingHorizontal: 32, paddingTop: 40, alignItems: "center" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  inviteFooterBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 20, marginHorizontal: 16,
    paddingVertical: 13, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  inviteFooterText: { fontSize: 15, fontWeight: "600" },
});
