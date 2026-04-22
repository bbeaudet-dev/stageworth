import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavGuard } from "@/hooks/use-nav-guard";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatRelativeTime } from "@/utils/dates";
import { getInitials, getDisplayName } from "@/utils/user";

type NotificationListItem = {
  _id: Id<"notifications">;
  type: string;
  isRead: boolean;
  createdAt: number;
  visitId?: string | null;
  showId?: string | null;
  productionId?: string | null;
  postId?: string | null;
  tripId?: Id<"trips"> | null;
  myTripMembershipStatus?: string | null;
  myVisitParticipantStatus?: string | null;
  actor: { _id: Id<"users">; username: string; name?: string | null; avatarUrl: string | null } | null;
  show: { _id: Id<"shows">; name: string; images: string[] } | null;
  trip: { _id: Id<"trips">; name: string } | null;
};

// ─── Inbox tabs ───────────────────────────────────────────────────────────────
//
// Every notification type has exactly one home inbox. The "All" tab shows
// everything. Tab order is optimized for how often each inbox fills up based
// on user behavior: likes/tags are the highest-volume, show alerts less so.

type InboxTab = "all" | "shows" | "follows" | "tags" | "posts" | "trips";

const INBOX_TABS: { id: InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "shows", label: "Shows" },
  { id: "follows", label: "Follows" },
  { id: "tags", label: "Tags" },
  { id: "posts", label: "Posts" },
  { id: "trips", label: "Trips" },
];

