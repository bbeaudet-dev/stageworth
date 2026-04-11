import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandGradientTitle } from "@/components/BrandGradientTitle";
import { EmptyState } from "@/components/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { ListsSection } from "@/features/profile/components/ListsSection";
import { useProfileListsData } from "@/features/profile/hooks/useProfileListsData";
import type { VisibleProfileList } from "@/features/profile/types";
import { TripCard } from "@/features/plan/components/TripCard";
import { CreateTripSheet } from "@/features/plan/components/CreateTripSheet";
import { CreateListSheet } from "@/features/plan/components/CreateListSheet";
import { useTripData } from "@/features/plan/hooks/useTripData";
import type { TripSummary, TripInvitation } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Id } from "@/convex/_generated/dataModel";

// ─── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;
// Trips that ended ≤ RECENT_DAYS ago still appear in the main list
const RECENT_DAYS = 3;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysSince(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ createList?: string; createTrip?: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;

  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showPastTrips, setShowPastTrips] = useState(false);

  const { profileLists, visibleLists, initializeSystemLists, createCustomList, toggleVisibility } =
    useProfileListsData();
  const [pendingVisibilityIds, setPendingVisibilityIds] = useState<Set<string>>(() => new Set());

  // inputRef kept for scroll-to-lists behaviour (createList param from Search tab)
  const inputRef = useRef(null);

  const { trips, createTrip, respondToTripInvitation } = useTripData();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => { initializeSystemLists().catch(() => undefined); }, [initializeSystemLists]);

  useEffect(() => {
    if (params.createList !== "1") return;
    const t = setTimeout(() => {
      setShowCreateList(true);
      router.setParams({ createList: undefined });
    }, 60);
    return () => clearTimeout(t);
  }, [params.createList, router]);

  useEffect(() => {
    if (params.createTrip !== "1") return;
    // Gate on trips being loaded — on a cold Plan-tab mount the Convex query
    // may not have resolved yet and the sheet would open over a blank list.
    if (trips === undefined) return;
    const t = setTimeout(() => {
      setShowCreateTrip(true);
      router.setParams({ createTrip: undefined });
    }, 60);
    return () => clearTimeout(t);
  }, [params.createTrip, router, trips]);

  // ── Sort trips into display buckets ──────────────────────────────────────
  const { mainList, olderPast } = useMemo(() => {
    const today = todayStr();
    const upcoming = (trips?.upcoming ?? []) as TripSummary[];
    const past = (trips?.past ?? []) as TripSummary[];

    // Active (started and not yet ended)
    const active = upcoming
      .filter((t) => t.startDate <= today)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // Truly upcoming (not started yet), soonest first
    const future = upcoming
      .filter((t) => t.startDate > today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Recently ended (within RECENT_DAYS), most-recently-ended first
    const recentlyEnded = past
      .filter((t) => daysSince(t.endDate) <= RECENT_DAYS)
      .sort((a, b) => b.endDate.localeCompare(a.endDate));

    // Older past — for "View Past Trips" section
    const olderPast = past
      .filter((t) => daysSince(t.endDate) > RECENT_DAYS)
      .sort((a, b) => b.endDate.localeCompare(a.endDate));

    return {
      mainList: [...active, ...recentlyEnded, ...future],
      olderPast,
    };
  }, [trips]);

  const visibleMain = mainList.slice(0, visibleCount);
  const hasMore = mainList.length > visibleCount;
  const remaining = mainList.length - visibleCount;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openTrip = (tripId: string) =>
    router.push({ pathname: "/(tabs)/plan/[tripId]", params: { tripId } });

  const handleCreateCustomList = async ({ name, description }: { name: string; description?: string }) => {
    const listId = await createCustomList({ name, isPublic: false, description });
    router.push({ pathname: "/list/[listId]", params: { listId: String(listId), name } });
  };

  const handleToggleVisibility = async (listId: Id<"userLists">, isPublic: boolean) => {
    const key = String(listId);
    setPendingVisibilityIds((prev) => new Set(prev).add(key));
    try { await toggleVisibility(listId, isPublic); }
    finally {
      setPendingVisibilityIds((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const openList = (list: VisibleProfileList) =>
    router.push({ pathname: "/list/[listId]", params: { listId: String(list._id), name: list.name, seen: list.isSeen ? "1" : "0", systemKey: list.systemKey ?? "" } });

  const handleCreateTrip = async (args: { name: string; startDate: string; endDate: string; description?: string }) => {
    const tripId = await createTrip({ ...args, isPublic: false });
    router.push({ pathname: "/(tabs)/plan/[tripId]", params: { tripId: String(tripId) } });
  };

  const pendingInvitations = trips?.pendingInvitations ?? [];
  const isTripsLoading = trips === undefined;
  const hasAnyTrips = mainList.length > 0 || olderPast.length > 0 || pendingInvitations.length > 0;

  const handleRespond = async (tripId: string, accept: boolean) => {
    setRespondingId(tripId + (accept ? ":accept" : ":decline"));
    try {
      await respondToTripInvitation({ tripId: tripId as Id<"trips">, accept });
      if (accept) {
        router.push({ pathname: "/(tabs)/plan/[tripId]", params: { tripId } });
      }
    } catch {
      Alert.alert("Error", "Could not respond to invitation.");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <BrandGradientTitle text="Plan" fontSize={28} />
        </View>

        {/* Trips section */}
        <View style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Trips</Text>
            <Pressable
              style={[styles.iconButton, { backgroundColor: accentColor + "18", borderColor: accentColor + "55" }]}
              onPress={() => setShowCreateTrip(true)}
            >
              <IconSymbol size={18} name="plus" color={accentColor} />
            </Pressable>
          </View>

          {/* Pending invitations — shown before the normal trip list */}
          {pendingInvitations.map((inv: TripInvitation) => {
            const acceptKey = inv._id + ":accept";
            const declineKey = inv._id + ":decline";
            const isResponding = respondingId === acceptKey || respondingId === declineKey;
            return (
              <Pressable
                key={String(inv._id)}
                style={[styles.inviteCard, { backgroundColor: surfaceColor, borderColor: accentColor + "55" }]}
                onPress={() => openTrip(String(inv._id))}
              >
                <View style={styles.inviteCardHeader}>
                  <View style={[styles.inviteBadge, { backgroundColor: accentColor + "18" }]}>
                    <Text style={[styles.inviteBadgeText, { color: accentColor }]}>Invited</Text>
                  </View>
                  <Text style={[styles.inviteCardName, { color: primaryTextColor }]} numberOfLines={1}>{inv.name}</Text>
                  <Text style={[styles.inviteCardSub, { color: mutedTextColor }]}>
                    from {inv.inviterName ?? inv.inviterUsername} · {inv.showCount} show{inv.showCount === 1 ? "" : "s"}
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <Pressable
                    style={[styles.inviteBtn, { backgroundColor: accentColor, opacity: isResponding ? 0.5 : 1 }]}
                    disabled={isResponding}
                    onPress={(e) => { e.stopPropagation?.(); handleRespond(String(inv._id), true); }}
                  >
                    {respondingId === acceptKey
                      ? <ActivityIndicator size="small" color={onAccent} />
                      : <Text style={[styles.inviteBtnText, { color: onAccent }]}>Accept</Text>}
                  </Pressable>
                  <Pressable
                    style={[styles.inviteBtn, styles.inviteBtnOutline, { borderColor, opacity: isResponding ? 0.5 : 1 }]}
                    disabled={isResponding}
                    onPress={(e) => { e.stopPropagation?.(); handleRespond(String(inv._id), false); }}
                  >
                    {respondingId === declineKey
                      ? <ActivityIndicator size="small" color={mutedTextColor} />
                      : <Text style={[styles.inviteBtnText, { color: mutedTextColor }]}>Decline</Text>}
                  </Pressable>
                </View>
              </Pressable>
            );
          })}

          {isTripsLoading ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>Loading…</Text>
          ) : !hasAnyTrips ? (
            <EmptyState title="No trips yet" subtitle="Create a trip to plan which shows you want to see and track shows closing around your travel dates." actionLabel="Create a Trip" onAction={() => setShowCreateTrip(true)} />
          ) : (
            <>
              {/* Main trip list (active → recently ended → upcoming) */}
              {visibleMain.map((trip) => (
                <TripCard
                  key={String(trip._id)}
                  name={trip.name}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                  showCount={trip.showCount}
                  isOwner={trip.isOwner}
                  memberCount={trip.memberCount}
                  memberAvatars={trip.memberAvatars}
                  onPress={() => openTrip(String(trip._id))}
                />
              ))}

              {/* Show More */}
              {hasMore ? (
                <Pressable
                  style={styles.showMoreBtn}
                  onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  <Text style={[styles.showMoreText, { color: accentColor }]}>
                    Show {Math.min(remaining, PAGE_SIZE)} more
                  </Text>
                </Pressable>
              ) : null}

              {/* View Past Trips */}
              {olderPast.length > 0 ? (
                <>
                  <Pressable
                    style={[styles.pastToggle, { borderTopColor: borderColor }]}
                    onPress={() => setShowPastTrips((v) => !v)}
                  >
                    <Text style={[styles.pastToggleText, { color: mutedTextColor }]}>
                      {showPastTrips ? "Hide past trips" : `View past trips (${olderPast.length})`}
                    </Text>
                    <Text style={[styles.pastChevron, { color: mutedTextColor }]}>
                      {showPastTrips ? "▲" : "▼"}
                    </Text>
                  </Pressable>
                  {showPastTrips ? olderPast.map((trip) => (
                    <TripCard
                      key={String(trip._id)}
                      name={trip.name}
                      startDate={trip.startDate}
                      endDate={trip.endDate}
                      showCount={trip.showCount}
                      isOwner={trip.isOwner}
                      memberCount={trip.memberCount}
                      memberAvatars={trip.memberAvatars}
                      onPress={() => openTrip(String(trip._id))}
                    />
                  )) : null}
                </>
              ) : null}
            </>
          )}
        </View>

        {/* Lists section */}
        <ListsSection
          onOpenCreateList={() => setShowCreateList(true)}
          profileListsLoading={profileLists === undefined}
          visibleLists={visibleLists}
          pendingVisibilityIds={pendingVisibilityIds}
          onToggleVisibility={handleToggleVisibility}
          openList={openList}
        />
      </ScrollView>

      <CreateTripSheet
        visible={showCreateTrip}
        onClose={() => setShowCreateTrip(false)}
        onCreate={handleCreateTrip}
      />

      <CreateListSheet
        visible={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreate={handleCreateCustomList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 20 },
  pageHeader: { marginBottom: 4 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  emptyText: { fontSize: 14, paddingVertical: 8 },
  showMoreBtn: { alignItems: "center", paddingVertical: 6 },
  showMoreText: { fontSize: 13, fontWeight: "600" },
  pastToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  pastToggleText: { fontSize: 13, fontWeight: "600" },
  pastChevron: { fontSize: 10 },
  inviteCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  inviteCardHeader: { gap: 3 },
  inviteBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 2 },
  inviteBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  inviteCardName: { fontSize: 16, fontWeight: "700" },
  inviteCardSub: { fontSize: 12 },
  inviteActions: { flexDirection: "row", gap: 8 },
  inviteBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  inviteBtnOutline: { borderWidth: StyleSheet.hairlineWidth },
  inviteBtnText: { fontSize: 14, fontWeight: "700" },
});
