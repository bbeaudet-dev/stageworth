import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { RANKED_TIER_COLORS } from "@/constants/tierColors";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { RankedTier } from "@/types/ranking";
import { getInitials } from "@/utils/user";

type Props = {
  showId: Id<"shows"> | "";
  isSignedIn: boolean;
};

type Row = {
  userId: Id<"users">;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  tier: RankedTier | null;
  tierRank: number | null;
  tierTotal: number | null;
  hasVisit: boolean;
};

export function FriendsRankingsSection({ showId, isSignedIn }: Props) {
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const rows = useQuery(
    api.friendsRankings.listForShow,
    isSignedIn && showId ? { showId: showId as Id<"shows"> } : "skip"
  ) as Row[] | undefined;

  const { ranked, unranked } = useMemo(() => {
    const r: Row[] = [];
    const u: Row[] = [];
    for (const row of rows ?? []) {
      if (row.tier) r.push(row);
      else u.push(row);
    }
    return { ranked: r, unranked: u };
  }, [rows]);

  if (!rows || rows.length === 0) return null;

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.surfaceElevated, borderColor: c.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: c.mutedText }]}>
        What Your Friends Think
      </Text>

      {ranked.map((row, idx) => (
        <FriendRow
          key={String(row.userId)}
          row={row}
          isFirst={idx === 0}
          onPress={() =>
            router.push({
              pathname: "/user/[username]",
              params: { username: row.username },
            })
          }
        />
      ))}

      {unranked.length > 0 ? (
        <>
          <View
            style={[
              styles.bucketHeader,
              { borderTopColor: c.border, backgroundColor: c.surface },
            ]}
          >
            <Text style={[styles.bucketHeaderText, { color: c.mutedText }]}>
              Unranked
            </Text>
          </View>
          {unranked.map((row) => (
            <FriendRow
              key={String(row.userId)}
              row={row}
              isFirst={false}
              onPress={() =>
                router.push({
                  pathname: "/user/[username]",
                  params: { username: row.username },
                })
              }
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function FriendRow({
  row,
  isFirst,
  onPress,
}: {
  row: Row;
  isFirst: boolean;
  onPress: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const displayName = row.name?.trim() || row.username;
  const tierEntry = row.tier ? RANKED_TIER_COLORS[row.tier] : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: c.accent + "22" }]}>
        {row.avatarUrl ? (
          <Image
            source={{ uri: row.avatarUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.avatarInitials, { color: c.accent }]}>
            {getInitials(row.name, row.username)}
          </Text>
        )}
      </View>

      <View style={styles.identity}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.handle, { color: c.mutedText }]} numberOfLines={1}>
          @{row.username}
        </Text>
      </View>

      <View style={styles.rankCol}>
        {tierEntry ? (
          <View
            style={[
              styles.tierPill,
              { backgroundColor: tierEntry.bg, borderColor: tierEntry.border },
            ]}
          >
            <Text style={[styles.tierPillText, { color: tierEntry.text }]}>
              {tierEntry.label}
            </Text>
          </View>
        ) : row.hasVisit ? (
          <Text style={[styles.visitedText, { color: c.mutedText }]}>Visited</Text>
        ) : null}
        {row.tier && row.tierRank !== null && row.tierTotal !== null ? (
          <Text style={[styles.rankText, { color: c.mutedText }]}>
            #{row.tierRank} of {row.tierTotal}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: "700",
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  handle: {
    fontSize: 12,
    marginTop: 1,
  },
  rankCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  visitedText: {
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
  },
  bucketHeader: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bucketHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
