import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CreateTripSheet } from "@/features/plan/components/CreateTripSheet";
import { TripChatTab } from "@/features/plan/components/TripChatTab";
import { TripPartyTab } from "@/features/plan/components/TripPartyTab";
import { TripScheduleTab } from "@/features/plan/components/TripScheduleTab";
import { TripShowsTab } from "@/features/plan/components/TripShowsTab";
import {
    useClosingSoonForTrip,
    useTripById,
    useTripData,
} from "@/features/plan/hooks/useTripData";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(startDate: string, endDate: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const s = new Date(startDate + "T00:00:00Z");
  const e = new Date(endDate + "T00:00:00Z");
  const sm = months[s.getUTCMonth()],
    em = months[e.getUTCMonth()];
  const sd = s.getUTCDate(),
    ed = e.getUTCDate();
  const sy = s.getUTCFullYear(),
    ey = e.getUTCFullYear();
  if (sy === ey && sm === em) return `${sm} ${sd}–${ed}, ${sy}`;
  if (sy === ey) return `${sm} ${sd} – ${em} ${ed}, ${sy}`;
  return `${sm} ${sd}, ${sy} – ${em} ${ed}, ${ey}`;
}

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "shows" | "schedule" | "party" | "chat";

const TRIP_TABS: Tab[] = ["shows", "schedule", "party", "chat"];

function tabLabel(t: Tab): string {
  switch (t) {
    case "shows":
      return "Shows";
    case "schedule":
      return "Schedule";
    case "party":
      return "Party";
    case "chat":
      return "Chat";
  }
}

const PRESENCE_HEARTBEAT_MS = 25_000;
const TAB_PRESENCE_AVATAR_CAP = 3;

