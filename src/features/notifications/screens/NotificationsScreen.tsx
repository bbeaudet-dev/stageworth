import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const notifications = useQuery(api.notifications.listForCurrentUser, { limit: 60 });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markAsRead = useMutation(api.notifications.markAsRead);

  const bg = Colors[theme].background;
  const text = Colors[theme].text;
  const accent = Colors[theme].accent;
  const mutedText = theme === "dark" ? "#a0a4aa" : "#666";
  const cardBg = theme === "dark" ? "#18181b" : "#fff";
  const cardBorder = theme === "dark" ? "#27272f" : "#e8e8e8";
  const unreadIndicator = accent;
  const avatarFallbackBg = theme === "dark" ? "#3a3a50" : "#d4d4f0";
  const emptyTextColor = theme === "dark" ? "#9ca3af" : "#808080";

  const hasUnread = (notifications ?? []).some((n) => !n.isRead);

  const handleNotificationPress = async (notif: NonNullable<typeof notifications>[number]) => {
    if (!notif.isRead) {
      await markAsRead({ notificationId: notif._id });
    }
    if (notif.type === "visit_tag" && notif.visitId) {
      router.push({ pathname: "/visit/[visitId]", params: { visitId: notif.visitId } });
    } else if (notif.type === "new_follow") {
      router.push({
        pathname: "/user/[username]",
        params: { username: notif.actor.username },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerBackButtonDisplayMode: "minimal",
          headerRight: hasUnread
            ? () => (
                <Pressable onPress={() => markAllAsRead()} hitSlop={10}>
                  <Text style={[styles.markAllText, { color: accent }]}>Mark all read</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {notifications === undefined && (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>Loading...</Text>
        )}
        {notifications !== undefined && notifications.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.fill" size={40} color={mutedText} />
            <Text style={[styles.emptyTitle, { color: text }]}>No notifications yet</Text>
            <Text style={[styles.emptyText, { color: mutedText }]}>
              You'll be notified when someone follows you or tags you in a visit.
            </Text>
          </View>
        )}
        {(notifications ?? []).map((notif) => {
          const timeStr = formatRelativeTime(notif.createdAt);
          const actorLabel = notif.actor.name?.split(" ")[0] ?? notif.actor.username;

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
                {notif.actor.avatarUrl ? (
                  <Image
                    source={{ uri: notif.actor.avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarFallbackBg }]}>
                    <Text style={[styles.avatarFallbackText, { color: accent }]}>
                      {getInitials(notif.actor.name, notif.actor.username)}
                    </Text>
                  </View>
                )}
                <View style={styles.textBlock}>
                  <Text style={[styles.notifText, { color: text }]}>
                    <Text style={styles.boldName}>{actorLabel}</Text>
                    {notif.type === "visit_tag" && notif.show && (
                      <>
                        {" tagged you in their visit to "}
                        <Text style={styles.boldName}>{notif.show.name}</Text>
                      </>
                    )}
                    {notif.type === "visit_tag" && !notif.show && " tagged you in a visit"}
                    {notif.type === "new_follow" && " started following you"}
                  </Text>
                  <Text style={[styles.timeText, { color: mutedText }]}>{timeStr}</Text>
                </View>
                {notif.type === "visit_tag" && notif.show?.images[0] && (
                  <Image
                    source={{ uri: notif.show.images[0] }}
                    style={styles.showThumb}
                    contentFit="cover"
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
  emptyState: {
    alignItems: "center",
    gap: 12,
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
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
});
