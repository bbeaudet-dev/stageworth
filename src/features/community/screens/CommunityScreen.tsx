import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandGradientTitle } from "@/components/BrandGradientTitle";
import { BottomSheet } from "@/components/bottom-sheet";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatRelativeVisitDate } from "@/utils/dates";
import { getDisplayName } from "@/utils/user";

type FeedTab = "following" | "global";

function formatVisitLocation(
  dateStr: string,
  theatre?: string | null,
  city?: string | null,
) {
  return [theatre, city].filter(Boolean).join(", ");
}

type TaggedUser = { _id: string; username: string; name?: string | null };

type ParticipantsSheetProps = {
  visible: boolean;
  onClose: () => void;
  actor: { _id: string; username: string; name?: string | null };
  taggedUsers: TaggedUser[];
  onNavigate: (username: string) => void;
  theme: "light" | "dark";
};

function ParticipantsSheet({
  visible,
  onClose,
  actor,
  taggedUsers,
  onNavigate,
  theme,
}: ParticipantsSheetProps) {
  const bg = theme === "dark" ? "#0a0a0a" : "#fff";
  const text = theme === "dark" ? "#f4f4f5" : "#111";
  const muted = theme === "dark" ? "#a0a4aa" : "#666";
  const border = theme === "dark" ? "#27272f" : "#e8e8e8";
  const handle = theme === "dark" ? "#7ea2ff" : "#2f62d8";
  const all = [actor, ...taggedUsers];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheetContainer, { backgroundColor: bg }]}>
        <View style={[styles.sheetHandle, { backgroundColor: border }]} />
        <Text style={[styles.sheetTitle, { color: muted }]}>
          Attended together
        </Text>
        {all.map((user, i) => (
          <Pressable
            key={user._id}
            style={[
              styles.sheetRow,
              { borderTopColor: border },
              i === 0 && { borderTopWidth: 0 },
            ]}
            onPress={() => {
              onClose();
              onNavigate(user.username);
            }}
          >
            <View style={styles.sheetRowText}>
              <Text style={[styles.sheetRowName, { color: text }]}>
                {user.name?.trim() || user.username}
              </Text>
              <Text style={[styles.sheetRowHandle, { color: handle }]}>
                @{user.username}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<FeedTab>("global");

  const handlePlusPress = () => {
    Alert.alert("Create", undefined, [
      {
        text: "Add a Visit",
        onPress: () => router.push("/add-visit"),
      },
      {
        text: "Create Post",
        onPress: () => Alert.alert("Coming Soon", "Community posts are coming in a future update!"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const followingFeed = useQuery(
    api.social.community.getFollowingFeed,
    selectedTab === "following" ? { limit: 40 } : "skip",
  );
  const globalFeed = useQuery(
    api.social.community.getGlobalFeed,
    selectedTab === "global" ? { limit: 40 } : "skip",
  );
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const [participantsModal, setParticipantsModal] = useState<{
    actor: TaggedUser;
    taggedUsers: TaggedUser[];
  } | null>(null);

  const posts = useMemo(
    () =>
      selectedTab === "following" ? (followingFeed ?? []) : (globalFeed ?? []),
    [followingFeed, globalFeed, selectedTab],
  );

  const isLoading =
    selectedTab === "following"
      ? followingFeed === undefined
      : globalFeed === undefined;

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
  const badgeText = Colors[theme].onAccent;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BrandGradientTitle text="Community" fontSize={28} />
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/leaderboard")}
              style={styles.headerIconButton}
              hitSlop={10}
              accessibilityLabel="Leaderboard"
            >
              <IconSymbol name="trophy.fill" size={22} color={bellColor} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={styles.bellButton}
              hitSlop={10}
            >
              <IconSymbol name="bell.fill" size={22} color={bellColor} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeText }]}>
                    {unreadCount > 99 ? "99+" : String(unreadCount)}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={handlePlusPress}
              style={styles.headerIconButton}
              hitSlop={10}
              accessibilityLabel="Create"
            >
              <IconSymbol name="plus.circle.fill" size={26} color={Colors[theme].accent} />
            </Pressable>
          </View>
        </View>
        <View style={styles.segmentRow}>
          <Pressable
            style={[
              styles.segmentButton,
              {
                borderColor: segmentBorder,
                backgroundColor: segmentBackground,
              },
              selectedTab === "global" && [
                styles.segmentButtonActive,
                {
                  backgroundColor: segmentBackgroundActive,
                  borderColor: segmentBackgroundActive,
                },
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
          <Pressable
            style={[
              styles.segmentButton,
              {
                borderColor: segmentBorder,
                backgroundColor: segmentBackground,
              },
              selectedTab === "following" && [
                styles.segmentButtonActive,
                {
                  backgroundColor: segmentBackgroundActive,
                  borderColor: segmentBackgroundActive,
                },
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>
            Loading posts...
          </Text>
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
              const actorLabel = getDisplayName(
                post.actor.name,
                post.actor.username,
              );
              const isGlobal = selectedTab === "global";
              const tagged: TaggedUser[] = post.taggedUsers ?? [];
              const location = formatVisitLocation(
                post.visitDate,
                post.theatre,
                post.city,
              );

              const openParticipants = () =>
                setParticipantsModal({
                  actor: post.actor,
                  taggedUsers: tagged,
                });

              return (
                <View
                  key={post._id}
                  style={[
                    styles.postCard,
                    {
                      backgroundColor: cardBackground,
                      borderColor: cardBorder,
                    },
                  ]}
                >
                  <View style={styles.postRow}>
                    <View style={styles.postMain}>
                      {isGlobal && (
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/user/[username]",
                              params: { username: post.actor.username },
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.actorHandleText,
                              { color: actorHandleColor },
                            ]}
                          >
                            @{post.actor.username}
                          </Text>
                        </Pressable>
                      )}
                      <Text
                        style={[styles.postTitle, { color: primaryTextColor }]}
                      >
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
                        <Text
                          style={[styles.showText, { color: showTextColor }]}
                          onPress={() =>
                            router.push({
                              pathname: "/show/[showId]",
                              params: { showId: post.show._id },
                            })
                          }
                        >
                          {post.show.name}
                        </Text>
                        {tagged.length === 1 && (
                          <>
                            {" with "}
                            <Text
                              style={[
                                styles.actorText,
                                { color: actorLinkColor },
                              ]}
                              onPress={() =>
                                router.push({
                                  pathname: "/user/[username]",
                                  params: { username: tagged[0].username },
                                })
                              }
                            >
                              {getDisplayName(tagged[0].name, tagged[0].username)}
                            </Text>
                          </>
                        )}
                        {tagged.length >= 2 && (
                          <>
                            {" with "}
                            <Text
                              style={[
                                styles.actorText,
                                { color: actorLinkColor },
                              ]}
                              onPress={openParticipants}
                            >
                              {tagged.length} others
                            </Text>
                          </>
                        )}{" "}
                        {formatRelativeVisitDate(post.visitDate)}
                      </Text>
                      {location ? (
                        <Text style={[styles.subText, { color: subTextColor }]}>
                          {location}
                        </Text>
                      ) : null}
                      {post.notes ? (
                        <Text
                          style={[styles.notesText, { color: notesTextColor }]}
                        >
                          {post.notes}
                        </Text>
                      ) : null}
                      {post.rankAtPost ? (
                        <Text
                          style={[styles.rankText, { color: rankTextColor }]}
                        >
                          Ranked #{post.rankAtPost} of {post.rankingTotal}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[
                        styles.posterWrap,
                        { backgroundColor: posterBackground },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/show/[showId]",
                          params: { showId: post.show._id },
                        })
                      }
                    >
                      {post.show.images[0] ? (
                        <Image
                          source={{ uri: post.show.images[0] }}
                          style={styles.posterImage}
                        />
                      ) : (
                        <View style={styles.posterFallback}>
                          <Text
                            style={[
                              styles.posterFallbackText,
                              { color: posterFallbackTextColor },
                            ]}
                          >
                            No art
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          : null}
      </ScrollView>
      <ParticipantsSheet
        visible={participantsModal !== null}
        onClose={() => setParticipantsModal(null)}
        actor={participantsModal?.actor ?? { _id: "", username: "" }}
        taggedUsers={participantsModal?.taggedUsers ?? []}
        onNavigate={(username) =>
          router.push({
            pathname: "/user/[username]",
            params: { username },
          })
        }
        theme={theme}
      />
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 11,
    fontWeight: "500",
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
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetRowText: {
    flex: 1,
    gap: 2,
  },
  sheetRowName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sheetRowHandle: {
    fontSize: 13,
    fontWeight: "500",
  },
});