function inboxForType(type: string): InboxTab | null {
  switch (type) {
    case "post_like":
      return "posts";
    case "visit_tag":
    case "visit_tag_accepted":
    case "visit_tag_declined":
      return "tags";
    case "new_follow":
      return "follows";
    case "trip_invite":
    case "trip_invite_accepted":
    case "trip_invite_declined":
      return "trips";
    case "show_announced":
    case "closing_soon":
      return "shows";
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const notifications = useQuery(api.notifications.listForCurrentUser, { limit: 60 }) as
    | NotificationListItem[]
    | undefined;
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const respondToTripInvitation = useMutation(api.trips.trips.respondToTripInvitation);
  const [inviteResponding, setInviteResponding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const guard = useNavGuard();
  const onAccent = Colors[theme].onAccent;

  // Per-tab unread counts drive both the filter logic and the little badge
  // dots rendered next to each tab label.
  const unreadByTab = useMemo(() => {
    const counts: Record<InboxTab, number> = {
      all: 0,
      posts: 0,
      tags: 0,
      follows: 0,
      trips: 0,
      shows: 0,
    };
    for (const n of notifications ?? []) {
      if (n.isRead) continue;
      counts.all += 1;
      const inbox = inboxForType(n.type);
      if (inbox) counts[inbox] += 1;
    }
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (!notifications) return notifications;
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => inboxForType(n.type) === activeTab);
  }, [notifications, activeTab]);

  // Map active tab → the set of notification types it covers. Used so "Mark
  // all read" only marks the current inbox, matching user expectations.
  const typesForActiveTab = useMemo((): string[] | undefined => {
    switch (activeTab) {
      case "all":
        return undefined;
      case "posts":
        return ["post_like"];
      case "tags":
        return ["visit_tag", "visit_tag_accepted", "visit_tag_declined"];
      case "follows":
        return ["new_follow"];
      case "trips":
        return ["trip_invite", "trip_invite_accepted", "trip_invite_declined"];
      case "shows":
        return ["show_announced", "closing_soon"];
    }
  }, [activeTab]);

  const bg = Colors[theme].background;
  const text = Colors[theme].text;
  const accent = Colors[theme].accent;
  const mutedText = theme === "dark" ? "#a0a4aa" : "#666";
  const cardBg = theme === "dark" ? "#18181b" : "#fff";
  const cardBorder = theme === "dark" ? "#27272f" : "#e8e8e8";
  const unreadIndicator = accent;
  const avatarFallbackBg = theme === "dark" ? "#3a3a50" : "#d4d4f0";
  const emptyTextColor = theme === "dark" ? "#9ca3af" : "#808080";
  const tabBg = theme === "dark" ? "#111115" : "#fff";
  const tabBorder = theme === "dark" ? "#3a3a44" : "#d6d6d6";
  const tabActiveBg = theme === "dark" ? "#fff" : "#1f1f1f";
  const tabTextColor = theme === "dark" ? "#b0b4bc" : "#444";
  const tabTextActive = theme === "dark" ? "#111" : "#fff";

  const hasUnreadInActiveTab =
    activeTab === "all"
      ? (notifications ?? []).some((n) => !n.isRead)
      : unreadByTab[activeTab] > 0;

  const handleNotificationPress = guard(async (notif: NotificationListItem) => {
    if (!notif.isRead) {
      await markAsRead({ notificationId: notif._id });
    }
    if (notif.type === "visit_tag" && notif.visitId) {
      // Pending invites route to the accept screen; accepted/declined go to
      // the standard visit detail view.
      if (notif.myVisitParticipantStatus === "pending") {
        router.push({
          pathname: "/accept-visit/[visitId]",
          params: { visitId: notif.visitId },
        });
      } else {
        router.push({ pathname: "/visit/[visitId]", params: { visitId: notif.visitId } });
      }
    } else if (
      (notif.type === "visit_tag_accepted" || notif.type === "visit_tag_declined") &&
      notif.visitId
    ) {
      router.push({ pathname: "/visit/[visitId]", params: { visitId: notif.visitId } });
    } else if (notif.type === "post_like" && notif.visitId) {
      router.push({ pathname: "/visit/[visitId]", params: { visitId: notif.visitId } });
    } else if (notif.type === "new_follow" && notif.actor) {
      router.push({ pathname: "/user/[username]", params: { username: notif.actor.username } });
    } else if (
      (notif.type === "trip_invite" || notif.type === "trip_invite_accepted" || notif.type === "trip_invite_declined") &&
      notif.tripId
    ) {
      router.push({ pathname: "/(tabs)/plan/[tripId]", params: { tripId: notif.tripId } });
    } else if (
      (notif.type === "closing_soon" || notif.type === "show_announced") &&
      notif.show
    ) {
      router.push({ pathname: "/show/[showId]", params: { showId: notif.show._id } });
    }
  });

  const handleVisitTagView = (notif: NotificationListItem) => {
    if (!notif.visitId) return;
    if (!notif.isRead) void markAsRead({ notificationId: notif._id });
    router.push({
      pathname: "/accept-visit/[visitId]",
      params: { visitId: notif.visitId },
    });
  };

  const handleInviteRespond = async (notif: NotificationListItem, accept: boolean) => {
    if (!notif.tripId) return;
    const key = notif._id + (accept ? ":accept" : ":decline");
    setInviteResponding(key);
    try {
      if (!notif.isRead) await markAsRead({ notificationId: notif._id });
      await respondToTripInvitation({ tripId: notif.tripId!, accept });
      if (accept) {
        router.push({ pathname: "/(tabs)/plan/[tripId]", params: { tripId: notif.tripId } });
      }
    } catch {
      Alert.alert("Error", "Could not respond to invitation.");
    } finally {
      setInviteResponding(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerBackButtonDisplayMode: "minimal",
          headerRight: hasUnreadInActiveTab
            ? () => (
                <Pressable
                  onPress={() =>
                    markAllAsRead(
                      typesForActiveTab ? { types: typesForActiveTab } : {},
                    )
                  }
                  hitSlop={10}
                >
                  <Text style={[styles.markAllText, { color: accent }]}>Mark all read</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRowScroll}
        contentContainerStyle={styles.tabRowContent}
      >
        {INBOX_TABS.map((tab) => {
          const active = activeTab === tab.id;
          const badge = unreadByTab[tab.id];
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabButton,
                { borderColor: tabBorder, backgroundColor: tabBg },
                active && { backgroundColor: tabActiveBg, borderColor: tabActiveBg },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tabTextColor },
                  active && { color: tabTextActive },
                ]}
              >
                {tab.label}
              </Text>
              {badge > 0 ? (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: active ? tabTextActive : accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: active ? tabActiveBg : onAccent },
                    ]}
                  >
                    {badge > 99 ? "99+" : badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {notifications === undefined && (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>Loading...</Text>
        )}
        {notifications !== undefined && notifications.length === 0 && (
          <EmptyState icon="bell.fill" title="No notifications yet" subtitle="You'll be notified when someone follows you or tags you in a visit." />
        )}
        {notifications !== undefined &&
          notifications.length > 0 &&
          (filteredNotifications?.length ?? 0) === 0 && (
            <Text style={[styles.emptyText, { color: emptyTextColor }]}>
              Nothing here yet.
            </Text>
          )}
        {(filteredNotifications ?? []).map((notif) => {
          const timeStr = formatRelativeTime(notif.createdAt);
          const isSystemNotif = notif.type === "closing_soon" || notif.type === "show_announced";
          const actorLabel = isSystemNotif
            ? ""
            : getDisplayName(notif.actor?.name, notif.actor?.username ?? "Someone");
          const isTripInvite = notif.type === "trip_invite";
          const acceptKey = notif._id + ":accept";
          const declineKey = notif._id + ":decline";
          const isRespondingToThis = inviteResponding === acceptKey || inviteResponding === declineKey;

          return (
            <Pressable
              key={notif._id}
              onPress={() => handleNotificationPress(notif)}
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
                !notif.isRead && styles.cardUnread,
              ]}
            >
              {!notif.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: unreadIndicator }]} />
              )}
              <View style={styles.cardContent}>
                {notif.actor?.avatarUrl ? (
                  <Image source={{ uri: notif.actor.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : isSystemNotif ? (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarFallbackBg }]}>
                    <IconSymbol name="theatermasks.fill" size={20} color={accent} />
                  </View>
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarFallbackBg }]}>
                    <Text style={[styles.avatarFallbackText, { color: accent }]}>
                      {getInitials(notif.actor?.name, notif.actor?.username)}
                    </Text>
                  </View>
                )}
                <View style={[styles.textBlock, { gap: isTripInvite ? 6 : 3 }]}>
                  <Text style={[styles.notifText, { color: text }]}>
                    {!isSystemNotif && <Text style={styles.boldName}>{actorLabel}</Text>}
                    {notif.type === "visit_tag" && notif.show && (
                      <>{" tagged you in their visit to "}<Text style={styles.boldName}>{notif.show.name}</Text></>
                    )}
                    {notif.type === "visit_tag" && !notif.show && " tagged you in a visit"}
                    {notif.type === "visit_tag_accepted" && notif.show && (
                      <>{" accepted your tag on "}<Text style={styles.boldName}>{notif.show.name}</Text></>
                    )}
                    {notif.type === "visit_tag_accepted" && !notif.show && " accepted your visit tag"}
                    {notif.type === "visit_tag_declined" && notif.show && (
                      <>{" declined your tag on "}<Text style={styles.boldName}>{notif.show.name}</Text></>
                    )}
                    {notif.type === "visit_tag_declined" && !notif.show && " declined your visit tag"}
                    {notif.type === "post_like" && notif.show && (
                      <>{" liked your post about "}<Text style={styles.boldName}>{notif.show.name}</Text></>
                    )}
                    {notif.type === "post_like" && !notif.show && " liked your post"}
                    {notif.type === "new_follow" && " started following you"}
                    {isTripInvite && (
                      <>{" invited you to join their trip "}<Text style={styles.boldName}>{notif.trip?.name ?? "a trip"}</Text></>
                    )}
                    {notif.type === "trip_invite_accepted" && (
                      <>{" accepted your invitation to "}<Text style={styles.boldName}>{notif.trip?.name ?? "your trip"}</Text></>
                    )}
                    {notif.type === "trip_invite_declined" && (
                      <>{" declined your invitation to "}<Text style={styles.boldName}>{notif.trip?.name ?? "your trip"}</Text></>
                    )}
                    {notif.type === "closing_soon" && notif.show && (
                      <><Text style={styles.boldName}>{notif.show.name}</Text>{" is closing soon!"}</>
                    )}
                    {notif.type === "closing_soon" && !notif.show && "A show you follow is closing soon"}
                    {notif.type === "show_announced" && notif.show && (
                      <>{"New show announced: "}<Text style={styles.boldName}>{notif.show.name}</Text></>
                    )}
                    {notif.type === "show_announced" && !notif.show && "A new show has been announced"}
                  </Text>
                  <Text style={[styles.timeText, { color: mutedText }]}>{timeStr}</Text>

                  {/* Accept / Decline buttons inline under the text */}
                  {isTripInvite && notif.tripId && notif.myTripMembershipStatus === "pending" ? (
                    <View style={styles.inviteActions}>
                      <Pressable
                        style={[styles.inviteBtn, { backgroundColor: accent, opacity: isRespondingToThis ? 0.5 : 1 }]}
                        disabled={isRespondingToThis}
                        onPress={(e) => { e.stopPropagation?.(); handleInviteRespond(notif, true); }}
                      >
                        {inviteResponding === acceptKey
                          ? <ActivityIndicator size="small" color={onAccent} />
                          : <Text style={[styles.inviteBtnText, { color: onAccent }]}>Accept</Text>}
                      </Pressable>
                      <Pressable
                        style={[styles.inviteBtn, styles.inviteBtnOutline, { borderColor: cardBorder, opacity: isRespondingToThis ? 0.5 : 1 }]}
                        disabled={isRespondingToThis}
                        onPress={(e) => { e.stopPropagation?.(); handleInviteRespond(notif, false); }}
                      >
                        {inviteResponding === declineKey
                          ? <ActivityIndicator size="small" color={mutedText} />
                          : <Text style={[styles.inviteBtnText, { color: mutedText }]}>Decline</Text>}
                      </Pressable>
                    </View>
                  ) : isTripInvite && notif.tripId && notif.myTripMembershipStatus ? (
                    <Text style={[styles.inviteRespondedLabel, { color: mutedText }]}>
                      {notif.myTripMembershipStatus === "accepted" ? "✓ Joined" : "Declined"}
                    </Text>
                  ) : notif.type === "visit_tag" &&
                    notif.visitId &&
                    notif.myVisitParticipantStatus === "pending" ? (
                    <View style={styles.inviteActions}>
                      <Pressable
                        style={[styles.inviteBtn, { backgroundColor: accent }]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleVisitTagView(notif);
                        }}
                      >
                        <Text style={[styles.inviteBtnText, { color: onAccent }]}>View</Text>
                      </Pressable>
                    </View>
                  ) : notif.type === "visit_tag" &&
                    (notif.myVisitParticipantStatus === "accepted" ||
                      notif.myVisitParticipantStatus === "declined") ? (
                    <Text style={[styles.inviteRespondedLabel, { color: mutedText }]}>
                      {notif.myVisitParticipantStatus === "accepted" ? "✓ Accepted" : "Declined"}
                    </Text>
                  ) : null}
                </View>
                {(notif.type === "visit_tag" ||
                  notif.type === "visit_tag_accepted" ||
                  notif.type === "visit_tag_declined" ||
                  notif.type === "post_like") && notif.show?.images[0] && (
                  <Image
                    source={{ uri: notif.show.images[0] }}
                    style={[styles.showThumb, { backgroundColor: playbillMatBackground(theme) }]}
                    contentFit="contain"
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardUnread: {
    borderLeftWidth: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: "700",
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  notifText: {
    fontSize: 14,
    lineHeight: 20,
  },
  boldName: {
    fontWeight: "700",
  },
  timeText: {
    fontSize: 12,
  },
  showThumb: {
    width: 40,
    height: 58,
    borderRadius: 6,
    flexShrink: 0,
  },
  inviteActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  inviteBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  inviteBtnOutline: { borderWidth: StyleSheet.hairlineWidth },
  inviteBtnText: { fontSize: 13, fontWeight: "700" },
  inviteRespondedLabel: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  tabRowScroll: {
    flexGrow: 0,
  },
  tabRowContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
  },
});
