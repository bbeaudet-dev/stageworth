import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandGradientTitle } from "@/components/BrandGradientTitle";
import { BottomSheet } from "@/components/bottom-sheet";
import { NotesText } from "@/components/NotesText";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FeedPostCard } from "@/features/community/components/FeedPostCard";
import { LikeButton } from "@/features/community/components/LikeButton";
import { ReportSheet } from "@/features/safety/components/ReportSheet";
import { useSafetyActions } from "@/features/safety/components/useSafetyActions";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";
import { formatRelativeVisitDate, isFutureDate } from "@/utils/dates";
import { getDisplayName } from "@/utils/user";

type FeedTab = "following" | "popular" | "global";

function formatVisitLocation(
  _dateStr: string,
  theatre?: string | null,
  city?: string | null,
) {
  return [theatre, city].filter(Boolean).join(", ");
}

type TaggedUser = { _id: string; username: string; name?: string | null };

// ─── Participants bottom sheet ─────────────────────────────────────────────────

type ParticipantsSheetProps = {
  visible: boolean;
  onClose: () => void;
  actor: { _id: string; username: string; name?: string | null };
  taggedUsers: TaggedUser[];
  taggedGuestNames: string[];
  onNavigate: (username: string) => void;
  theme: "light" | "dark";
};

