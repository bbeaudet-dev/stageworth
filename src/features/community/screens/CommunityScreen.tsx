import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";

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

  const posts = useMemo(
    () => (selectedTab === "following" ? (followingFeed ?? []) : (globalFeed ?? [])),
    [followingFeed, globalFeed, selectedTab]
  );

  const isLoading =
    selectedTab === "following" ? followingFeed === undefined : globalFeed === undefined;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentButton, selectedTab === "following" && styles.segmentButtonActive]}
            onPress={() => setSelectedTab("following")}
          >
            <Text
              style={[styles.segmentButtonText, selectedTab === "following" && styles.segmentButtonTextActive]}
            >
              Following
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, selectedTab === "global" && styles.segmentButtonActive]}
            onPress={() => setSelectedTab("global")}
          >
            <Text style={[styles.segmentButtonText, selectedTab === "global" && styles.segmentButtonTextActive]}>
              Global
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? <Text style={styles.emptyText}>Loading posts...</Text> : null}
        {!isLoading && posts.length === 0 ? (
          <Text style={styles.emptyText}>
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
                <View key={post._id} style={styles.postCard}>
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
                        <Text style={styles.actorHandleText}>@{post.actor.username}</Text>
                      </Pressable>
                      <Text style={styles.postTitle}>
                        <Text
                          style={styles.actorText}
                          onPress={() =>
                            router.push({
                              pathname: "/user/[username]",
                              params: { username: post.actor.username },
                            })
                          }
                        >
                          {actorLabel}
                        </Text>{" "}
                        saw <Text style={styles.showText}>{post.show.name}</Text>{" "}
                        {formatRelativeVisitDate(post.visitDate)}
                      </Text>
                      {location ? <Text style={styles.subText}>{location}</Text> : null}
                      {post.notes ? <Text style={styles.notesText}>{post.notes}</Text> : null}
                      {post.rankAtPost ? (
                        <Text style={styles.rankText}>
                          Ranked #{post.rankAtPost} / {post.rankingTotal}
                        </Text>
                      ) : (
                        <Text style={styles.rankText}>Not currently ranked</Text>
                      )}
                    </View>
                    <View style={styles.posterWrap}>
                      {post.show.images[0] ? (
                        <Image source={{ uri: post.show.images[0] }} style={styles.posterImage} />
                      ) : (
                        <View style={styles.posterFallback}>
                          <Text style={styles.posterFallbackText}>No art</Text>
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
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
