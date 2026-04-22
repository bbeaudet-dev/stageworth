import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useToast } from "@/components/Toast";
import { BroadwayShowtimesGrid } from "@/components/BroadwayShowtimesGrid";
import { CatalogFeedbackLink } from "@/components/CatalogFeedbackLink";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate } from "@/features/browse/logic/date";
import { useShowDetail } from "@/features/show-details/hooks/useShowDetail";
import { ShowHeroSection } from "@/features/show-details/components/ShowHeroSection";
import { ProductionsRail } from "@/features/show-details/components/ProductionsRail";
import { ShowVisitsList } from "@/features/show-details/components/ShowVisitsList";
import { FriendsRankingsSection } from "@/features/show-details/components/FriendsRankingsSection";
import { ShowRecommendationBlock } from "@/features/show-details/components/ShowRecommendationBlock";
import { ShowScoreBadgeRow } from "@/features/show-details/components/ShowScoreBadge";

const today = () => new Date().toISOString().split("T")[0];

export default function ShowDetailScreen() {
  const params = useLocalSearchParams<{ showId?: string; name?: string }>();
  const showId = (params.showId ?? "") as Id<"shows">;

  const {
    session,
    show,
    visits,
    productions,
    allLists,
    activeTrips,
    broadwayShowtimes,
    personalRank,
    addShowToList,
    addShowToTrip,
    removeShowFromTrip,
  } = useShowDetail(showId);
  const removeShowFromList = useMutation(api.lists.removeShowFromList);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [busyListId, setBusyListId] = useState<Id<"userLists"> | null>(null);
  const [optimisticallyInLists, setOptimisticallyInLists] = useState<Set<string>>(new Set());
  const [optimisticallyOutOfLists, setOptimisticallyOutOfLists] = useState<Set<string>>(new Set());

  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [busyTripId, setBusyTripId] = useState<Id<"trips"> | null>(null);
  const [optimisticallyInTrips, setOptimisticallyInTrips] = useState<Set<string>>(new Set());
  const [optimisticallyOutOfTrips, setOptimisticallyOutOfTrips] = useState<Set<string>>(new Set());

  const todayStr = today();

  async function handleToggleList(listId: Id<"userLists">, listName: string, alreadyIn: boolean) {
    if (!showId || busyListId) return;
    setBusyListId(listId);
    if (alreadyIn) {
      setOptimisticallyInLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
      setOptimisticallyOutOfLists((prev) => new Set([...prev, listId]));
      try {
        await removeShowFromList({ listId, showId });
        showToast({ message: `Removed from ${listName}` });
      } catch {
        setOptimisticallyOutOfLists((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      } finally {
        setBusyListId(null);
      }
    } else {
      setOptimisticallyOutOfLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
      setOptimisticallyInLists((prev) => new Set([...prev, listId]));
      try {
        await addShowToList({ listId, showId });
        showToast({ message: `Added to ${listName}` });
      } catch {
        setOptimisticallyInLists((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      } finally {
        setBusyListId(null);
      }
    }
  }

  async function handleToggleTrip(tripId: Id<"trips">, tripName: string, alreadyIn: boolean) {
    if (!showId || busyTripId) return;
    setBusyTripId(tripId);
    if (alreadyIn) {
      setOptimisticallyInTrips((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
      setOptimisticallyOutOfTrips((prev) => new Set([...prev, tripId]));
      try {
        await removeShowFromTrip({ tripId, showId });
        showToast({ message: `Removed from ${tripName}` });
      } catch {
        setOptimisticallyOutOfTrips((prev) => {
          const next = new Set(prev);
          next.delete(tripId);
          return next;
        });
      } finally {
        setBusyTripId(null);
      }
    } else {
      setOptimisticallyOutOfTrips((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
      setOptimisticallyInTrips((prev) => new Set([...prev, tripId]));
      try {
        await addShowToTrip({ tripId, showId });
        showToast({ message: `Added to ${tripName}` });
      } catch {
        setOptimisticallyInTrips((prev) => {
          const next = new Set(prev);
          next.delete(tripId);
          return next;
        });
      } finally {
        setBusyTripId(null);
      }
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen options={{ title: show?.name ?? (params.name ?? "Show"), headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <ShowHeroSection
          show={show}
          placeholderName={params.name}
          showId={showId}
          screenWidth={screenWidth}
          onOpenListSheet={() => setListSheetOpen(true)}
          onOpenTripSheet={() => setTripSheetOpen(true)}
          visitCount={visits?.length ?? 0}
          listMemberships={allLists}
          tripsContainingShowCount={
            activeTrips.filter((t) => t.containsShow).length
          }
        />

        <ProductionsRail productions={productions} todayStr={todayStr} />

        {broadwayShowtimes ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <BroadwayShowtimesGrid
                data={broadwayShowtimes}
                borderColor={c.border}
                surfaceColor={c.surface}
                primaryTextColor={c.text}
                mutedTextColor={c.mutedText}
              />
            </View>
          </View>
        ) : null}

        <ShowVisitsList visits={visits} personalRank={personalRank} />

        <FriendsRankingsSection showId={showId} isSignedIn={!!session} />

        <View style={styles.recSection}>
          {show?.showScoreRating != null && (show?.name ?? params.name) ? (
            <ShowScoreBadgeRow
              showName={show.name ?? params.name ?? ""}
              rating={show.showScoreRating}
              reviewCount={show.showScoreCount}
              slug={show.showScoreSlug}
            />
          ) : null}
          <ShowRecommendationBlock showId={showId} showName={show?.name} isSignedIn={!!session} />
        </View>

        <CatalogFeedbackLink
          source="show_detail"
          showId={showId || undefined}
          disabled={!show}
          linkText="Something wrong? Suggest a correction"
          title="Suggest a correction"
          hint="Tell us what is wrong with this listing. A moderator will review it."
          placeholder="What should we fix?"
        />
      </ScrollView>

      <Modal visible={listSheetOpen} transparent animationType="slide" onRequestClose={() => setListSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setListSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to List</Text>
          <ScrollView>
            {allLists.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No lists found.</Text>
            ) : allLists.map((list) => {
              const baseIn = list.containsShow ?? false;
              const alreadyIn =
                (baseIn && !optimisticallyOutOfLists.has(list._id)) ||
                optimisticallyInLists.has(list._id);
              const isBusy = busyListId === list._id;
              return (
                <Pressable
                  key={list._id}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleToggleList(list._id as Id<"userLists">, list.name, alreadyIn)}
                  disabled={isBusy}
                >
                  <Text style={[styles.sheetRowText, { color: alreadyIn ? c.mutedText : c.text }]}>{list.name}</Text>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={c.mutedText} />
                  ) : alreadyIn ? (
                    <Text style={[styles.sheetRowCheck, { color: c.accent }]}>✓</Text>
                  ) : (
                    <Text style={[styles.sheetRowCount, { color: c.mutedText }]}>{list.showCount}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={tripSheetOpen} transparent animationType="slide" onRequestClose={() => setTripSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setTripSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to Trip</Text>
          <ScrollView>
            {activeTrips.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No upcoming trips.</Text>
            ) : activeTrips.map((trip) => {
              const baseIn = trip.containsShow ?? false;
              const alreadyIn =
                (baseIn && !optimisticallyOutOfTrips.has(trip._id)) ||
                optimisticallyInTrips.has(trip._id);
              const isBusy = busyTripId === trip._id;
              return (
                <Pressable
                  key={trip._id}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => handleToggleTrip(trip._id as Id<"trips">, trip.name, alreadyIn)}
                  disabled={isBusy}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetRowText, { color: alreadyIn ? c.mutedText : c.text }]}>{trip.name}</Text>
                    <Text style={[styles.sheetRowMeta, { color: c.mutedText }]}>
                      {formatDate(trip.startDate) ?? trip.startDate} – {formatDate(trip.endDate) ?? trip.endDate}
                    </Text>
                  </View>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={c.mutedText} />
                  ) : alreadyIn ? (
                    <Text style={[styles.sheetRowCheck, { color: c.accent }]}>✓</Text>
                  ) : (
                    <Text style={[styles.sheetRowChevron, { color: c.mutedText }]}>+</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  recSection: { gap: 10 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "65%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: "700", paddingHorizontal: 18, marginBottom: 8 },
  sheetEmpty: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetRowText: { fontSize: 16, fontWeight: "600" },
  sheetRowMeta: { fontSize: 12, marginTop: 2 },
  sheetRowCount: { fontSize: 14, fontWeight: "500" },
  sheetRowCheck: { fontSize: 19, fontWeight: "700" },
  sheetRowChevron: { fontSize: 18, fontWeight: "300" },
});
