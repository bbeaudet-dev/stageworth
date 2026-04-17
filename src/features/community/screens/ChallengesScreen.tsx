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
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getDisplayName, getInitials } from "@/utils/user";

type Tab = "friends" | "global";

type ShowPreview = { showId: string; name: string; imageUrl: string | null };

type ChallengeEntry = {
  _id: string;
  year: number;
  targetCount: number;
  currentCount: number;
  createdAt: number;
  isViewer: boolean;
  user: { _id: string; username: string; name: string | null; avatarUrl: string | null };
  showPreviews: ShowPreview[];
  totalShowCount: number;
};

function ChallengeCard({
  entry,
  theme,
  onPressUser,
}: {
  entry: ChallengeEntry;
  theme: "light" | "dark";
  onPressUser: () => void;
}) {
  const [showsExpanded, setShowsExpanded] = useState(false);

  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const progressBg = theme === "dark" ? "#1e1e24" : "#f0f0f2";

  const rawProgress = entry.targetCount > 0 ? entry.currentCount / entry.targetCount : 0;
  const barProgress = Math.min(rawProgress, 1);
  const displayPct = Math.round(rawProgress * 100);
  const isCompleted = entry.currentCount >= entry.targetCount;
  const now = new Date();
  const endOfYear = new Date(entry.year, 11, 31);
  const daysLeft = Math.max(0, Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000));

  const completedBarColor = theme === "dark" ? "#5cb85c" : "#1a7a3a";
  const progressBarColor = isCompleted ? completedBarColor : accentColor;

  const userName = getDisplayName(entry.user.name, entry.user.username);

  return (
    <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
      {/* User row */}
      <Pressable style={styles.userRow} onPress={onPressUser}>
        <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
          {entry.user.avatarUrl ? (
            <Image
              source={{ uri: entry.user.avatarUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <Text style={[styles.avatarInitials, { color: accentColor }]}>
              {getInitials(entry.user.name, entry.user.username)}
            </Text>
          )}
        </View>
        <View style={styles.userTextCol}>
          <Text style={[styles.userName, { color: primaryTextColor }]} numberOfLines={1}>
            {userName}
            {entry.isViewer ? (
              <Text style={[styles.youBadge, { color: accentColor }]}> (you)</Text>
            ) : null}
          </Text>
          <Text style={[styles.userHandle, { color: mutedTextColor }]}>
            @{entry.user.username}
          </Text>
        </View>
        <Text style={[styles.challengeYearLabel, { color: mutedTextColor }]}>
          {entry.year}
        </Text>
      </Pressable>

      {/* Progress */}
      <Text style={[styles.progressLabel, { color: primaryTextColor }]}>
        {entry.currentCount} of {entry.targetCount} shows
      </Text>
      <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: progressBarColor, width: `${Math.round(barProgress * 100)}%` },
          ]}
        />
      </View>

      {isCompleted ? (
        <Text style={[styles.completedNote, { color: completedBarColor }]}>
          Reached {displayPct > 100 ? `${displayPct}% of goal!` : ""}
        </Text>
      ) : (
        <Text style={[styles.daysLeft, { color: mutedTextColor }]}>
          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · ` : ""}{displayPct}% complete
        </Text>
      )}

      {/* Show previews toggle */}
      {entry.totalShowCount > 0 && (
        <>
          <Pressable
            style={[styles.showsToggle, { borderTopColor: borderColor }]}
            onPress={() => setShowsExpanded((v) => !v)}
          >
            <Text style={[styles.showsToggleText, { color: accentColor }]}>
              {showsExpanded ? "Hide shows" : `See ${entry.totalShowCount} show${entry.totalShowCount === 1 ? "" : "s"}`}
            </Text>
            <IconSymbol
              name={showsExpanded ? "chevron.up" : "chevron.down"}
              size={13}
              color={accentColor}
            />
          </Pressable>
          {showsExpanded && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.showsRow}
            >
              {entry.showPreviews.map((sp) => (
                <View key={sp.showId} style={[styles.showThumb, { backgroundColor: progressBg }]}>
                  {sp.imageUrl ? (
                    <Image
                      source={{ uri: sp.imageUrl }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.showThumbInitial, { color: mutedTextColor }]} numberOfLines={2}>
                      {sp.name.slice(0, 2)}
                    </Text>
                  )}
                </View>
              ))}
              {entry.totalShowCount > entry.showPreviews.length && (
                <View style={[styles.showThumbMore, { backgroundColor: accentColor + "18" }]}>
                  <Text style={[styles.showThumbMoreText, { color: accentColor }]}>
                    +{entry.totalShowCount - entry.showPreviews.length}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

export default function ChallengesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const [selectedTab, setSelectedTab] = useState<Tab>("friends");

  const currentYear = new Date().getFullYear();

  const friendsChallenges = useQuery(
    api.challenges.getFriendsWithChallenges,
    selectedTab === "friends" ? { year: currentYear } : "skip",
  );
  const globalChallenges = useQuery(
    api.challenges.getAllWithChallenges,
    selectedTab === "global" ? { year: currentYear } : "skip",
  );

  const data: ChallengeEntry[] | undefined =
    selectedTab === "friends" ? friendsChallenges : globalChallenges;

  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const segmentBorder = theme === "dark" ? "#3a3a44" : "#d6d6d6";
  const segmentBackground = theme === "dark" ? "#111115" : "#fff";
  const segmentBackgroundActive = theme === "dark" ? "#fff" : "#1f1f1f";
  const segmentTextColor = theme === "dark" ? "#b0b4bc" : "#444";
  const segmentTextActiveColor = theme === "dark" ? "#111" : "#fff";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Segment */}
      <View style={styles.segmentRow}>
        {(["friends", "global"] as Tab[]).map((tab) => {
          const active = selectedTab === tab;
          return (
            <Pressable
              key={tab}
              style={[
                styles.segmentButton,
                { borderColor: segmentBorder, backgroundColor: segmentBackground },
                active && { backgroundColor: segmentBackgroundActive, borderColor: segmentBackgroundActive },
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  { color: segmentTextColor },
                  active && { color: segmentTextActiveColor },
                ]}
              >
                {tab === "friends" ? "Friends" : "Global"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ChallengeCard
            entry={item}
            theme={theme}
            onPressUser={() =>
              router.push({
                pathname: "/user/[username]",
                params: { username: item.user.username },
              })
            }
          />
        )}
        ListEmptyComponent={
          data === undefined ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>Loading...</Text>
          ) : (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>
              {selectedTab === "friends"
                ? "None of your friends have started a challenge this year yet."
                : "No challenges yet this year."}
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  segmentButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
    lineHeight: 22,
  },
  // Card
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: "700",
  },
  userTextCol: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  youBadge: {
    fontSize: 13,
    fontWeight: "500",
  },
  userHandle: { fontSize: 12, marginTop: 1 },
  challengeYearLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: "500",
  },
  completedNote: {
    fontSize: 12,
    fontWeight: "600",
  },
  showsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  showsToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  showsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  showThumb: {
    width: 48,
    height: 64,
    borderRadius: 6,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  showThumbInitial: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  showThumbMore: {
    width: 48,
    height: 64,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  showThumbMoreText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
