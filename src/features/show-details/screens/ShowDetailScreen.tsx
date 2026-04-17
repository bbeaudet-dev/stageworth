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
import { ShowRecommendationBlock } from "@/features/show-details/components/ShowRecommendationBlock";

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
    addShowToList,
    addShowToTrip,
  } = useShowDetail(showId);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Add to List sheet state
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [optimisticallyInLists, setOptimisticallyInLists] = useState<Set<string>>(new Set());

  // Add to Trip sheet state
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState<Id<"trips"> | null>(null);

  const todayStr = today();

  async function handleAddToList(listId: Id<"userLists">, listName: string) {
    if (!showId || addingToList) return;
    setOptimisticallyInLists((prev) => new Set([...prev, listId]));
    setListSheetOpen(false);
    showToast({ message: `Added "${show?.name ?? "show"}" to ${listName}` });
    setAddingToList(true);
    try {
      await addShowToList({ listId, showId });
    } catch {
      setOptimisticallyInLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    } finally {
      setAddingToList(false);
    }
  }

  async function handleAddToTrip(tripId: Id<"trips">) {
    if (!showId || addingToTrip) return;
    const trip = activeTrips.find((t) => t._id === tripId);
    setAddingToTrip(tripId);
    try {
      await addShowToTrip({ tripId, showId });
      setTripSheetOpen(false);
      showToast({ message: `Added "${show?.name ?? "show"}" to ${trip?.name ?? "trip"}` });
    } catch {
      setTripSheetOpen(false);
    } finally {
      setAddingToTrip(null);
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

        <ShowVisitsList visits={visits} />

        <ShowRecommendationBlock showId={showId} showName={show?.name} isSignedIn={!!session} />

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

      {/* ── Add to List Sheet ──────────────────────────────────────────────── */}
      <Modal visible={listSheetOpen} transparent animationType="slide" onRequestClose={() => setListSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setListSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to List</Text>
          <ScrollView>
            {allLists.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No lists found.</Text>
            ) : allLists.map((list) => {
              const alreadyIn = (list.containsShow ?? false) || optimisticallyInLists.has(list._id);
              return (
                <Pressable
                  key={list._id}
                  style={({ pressed }) => [styles.sheetRow, { borderBottomColor: c.border, opacity: pressed && !alreadyIn ? 0.7 : 1 }]}
                  onPress={() => !alreadyIn && handleAddToList(list._id as Id<"userLists">, list.name)}
                  disabled={addingToList}
                >
                  <Text style={[styles.sheetRowText, { color: alreadyIn ? c.mutedText : c.text }]}>{list.name}</Text>
                  {alreadyIn ? (
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

      {/* ── Add to Trip Sheet ──────────────────────────────────────────────── */}
      <Modal visible={tripSheetOpen} transparent animationType="slide" onRequestClose={() => setTripSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setTripSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to Trip</Text>
          <ScrollView>
            {activeTrips.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No upcoming trips.</Text>
            ) : activeTrips.map((trip) => (
              <Pressable
                key={trip._id}
                style={[styles.sheetRow, { borderBottomColor: c.border }]}
                onPress={() => handleAddToTrip(trip._id as Id<"trips">)}
              >
                <View>
                  <Text style={[styles.sheetRowText, { color: c.text }]}>{trip.name}</Text>
                  <Text style={[styles.sheetRowMeta, { color: c.mutedText }]}>
                    {formatDate(trip.startDate) ?? trip.startDate} – {formatDate(trip.endDate) ?? trip.endDate}
                  </Text>
                </View>
                {addingToTrip === trip._id ? (
                  <ActivityIndicator size="small" color={c.mutedText} />
                ) : (
                  <Text style={[styles.sheetRowChevron, { color: c.mutedText }]}>›</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
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