function ParticipantsSheet({
  visible,
  onClose,
  actor,
  taggedUsers,
  taggedGuestNames,
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
        <Text style={[styles.sheetTitle, { color: muted }]}>Attended together</Text>
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
        {taggedGuestNames.map((name, i) => (
          <View
            key={`guest-${name}-${i}`}
            style={[
              styles.sheetRow,
              { borderTopColor: border },
              all.length === 0 && i === 0 && { borderTopWidth: 0 },
            ]}
          >
            <View style={styles.sheetRowText}>
              <Text style={[styles.sheetRowName, { color: text }]}>{name}</Text>
              <Text style={[styles.sheetRowHandle, { color: muted }]}>
                Not on Stageworth
              </Text>
            </View>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

/** Swipe left to reveal Delete — same pattern as rank view show rows. */
function OwnerSwipeable({
  enabled,
  onDeletePress,
  children,
}: {
  enabled: boolean;
  onDeletePress: () => void;
  children: ReactNode;
}) {
  const ref = useRef<Swipeable>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const dangerColor = Colors[theme].danger;

  const handleDeletePress = useCallback(() => {
    ref.current?.close();
    onDeletePress();
  }, [onDeletePress]);

  const renderRightActions = useCallback(
    () => (
      <Pressable
        style={[styles.swipeDeleteAction, { backgroundColor: dangerColor }]}
        onPress={handleDeletePress}
        accessibilityRole="button"
        accessibilityLabel="Delete post"
      >
        <Text style={styles.swipeDeleteLabel}>Delete</Text>
      </Pressable>
    ),
    [dangerColor, handleDeletePress],
  );

  if (!enabled) return <>{children}</>;

  return (
    <Swipeable ref={ref} renderRightActions={renderRightActions} overshootRight={false}>
      {children}
    </Swipeable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedTab, setSelectedTab] = useState<FeedTab>("following");
  const [feedLimit, setFeedLimit] = useState(20);
  const FEED_PAGE_SIZE = 20;

  const handlePlusPress = () => {
    Alert.alert("Quick Actions", undefined, [
      { text: "Add a Visit", onPress: () => router.push("/add-visit") },
      {
        text: "Create Post",
        onPress: () =>
          Alert.alert("Coming Soon", "Community posts are coming in a future update!"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // The `(tabs)` layout unmounts this screen on sign-out, but between
  // `authClient.signOut()` clearing Convex's auth state and React actually
  // unmounting the subtree there's a brief window where live subscriptions
  // re-fire unauthenticated and the server logs "Not authenticated". Gate
  // every authenticated query on the session to avoid that noise.
  const { data: session } = useSession();
  const followingFeed = useQuery(
    api.social.community.getFollowingFeed,
    session && selectedTab === "following" ? { limit: feedLimit } : "skip",
  );
  const popularFeed = useQuery(
    api.social.community.getPopularFeed,
    session && selectedTab === "popular" ? { limit: feedLimit } : "skip",
  );
  const globalFeed = useQuery(
    api.social.community.getGlobalFeed,
    session && selectedTab === "global" ? { limit: feedLimit } : "skip",
  );
  const unreadCount =
    useQuery(api.notifications.getUnreadCount, session ? {} : "skip") ?? 0;
  const myProfile = useQuery(
    api.social.profiles.getMyProfile,
    session ? {} : "skip",
  );
  const deleteMyPost = useMutation(api.social.community.deleteMyPost);
  const { openSafetyActions, reportTarget, closeReportSheet } =
    useSafetyActions();
  const [participantsModal, setParticipantsModal] = useState<{
    actor: TaggedUser;
    taggedUsers: TaggedUser[];
    taggedGuestNames: string[];
  } | null>(null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  const confirmDeletePost = (postId: Id<"activityPosts">, label: string) => {
    Alert.alert(
      "Delete post?",
      `This will remove your ${label} from the community feed. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMyPost({ postId });
            } catch (err) {
              Alert.alert(
                "Couldn't delete post",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  // Convex `useQuery` returns `undefined` while it re-fetches after the limit
  // changes (i.e. "Load more"). If we rendered that directly, the list would
  // blank out mid-scroll and the ScrollView would snap back to the top. Cache
  // the last-known results per tab so the existing list stays mounted through
  // the transition; swap in fresh data as soon as it arrives.
  const liveFeed =
    selectedTab === "following"
      ? followingFeed
      : selectedTab === "popular"
        ? popularFeed
        : globalFeed;
  const [cachedPosts, setCachedPosts] = useState<typeof liveFeed>(undefined);
  useEffect(() => {
    setCachedPosts(undefined);
  }, [selectedTab]);
  useEffect(() => {
    if (liveFeed !== undefined) setCachedPosts(liveFeed);
  }, [liveFeed]);

  const posts = useMemo(() => cachedPosts ?? [], [cachedPosts]);
  const isLoading = cachedPosts === undefined;
  // True while the user has asked for a bigger page but the new page hasn't
  // arrived yet. We keep the "Load more" row visible (with a spinner) so they
  // have feedback while Convex refetches.
  const isFetchingMore =
    cachedPosts !== undefined && liveFeed === undefined && posts.length < feedLimit;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  // ─── Derived theme tokens ───────────────────────────────────────────────────
  const backgroundColor    = Colors[theme].background;
  const primaryTextColor   = Colors[theme].text;
  const mutedTextColor     = theme === "dark" ? "#a0a4aa" : "#666";
  const cardBackground     = theme === "dark" ? "#18181b" : "#fff";
  const cardBorder         = theme === "dark" ? "#27272f" : "#ddd";
  const segmentBorder      = theme === "dark" ? "#3a3a44" : "#d6d6d6";
  const segmentBackground  = theme === "dark" ? "#111115" : "#fff";
  const segmentBgActive    = theme === "dark" ? "#fff" : "#1f1f1f";
  const segmentTextColor   = theme === "dark" ? "#b0b4bc" : "#444";
  const segmentTextActive  = theme === "dark" ? "#111" : "#fff";
  const actorHandleColor   = theme === "dark" ? "#d1d5f9" : "#4d4d4d";
  const actorLinkColor     = theme === "dark" ? "#7ea2ff" : "#2f62d8";
  const showTextColor      = theme === "dark" ? "#f5f5f5" : "#111";
  const notesTextColor     = theme === "dark" ? "#e4e4e7" : "#2b2b2b";
  const posterBackground   = theme === "dark" ? "#27272f" : "#efefef";
  const emptyTextColor     = theme === "dark" ? "#9ca3af" : "#808080";
  const bellColor          = theme === "dark" ? "#d1d5f9" : "#333";
  const badgeBg            = Colors[theme].accent;
  const badgeText          = Colors[theme].onAccent;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      {/* Header */}
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

        {/* Segment tabs */}
        <View style={styles.segmentRow}>
          {(["following", "popular", "global"] as FeedTab[]).map((tab) => {
            const active = selectedTab === tab;
            return (
              <Pressable
                key={tab}
                style={[
                  styles.segmentButton,
                  { borderColor: segmentBorder, backgroundColor: segmentBackground },
                  active && { backgroundColor: segmentBgActive, borderColor: segmentBgActive },
                ]}
                onPress={() => {
                  setSelectedTab(tab);
                  setFeedLimit(FEED_PAGE_SIZE);
                }}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: segmentTextColor },
                    active && { color: segmentTextActive },
                  ]}
                >
                  {tab === "following" ? "Friends" : tab === "popular" ? "Popular" : "Global"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Feed */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
      >
        {isLoading && (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>Loading posts…</Text>
        )}
        {!isLoading && posts.length === 0 && (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>
            {selectedTab === "following"
              ? "No posts yet from your friends."
              : selectedTab === "popular"
                ? "No popular posts this month — check back soon."
                : "No community posts yet."}
          </Text>
        )}

        {!isLoading &&
          posts.map((post) => {
            const actorLabel = getDisplayName(post.actor.name, post.actor.username);
            const isGlobal = selectedTab === "global" || selectedTab === "popular";
            const tagged: TaggedUser[] = post.taggedUsers ?? [];
            const guestNames: string[] = post.taggedGuestNames ?? [];
            const totalTagged = tagged.length + guestNames.length;
            const isMine = !!myProfile && post.actor._id === myProfile._id;
            const postLabel =
              post.type === "visit_created"
                ? "visit post"
                : "challenge post";
            const onLongPressForOwner = isMine
              ? () =>
                  confirmDeletePost(
                    post._id as Id<"activityPosts">,
                    postLabel,
                  )
              : () =>
                  openSafetyActions({
                    kind: "post",
                    postId: post._id as Id<"activityPosts">,
                    author: {
                      userId: post.actor._id as Id<"users">,
                      username: post.actor.username,
                    },
                  });

            // ── Shared inline elements ──────────────────────────────────────
            const actorInline = (
              <Text
                style={[styles.actorText, { color: actorLinkColor }]}
                onPress={() =>
                  router.push({ pathname: "/user/[username]", params: { username: post.actor.username } })
                }
              >
                {actorLabel}
              </Text>
            );

            const headerNode = isGlobal ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/user/[username]", params: { username: post.actor.username } })
                }
              >
                <Text style={[styles.actorHandleText, { color: actorHandleColor }]}>
                  @{post.actor.username}
                </Text>
              </Pressable>
            ) : undefined;

            // ── challenge_started ───────────────────────────────────────────
            if (post.type === "challenge_started") {
              const target   = post.challengeTarget ?? 0;
              const progress = post.challengeProgress ?? 0;
              return (
                <OwnerSwipeable
                  key={post._id}
                  enabled={isMine}
                  onDeletePress={() =>
                    confirmDeletePost(post._id as Id<"activityPosts">, postLabel)
                  }
                >
                  <FeedPostCard
                    backgroundColor={cardBackground}
                    borderColor={cardBorder}
                    onPress={() => router.push("/challenges")}
                    onLongPress={onLongPressForOwner}
                    header={headerNode}
                    title={
                      <Text style={[styles.postTitle, { color: primaryTextColor }]}>
                        {actorInline}{" "}has started a new Theatre Challenge!
                      </Text>
                    }
                    body={
                      <>
                        <Text style={[styles.challengeGoalText, { color: mutedTextColor }]}>
                          Goal: {target} show{target !== 1 ? "s" : ""}
                          {progress > 0 ? ` · ${progress} already logged` : ""}
                        </Text>
                        <Text style={[styles.subText, { color: mutedTextColor }]}>
                          {formatRelativeVisitDate(new Date(post.createdAt).toISOString().slice(0, 10))}
                        </Text>
                      </>
                    }
                    footer={
                      <LikeButton
                        postId={post._id as Id<"activityPosts">}
                        liked={post.likedByViewer ?? false}
                        likeCount={post.likeCount ?? 0}
                      />
                    }
                  />
                </OwnerSwipeable>
              );
            }

            // ── challenge_completed ─────────────────────────────────────────
            if (post.type === "challenge_completed") {
              const year     = post.challengeYear ?? "";
              const target   = post.challengeTarget ?? 0;
              const progress = post.challengeProgress ?? 0;
              const show     = post.show;
              return (
                <OwnerSwipeable
                  key={post._id}
                  enabled={isMine}
                  onDeletePress={() =>
                    confirmDeletePost(post._id as Id<"activityPosts">, postLabel)
                  }
                >
                  <FeedPostCard
                    backgroundColor={cardBackground}
                    borderColor={cardBorder}
                    onPress={() => router.push("/challenges")}
                    onLongPress={onLongPressForOwner}
                    header={headerNode}
                    title={
                      <Text style={[styles.postTitle, { color: primaryTextColor }]}>
                        {actorInline}{" "}completed their {year} Theatre Challenge!
                      </Text>
                    }
                    body={
                      <>
                        <Text style={[styles.challengeGoalText, { color: mutedTextColor }]}>
                          {progress}/{target} shows
                        </Text>
                        {show && post.visitDate && (
                          <Text style={[styles.subText, { color: mutedTextColor }]}>
                            {"Final show: "}
                            <Text
                              style={[styles.showText, { color: showTextColor }]}
                              onPress={() =>
                                router.push({ pathname: "/show/[showId]", params: { showId: show._id } })
                              }
                            >
                              {show.name}
                            </Text>
                            {" · "}{formatRelativeVisitDate(post.visitDate)}
                          </Text>
                        )}
                      </>
                    }
                    poster={
                      show ? (
                        <Pressable
                          style={StyleSheet.absoluteFillObject}
                          onPress={() =>
                            router.push({ pathname: "/show/[showId]", params: { showId: show._id } })
                          }
                        >
                          {show.images[0] ? (
                            <Image source={{ uri: show.images[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                          ) : (
                            <ShowPlaceholder name={show.name} style={{ width: "100%", height: "100%", aspectRatio: undefined }} />
                          )}
                        </Pressable>
                      ) : undefined
                    }
                    posterBackground={posterBackground}
                    footer={
                      <LikeButton
                        postId={post._id as Id<"activityPosts">}
                        liked={post.likedByViewer ?? false}
                        likeCount={post.likeCount ?? 0}
                      />
                    }
                  />
                </OwnerSwipeable>
              );
            }

            // ── challenge_milestone ─────────────────────────────────────────
            if (post.type === "challenge_milestone") {
              const year     = post.challengeYear ?? "";
              const target   = post.challengeTarget ?? 0;
              const progress = post.challengeProgress ?? 0;
              const pct      = target > 0 ? Math.round((progress / target) * 100) : 0;
              const show     = post.show;
              return (
                <OwnerSwipeable
                  key={post._id}
                  enabled={isMine}
                  onDeletePress={() =>
                    confirmDeletePost(post._id as Id<"activityPosts">, postLabel)
                  }
                >
                  <FeedPostCard
                    backgroundColor={cardBackground}
                    borderColor={cardBorder}
                    onPress={() => router.push("/challenges")}
                    onLongPress={onLongPressForOwner}
                    header={headerNode}
                    title={
                      <Text style={[styles.postTitle, { color: primaryTextColor }]}>
                        {actorInline}{" "}is{" "}
                        {pct === 50 ? "halfway" : `${pct}%`}{" "}
                        through their {year} Theatre Challenge!
                      </Text>
                    }
                    body={
                      <>
                        <Text style={[styles.challengeGoalText, { color: mutedTextColor }]}>
                          {progress} of {target} shows
                        </Text>
                        {show && post.visitDate && (
                          <Text style={[styles.subText, { color: mutedTextColor }]}>
                            {"Latest: "}
                            <Text
                              style={[styles.showText, { color: showTextColor }]}
                              onPress={() =>
                                router.push({ pathname: "/show/[showId]", params: { showId: show._id } })
                              }
                            >
                              {show.name}
                            </Text>
                            {" · "}{formatRelativeVisitDate(post.visitDate)}
                          </Text>
                        )}
                      </>
                    }
                    poster={
                      show ? (
                        <Pressable
                          style={StyleSheet.absoluteFillObject}
                          onPress={() =>
                            router.push({ pathname: "/show/[showId]", params: { showId: show._id } })
                          }
                        >
                          {show.images[0] ? (
                            <Image source={{ uri: show.images[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                          ) : (
                            <ShowPlaceholder name={show.name} style={{ width: "100%", height: "100%", aspectRatio: undefined }} />
                          )}
                        </Pressable>
                      ) : undefined
                    }
                    posterBackground={posterBackground}
                    footer={
                      <LikeButton
                        postId={post._id as Id<"activityPosts">}
                        liked={post.likedByViewer ?? false}
                        likeCount={post.likeCount ?? 0}
                      />
                    }
                  />
                </OwnerSwipeable>
              );
            }

            // ── visit_created ───────────────────────────────────────────────
            const visitShow = post.show;
            if (!visitShow) return null;
            const location = formatVisitLocation(post.visitDate ?? "", post.theatre, post.city);
            const openParticipants = () =>
              setParticipantsModal({
                actor: post.actor,
                taggedUsers: tagged,
                taggedGuestNames: guestNames,
              });
            const visitIsUpcoming = post.visitDate ? isFutureDate(post.visitDate) : false;
            const verbPhrase = visitIsUpcoming ? "is seeing" : "saw";

            const openVisitDetails = post.visitId
              ? () =>
                  router.push({
                    pathname: "/visit/[visitId]",
                    params: { visitId: String(post.visitId) },
                  })
              : undefined;

            return (
              <OwnerSwipeable
                key={post._id}
                enabled={isMine}
                onDeletePress={() =>
                  confirmDeletePost(post._id as Id<"activityPosts">, postLabel)
                }
              >
                <FeedPostCard
                  backgroundColor={cardBackground}
                  borderColor={cardBorder}
                  onPress={openVisitDetails}
                  onLongPress={onLongPressForOwner}
                  header={headerNode}
                  title={
                    <Text style={[styles.postTitle, { color: primaryTextColor }]}>
                      {actorInline}{" "}{verbPhrase}{" "}
                      <Text
                        style={[styles.showText, { color: showTextColor }]}
                        onPress={() =>
                          router.push({ pathname: "/show/[showId]", params: { showId: visitShow._id } })
                        }
                      >
                        {visitShow.name}
                      </Text>
                      {totalTagged === 1 && tagged.length === 1 && (
                        <>
                          {" with "}
                          <Text
                            style={[styles.actorText, { color: actorLinkColor }]}
                            onPress={() =>
                              router.push({ pathname: "/user/[username]", params: { username: tagged[0].username } })
                            }
                          >
                            {getDisplayName(tagged[0].name, tagged[0].username)}
                          </Text>
                        </>
                      )}
                      {totalTagged === 1 && guestNames.length === 1 && (
                        <>
                          {" with "}
                          <Text style={[styles.actorText, { color: primaryTextColor }]}>
                            {guestNames[0]}
                          </Text>
                        </>
                      )}
                      {totalTagged >= 2 && (
                        <>
                          {" with "}
                          <Text
                            style={[styles.actorText, { color: actorLinkColor }]}
                            onPress={openParticipants}
                          >
                            {totalTagged} others
                          </Text>
                        </>
                      )}
                      {" "}{post.visitDate ? formatRelativeVisitDate(post.visitDate) : ""}
                    </Text>
                  }
                  body={
                    (location || post.notes || post.photos?.length || post.rankAtPost) ? (
                      <>
                        {!!location && (
                          <Text
                            style={[styles.subText, { color: mutedTextColor }]}
                            onPress={
                              post.venueId
                                ? () =>
                                    router.push({
                                      pathname: "/venue/[venueId]",
                                      params: { venueId: String(post.venueId) },
                                    })
                                : undefined
                            }
                          >
                            {location}
                          </Text>
                        )}
                        {!!post.notes && (
                          <NotesText
                            text={post.notes}
                            style={styles.notesText}
                            color={notesTextColor}
                          />
                        )}
                        {post.photos && post.photos.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.visitPhotosRow}
                          >
                            {post.photos.map((uri) => (
                              <Pressable
                                key={uri}
                                onPress={() => setSelectedPhotoUri(uri)}
                                accessibilityRole="imagebutton"
                                accessibilityLabel="Open visit photo"
                              >
                                <Image
                                  source={{ uri }}
                                  style={styles.visitPhotoThumb}
                                  contentFit="cover"
                                />
                              </Pressable>
                            ))}
                          </ScrollView>
                        ) : null}
                        {!!post.rankAtPost && (
                          <Text style={[styles.rankText, { color: mutedTextColor }]}>
                            Ranked #{post.rankAtPost} of {post.rankingTotal}
                          </Text>
                        )}
                      </>
                    ) : undefined
                  }
                  poster={
                    <Pressable
                      style={StyleSheet.absoluteFillObject}
                      onPress={() =>
                        router.push({ pathname: "/show/[showId]", params: { showId: visitShow._id } })
                      }
                    >
                      {visitShow.images[0] ? (
                        <Image source={{ uri: visitShow.images[0] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                      ) : (
                        <ShowPlaceholder name={visitShow.name} style={{ width: "100%", height: "100%", aspectRatio: undefined }} />
                      )}
                    </Pressable>
                  }
                  posterBackground={posterBackground}
                  footer={
                    <LikeButton
                      postId={post._id as Id<"activityPosts">}
                      liked={post.likedByViewer ?? false}
                      likeCount={post.likeCount ?? 0}
                    />
                  }
                />
              </OwnerSwipeable>
            );
          })}

        {!isLoading &&
          posts.length > 0 &&
          (posts.length >= feedLimit || isFetchingMore) && (
            <Pressable
              style={[styles.loadMoreBtn, { borderColor: cardBorder }]}
              onPress={() => setFeedLimit((prev) => prev + FEED_PAGE_SIZE)}
              disabled={isFetchingMore}
            >
              {isFetchingMore ? (
                <ActivityIndicator size="small" color={Colors[theme].accent} />
              ) : (
                <Text style={[styles.loadMoreText, { color: Colors[theme].accent }]}>
                  Load more
                </Text>
              )}
            </Pressable>
          )}
      </ScrollView>

      <ParticipantsSheet
        visible={participantsModal !== null}
        onClose={() => setParticipantsModal(null)}
        actor={participantsModal?.actor ?? { _id: "", username: "" }}
        taggedUsers={participantsModal?.taggedUsers ?? []}
        taggedGuestNames={participantsModal?.taggedGuestNames ?? []}
        onNavigate={(username) =>
          router.push({ pathname: "/user/[username]", params: { username } })
        }
        theme={theme}
      />

      {reportTarget && (
        <ReportSheet
          visible={reportTarget !== null}
          onClose={closeReportSheet}
          target={reportTarget}
        />
      )}

      <Modal
        visible={selectedPhotoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoUri(null)}
      >
        <Pressable
          style={styles.photoModalBackdrop}
          onPress={() => setSelectedPhotoUri(null)}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          {selectedPhotoUri ? (
            <Image
              source={{ uri: selectedPhotoUri }}
              style={styles.photoModalImage}
              contentFit="contain"
            />
          ) : null}
          <View style={styles.photoModalClose}>
            <Text style={styles.photoModalCloseText}>x</Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  segmentRow: { flexDirection: "row", gap: 8 },
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
  content: {
    paddingHorizontal: 16,
    gap: 10,
  },
  swipeDeleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 88,
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeDeleteLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // ── Text styles shared across post types ───────────────────────────────────
  postTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  actorText: {
    fontWeight: "700",
  },
  actorHandleText: {
    fontSize: 11,
    fontWeight: "500",
  },
  showText: {
    fontWeight: "700",
  },
  subText: {
    fontSize: 13,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  visitPhotosRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  visitPhotoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  photoModalImage: {
    width: "100%",
    height: "82%",
  },
  photoModalClose: {
    position: "absolute",
    top: 54,
    right: 22,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalCloseText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "600",
  },
  challengeGoalText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // ── Bottom sheet ───────────────────────────────────────────────────────────
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
  sheetRowText: { flex: 1, gap: 2 },
  sheetRowName: { fontSize: 16, fontWeight: "600" },
  sheetRowHandle: { fontSize: 13, fontWeight: "500" },
});