// ─── screen ───────────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const [activeTab, setActiveTab] = useState<Tab>("shows");
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [inviteResponding, setInviteResponding] = useState<
    "accept" | "decline" | null
  >(null);

  const typedTripId = tripId as Id<"trips">;
  const trip = useTripById(typedTripId);
  const closingSoon = useClosingSoonForTrip(typedTripId);
  const { updateTrip, deleteTrip } = useTripData();

  const tripPresenceOthers = useQuery(api["trips/tripPresence"].getTripPresence, {
    tripId: typedTripId,
  });
  const heartbeatTripPresence = useMutation(
    api["trips/tripPresence"].heartbeatTripPresence,
  );
  const clearTripPresence = useMutation(api["trips/tripPresence"].clearTripPresence);
  const respondToTripInvitation = useMutation(
    api["trips/trips"].respondToTripInvitation,
  );

  const handleInviteRespond = async (accept: boolean) => {
    setInviteResponding(accept ? "accept" : "decline");
    try {
      await respondToTripInvitation({ tripId: typedTripId, accept });
      if (!accept) router.back();
    } catch {
      Alert.alert("Error", "Could not respond to invitation. Try again.");
    } finally {
      setInviteResponding(null);
    }
  };

  // Keep activeTab in a ref so the interval callback always reads the latest value.
  const activeTabRef = useRef<Tab>(activeTab);
  activeTabRef.current = activeTab;

  useFocusEffect(
    useCallback(() => {
      void heartbeatTripPresence({
        tripId: typedTripId,
        activeTab: activeTabRef.current,
      });
      const id = setInterval(() => {
        void heartbeatTripPresence({
          tripId: typedTripId,
          activeTab: activeTabRef.current,
        });
      }, PRESENCE_HEARTBEAT_MS);
      return () => {
        clearInterval(id);
        void clearTripPresence({ tripId: typedTripId });
      };
    }, [typedTripId, heartbeatTripPresence, clearTripPresence]),
  );

  // Immediately send a heartbeat with the new activeTab whenever the user switches tabs.
  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    void heartbeatTripPresence({ tripId: typedTripId, activeTab: tab });
  };

  const handleDeleteTrip = () => {
    Alert.alert("Delete Trip", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTrip({ tripId: typedTripId });
          router.back();
        },
      },
    ]);
  };

  const handleThreeDot = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit Trip", "Delete Trip"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (idx) => {
          if (idx === 1) setShowEditTrip(true);
          if (idx === 2) handleDeleteTrip();
        },
      );
    } else {
      Alert.alert("Trip Options", "", [
        { text: "Edit Trip", onPress: () => setShowEditTrip(true) },
        {
          text: "Delete Trip",
          style: "destructive",
          onPress: handleDeleteTrip,
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  if (trip === undefined) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={["top"]}
      >
        <View style={styles.centered}>
          <ActivityIndicator color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (trip === null) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={["top"]}
      >
        <Text style={[styles.errorText, { color: mutedTextColor }]}>
          Trip not found.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: borderColor }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerSide}
          hitSlop={12}
        >
          <IconSymbol size={20} name="chevron.left" color={accentColor} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.tripName, { color: primaryTextColor }]}
            numberOfLines={1}
          >
            {trip.name}
          </Text>
          <Text style={[styles.tripDates, { color: mutedTextColor }]}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>
        <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
          {trip.isOwner ? (
            <Pressable onPress={handleThreeDot} hitSlop={12}>
              <Text style={[styles.threeDot, { color: primaryTextColor }]}>
                ···
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Pending invitation banner */}
      {trip.myMembershipStatus === "pending" ? (
        <View
          style={[
            styles.inviteBanner,
            {
              backgroundColor: accentColor + "12",
              borderBottomColor: accentColor + "30",
            },
          ]}
        >
          <Text style={[styles.inviteBannerText, { color: primaryTextColor }]}>
            You’ve been invited to this trip
          </Text>
          <View style={styles.inviteBannerActions}>
            <Pressable
              style={[
                styles.inviteBannerBtn,
                {
                  backgroundColor: accentColor,
                  opacity: inviteResponding !== null ? 0.5 : 1,
                },
              ]}
              disabled={inviteResponding !== null}
              onPress={() => handleInviteRespond(true)}
            >
              {inviteResponding === "accept" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.inviteBannerBtnText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.inviteBannerBtn,
                styles.inviteBannerBtnOutline,
                { borderColor, opacity: inviteResponding !== null ? 0.5 : 1 },
              ]}
              disabled={inviteResponding !== null}
              onPress={() => handleInviteRespond(false)}
            >
              {inviteResponding === "decline" ? (
                <ActivityIndicator size="small" color={mutedTextColor} />
              ) : (
                <Text
                  style={[
                    styles.inviteBannerBtnText,
                    { color: mutedTextColor },
                  ]}
                >
                  Decline
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Tab bar — avatars appear inline next to tab label */}
      <View
        style={[
          styles.tabBar,
          { borderBottomColor: borderColor, backgroundColor },
        ]}
      >
        {TRIP_TABS.map((t) => {
          const label = tabLabel(t);
          const tabPresence = (tripPresenceOthers ?? []).filter(
            (p: any) => p.activeTab === t,
          );
          const shownAvatars = tabPresence.slice(0, TAB_PRESENCE_AVATAR_CAP);
          const extra = tabPresence.length - TAB_PRESENCE_AVATAR_CAP;
          return (
            <Pressable
              key={t}
              style={styles.tabItem}
              onPress={() => handleSetActiveTab(t)}
            >
              <View style={styles.tabLabelRow}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: activeTab === t ? accentColor : mutedTextColor },
                  ]}
                >
                  {label}
                </Text>
                {shownAvatars.map((p: any, idx: number) => (
                  <View
                    key={String(p.userId)}
                    style={[
                      styles.tabAvatar,
                      {
                        borderColor: backgroundColor,
                        marginLeft: idx === 0 ? 3 : -5,
                      },
                    ]}
                  >
                    {p.avatarUrl ? (
                      <Image
                        source={{ uri: p.avatarUrl }}
                        style={styles.tabAvatarImg}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.tabAvatarImg,
                          styles.tabAvatarFb,
                          { backgroundColor: Colors[theme].surface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabAvatarFbText,
                            { color: mutedTextColor },
                          ]}
                        >
                          {(p.name ?? p.username).slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {extra > 0 ? (
                  <Text
                    style={[
                      styles.tabAvatarMore,
                      { color: mutedTextColor, marginLeft: 2 },
                    ]}
                  >
                    +{extra}
                  </Text>
                ) : null}
              </View>
              {activeTab === t ? (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: accentColor },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === "shows" ? (
          <TripShowsTab
            trip={trip}
            tripId={typedTripId}
            closingSoon={closingSoon}
          />
        ) : activeTab === "schedule" ? (
          <TripScheduleTab trip={trip} tripId={typedTripId} />
        ) : activeTab === "party" ? (
          <TripPartyTab
            trip={trip}
            tripId={typedTripId}
            onViewUser={(username: string) =>
              router.push({
                pathname: "/(tabs)/plan/user/[username]",
                params: { username },
              })
            }
          />
        ) : (
          <TripChatTab />
        )}
      </View>

      <CreateTripSheet
        visible={showEditTrip}
        onClose={() => setShowEditTrip(false)}
        onCreate={async (args) => {
          await updateTrip({ tripId: typedTripId, ...args });
        }}
        initialValues={{
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          description: trip.description,
        }}
      />

    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { padding: 16, fontSize: 15 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 40 },
  headerCenter: { flex: 1, alignItems: "center", gap: 1 },
  tripName: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  tripDates: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  threeDot: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 2,
    lineHeight: 22,
  },
  inviteBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inviteBannerText: { fontSize: 13, fontWeight: "600" },
  inviteBannerActions: { flexDirection: "row", gap: 8 },
  inviteBannerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  inviteBannerBtnOutline: { borderWidth: StyleSheet.hairlineWidth },
  inviteBannerBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabLabelRow: { flexDirection: "row", alignItems: "center" },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  tabAvatar: { borderWidth: 1.5, borderRadius: 10, overflow: "hidden" },
  tabAvatarImg: { width: 16, height: 16, borderRadius: 8 },
  tabAvatarFb: { alignItems: "center", justifyContent: "center" },
  tabAvatarFbText: { fontSize: 7, fontWeight: "700" },
  tabAvatarMore: { fontSize: 9, fontWeight: "700" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },
});
