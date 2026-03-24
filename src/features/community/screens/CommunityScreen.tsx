import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";

type FeedTab = "following" | "global";

function formatRelativeVisitDate(dateStr: string) {
  const today = new Date();
  const target = new Date(`${dateStr}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatVisitDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFirstName(name?: string | null, fallback?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return fallback ?? "";
  const first = trimmed.split(/\s+/)[0];
  return first || fallback || "";
}

export default function CommunityScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<FeedTab>("following");

  const followingFeed = useQuery(
    api.community.getFollowingFeed,
    selectedTab === "following" ? { limit: 40 } : "skip"
  );
  const globalFeed = useQuery(
    api.community.getGlobalFeed,
    selectedTab === "global" ? { limit: 40 } : "skip"
  );
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;

  const posts = useMemo(
    () => (selectedTab === "following" ? (followingFeed ?? []) : (globalFeed ?? [])),
    [followingFeed, globalFeed, selectedTab]
  );

  const isLoading =
    selectedTab === "following" ? followingFeed === undefined : globalFeed === undefined;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = theme === "dark" ? "#a0a4aa" : "#666";
  const cardBackground = theme === "dark" ? "#18181b" : "#fff";
  const cardBorder = theme === "dark" ? "#27272f" : "#ddd";
  const segmentBorder = theme === "dark" ? "#3a3a44" : "#d6d6d6";
  const segmentBackground = theme === "dark" ? "#111115" : "#fff";
  const segmentBackgroundActive = theme === "dark" ? "#fff" : "#1f1f1f";
  const segmentTextColor = theme === "dark" ? "#b0b4bc" : "#444";
  const segmentTextActiveColor = theme === "dark" ? "#111" : "#fff";
  const actorHandleColor = theme === "dark" ? "#d1d5f9" : "#4d4d4d";
  const actorLinkColor = theme === "dark" ? "#7ea2ff" : "#2f62d8";
  const showTextColor = theme === "dark" ? "#f5f5f5" : "#111";
  const subTextColor = mutedTextColor;
  const notesTextColor = theme === "dark" ? "#e4e4e7" : "#2b2b2b";
  const rankTextColor = mutedTextColor;
  const posterBackground = theme === "dark" ? "#27272f" : "#efefef";
  const posterFallbackTextColor = theme === "dark" ? "#a1a1aa" : "#888";
  const emptyTextColor = theme === "dark" ? "#9ca3af" : "#808080";

  const bellColor = theme === "dark" ? "#d1d5f9" : "#333";
  const badgeBg = Colors[theme].accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: primaryTextColor }]}>Community</Text>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={styles.bellButton}
            hitSlop={10}
          >
            <IconSymbol name="bell.fill" size={22} color={bellColor} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.segmentRow}>
          <Pressable
            style={[
              styles.segmentButton,
              { borderColor: segmentBorder, backgroundColor: segmentBackground },
              selectedTab === "following" && [
                styles.segmentButtonActive,
                { backgroundColor: segmentBackgroundActive, borderColor: segmentBackgroundActive },
              ],
            ]}
            onPress={() => setSelectedTab("following")}
          >
            <Text
              style={[
                styles.segmentButtonText,
                { color: segmentTextColor },
                selectedTab === "following" && [
                  styles.segmentButtonTextActive,
                  { color: segmentTextActiveColor },
                ],
              ]}
            >
              Following
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentButton,
              { borderColor: segmentBorder, backgroundColor: segmentBackground },
              selectedTab === "global" && [
                styles.segmentButtonActive,
                { backgroundColor: segmentBackgroundActive, borderColor: segmentBackgroundActive },
              ],
            ]}
            onPress={() => setSelectedTab("global")}
          >
            <Text
              style={[
                styles.segmentButtonText,
                { color: segmentTextColor },
                selectedTab === "global" && [
                  styles.segmentButtonTextActive,
                  { color: segmentTextActiveColor },
                ],
              ]}
            >
              Global
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>Loading posts...</Text>
        ) : null}
        {!isLoading && posts.length === 0 ? (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>
            {selectedTab === "following"
              ? "No posts yet from people you follow."
              : "No community posts yet."}
          </Text>
        ) : null}
        {!isLoading
          ? posts.map((post) => {
              const actorLabel = getFirstName(post.actor.name, post.actor.username);
              const location = [formatVisitDate(post.visitDate), post.theatre, post.city]
                .filter(Boolean)
                .join(" - ");
              return (
                <View
                  key={post._id}
                  style={[
                    styles.postCard,
                    { backgroundColor: cardBackground, borderColor: cardBorder },
                  ]}
                >
                  <View style={styles.postRow}>
                    <View style={styles.postMain}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/user/[username]",
                            params: { username: post.actor.username },
                          })
                        }
                      >
                        <Text style={[styles.actorHandleText, { color: actorHandleColor }]}>
                          @{post.actor.username}
                        </Text>
                      </Pressable>
                      <Text style={[styles.postTitle, { color: primaryTextColor }]}>
                        <Text
                          style={[styles.actorText, { color: actorLinkColor }]}
                          onPress={() =>
                            router.push({
                              pathname: "/user/[username]",
                              params: { username: post.actor.username },
                            })
                          }
                        >
                          {actorLabel}
                        </Text>{" "}
                        saw{" "}
                        <Text style={[styles.showText, { color: showTextColor }]}>
                          {post.show.name}
                        </Text>{" "}
                        {formatRelativeVisitDate(post.visitDate)}
                      </Text>
                      {location ? (
                        <Text style={[styles.subText, { color: subTextColor }]}>{location}</Text>
                      ) : null}
                      {post.notes ? (
                        <Text style={[styles.notesText, { color: notesTextColor }]}>
                          {post.notes}
                        </Text>
                      ) : null}
                      {post.rankAtPost ? (
                        <Text style={[styles.rankText, { color: rankTextColor }]}>
                          Ranked #{post.rankAtPost} / {post.rankingTotal}
                        </Text>
                      ) : (
                        <Text style={[styles.rankText, { color: rankTextColor }]}>
                          Not currently ranked
                        </Text>
                      )}
                    </View>
                    <View style={[styles.posterWrap, { backgroundColor: posterBackground }]}>
                      {post.show.images[0] ? (
                        <Image source={{ uri: post.show.images[0] }} style={styles.posterImage} />
                      ) : (
                        <View style={styles.posterFallback}>
                          <Text
                            style={[styles.posterFallbackText, { color: posterFallbackTextColor }]}
                          >
                            No art
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  bellButton: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 12,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d6d6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  segmentButtonActive: {
    backgroundColor: "#1f1f1f",
    borderColor: "#1f1f1f",
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
  },
  segmentButtonTextActive: {
    color: "#fff",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  postCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    gap: 6,
  },
  postRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  postMain: {
    flex: 1,
    gap: 6,
  },
  postTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#222",
  },
  posterWrap: {
    width: 64,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#efefef",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  posterFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  posterFallbackText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
  actorText: {
    fontWeight: "700",
    color: "#2f62d8",
  },
  actorHandleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4d4d4d",
  },
  showText: {
    fontWeight: "700",
    color: "#111",
  },
  subText: {
    color: "#666",
    fontSize: 13,
  },
  notesText: {
    fontSize: 14,
    color: "#2b2b2b",
    lineHeight: 20,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  emptyText: {
    fontSize: 15,
    color: "#808080",
    textAlign: "center",
    marginTop: 40,
  },
});
