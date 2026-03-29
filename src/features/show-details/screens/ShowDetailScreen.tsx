import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getProductionStatus } from "@/utils/productions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  musical: { bg: "#FFF3E0", text: "#E65100" },
  play:    { bg: "#E8F5E9", text: "#1B5E20" },
  opera:   { bg: "#EDE7F6", text: "#4A148C" },
  dance:   { bg: "#FCE4EC", text: "#880E4F" },
  other:   { bg: "#ECEFF1", text: "#37474F" },
};

const TYPE_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  musical: { bg: "rgba(230,81,0,0.18)",  text: "#FFB74D" },
  play:    { bg: "rgba(27,94,32,0.2)",   text: "#81C784" },
  opera:   { bg: "rgba(74,20,140,0.2)",  text: "#CE93D8" },
  dance:   { bg: "rgba(136,14,79,0.2)",  text: "#F48FB1" },
  other:   { bg: "rgba(55,71,79,0.2)",   text: "#B0BEC5" },
};

function districtLabel(d: string): string {
  const map: Record<string, string> = {
    broadway: "Broadway",
    off_broadway: "Off-Broadway",
    off_off_broadway: "Off-Off-Broadway",
    west_end: "West End",
    touring: "Touring",
    regional: "Regional",
    other: "Other",
  };
  return map[d] ?? d;
}

function prodTypeLabel(t: string): string {
  const map: Record<string, string> = {
    original: "Original",
    revival: "Revival",
    transfer: "Transfer",
    touring: "Touring",
    concert: "Concert",
    workshop: "Workshop",
    other: "Other",
  };
  return map[t] ?? t;
}

const today = () => new Date().toISOString().split("T")[0];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showId?: string; name?: string }>();
  const showId = (params.showId ?? "") as Id<"shows">;

  const show = useQuery(api.shows.getById, showId ? { id: showId } : "skip");
  const visits = useQuery(api.visits.listByShow, showId ? { showId } : "skip");
  const productions = useQuery(api.productions.listByShowWithImages, showId ? { showId } : "skip");

  const myLists = useQuery(api.lists.getProfileLists);
  const myTrips = useQuery(api.trips.getMyTrips);
  const addShowToList = useMutation(api.lists.addShowToList);
  const addShowToTrip = useMutation(api.trips.addShowToTrip);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // "Add to List" sheet state
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [addingToList, setAddingToList] = useState<Id<"userLists"> | null>(null);

  // "Add to Trip" sheet state
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState<Id<"trips"> | null>(null);

  const playbillSize = Math.floor((screenWidth - 32 - 12) / 3);

  const posterUrl = show?.images?.[0] ?? null;

  const showType = show?.type ?? "other";
  const typeColors = isDark ? TYPE_COLORS_DARK[showType] ?? TYPE_COLORS_DARK.other : TYPE_COLORS[showType] ?? TYPE_COLORS.other;

  const todayStr = today();
  const activeProductions = useMemo(
    () => productions?.filter((p) => {
      const s = getProductionStatus(p, todayStr);
      return s !== "closed";
    }) ?? [],
    [productions, todayStr]
  );

  const hasVisits = (visits?.length ?? 0) > 0;

  async function handleAddToList(listId: Id<"userLists">) {
    if (!showId || addingToList) return;
    setAddingToList(listId);
    try {
      await addShowToList({ listId, showId });
    } finally {
      setAddingToList(null);
      setListSheetOpen(false);
    }
  }

  async function handleAddToTrip(tripId: Id<"trips">) {
    if (!showId || addingToTrip) return;
    setAddingToTrip(tripId);
    try {
      await addShowToTrip({ tripId, showId });
    } finally {
      setAddingToTrip(null);
      setTripSheetOpen(false);
    }
  }

  const allLists = useMemo(() => {
    if (!myLists) return [];
    return [...(myLists.systemLists ?? []), ...(myLists.customLists ?? [])];
  }, [myLists]);

  const activeTrips = useMemo(() => {
    if (!myTrips) return [];
    return myTrips.upcoming ?? [];
  }, [myTrips]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen options={{ title: show?.name ?? (params.name ?? "Show"), headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>

        {/* ── Hero row: playbill + name/type ─────────────────────────────── */}
        <View style={styles.heroRow}>
          <View style={[styles.playbillWrap, { width: playbillSize, height: playbillSize * 1.4 }]}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.playbillImg} contentFit="cover" />
            ) : (
              <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
                <Text
                  style={[styles.playbillFallbackText, { color: c.mutedText }]}
                  numberOfLines={5}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {show?.name ?? ""}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={[styles.showName, { color: c.text }]} numberOfLines={3}>
              {show?.name ?? (params.name ?? "Loading…")}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
                {TYPE_LABEL[showType] ?? "Other"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Visits ───────────────────────────────────────────────────────── */}
        {hasVisits ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Your Visits</Text>
            {visits!.map((visit) => (
              <Pressable
                key={visit._id}
                style={[styles.row, { borderTopColor: c.border }]}
                onPress={() => router.push({ pathname: "/visit/[visitId]", params: { visitId: String(visit._id) } })}
              >
                <Text style={[styles.rowText, { color: c.text }]}>{visit.date}</Text>
                <Text style={[styles.rowChevron, { color: c.mutedText }]}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Productions ──────────────────────────────────────────────────── */}
        {productions !== undefined && productions.length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Productions</Text>
            {productions.map((p, i) => {
              const status = getProductionStatus(p, todayStr);
              const isActive = status !== "closed";
              return (
                <View
                  key={p._id}
                  style={[
                    styles.productionRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}
                >
                  {p.posterUrl ? (
                    <Image source={{ uri: p.posterUrl }} style={styles.prodThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.prodThumbFallback, { backgroundColor: c.border }]} />
                  )}
                  <View style={styles.prodInfo}>
                    <Text style={[styles.prodVenue, { color: c.text }]} numberOfLines={1}>
                      {p.theatre}{p.city ? ` · ${p.city}` : ""}
                    </Text>
                    <Text style={[styles.prodMeta, { color: c.mutedText }]} numberOfLines={1}>
                      {districtLabel(p.district)} · {prodTypeLabel(p.productionType)}
                    </Text>
                    {p.closingDate ? (
                      <Text style={[styles.prodMeta, { color: isActive ? "#E65100" : c.mutedText }]}>
                        {isActive ? `Closes ${p.closingDate}` : `Closed ${p.closingDate}`}
                      </Text>
                    ) : (
                      <Text style={[styles.prodMeta, { color: c.mutedText }]}>
                        {isActive ? "Running" : "Closed"}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: Colors.light.accent }]}
          onPress={() => router.push("/add-visit")}
        >
          <Text style={styles.primaryBtnText}>Add a Visit</Text>
        </Pressable>

        <View style={styles.secondaryBtnRow}>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: Colors.light.accent + "18", borderColor: Colors.light.accent + "40" }]}
            onPress={() => setListSheetOpen(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: Colors.light.accent }]}>+ Add to List</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: Colors.light.accent + "18", borderColor: Colors.light.accent + "40" }]}
            onPress={() => setTripSheetOpen(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: Colors.light.accent }]}>+ Add to Trip</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Add to List Sheet ─────────────────────────────────────────────── */}
      <Modal visible={listSheetOpen} transparent animationType="slide" onRequestClose={() => setListSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setListSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to List</Text>
          <ScrollView>
            {allLists.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No lists found.</Text>
            ) : allLists.map((list) => (
              <Pressable
                key={list._id}
                style={[styles.sheetRow, { borderBottomColor: c.border }]}
                onPress={() => handleAddToList(list._id as Id<"userLists">)}
              >
                <Text style={[styles.sheetRowText, { color: c.text }]}>{list.name}</Text>
                {addingToList === list._id ? (
                  <ActivityIndicator size="small" color={c.mutedText} />
                ) : (
                  <Text style={[styles.sheetRowCount, { color: c.mutedText }]}>{list.showCount}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add to Trip Sheet ─────────────────────────────────────────────── */}
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
                  <Text style={[styles.sheetRowMeta, { color: c.mutedText }]}>{trip.startDate} – {trip.endDate}</Text>
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

  // Hero
  heroRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  playbillWrap: { borderRadius: 8, overflow: "hidden" },
  playbillImg: { width: "100%", height: "100%" },
  playbillFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 6 },
  playbillFallbackText: { fontSize: 11, textAlign: "center", fontWeight: "600" },
  heroInfo: { flex: 1, gap: 8, paddingTop: 4 },
  showName: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  typeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  // Sections
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11 },
  rowText: { fontSize: 14, fontWeight: "500" },
  rowChevron: { fontSize: 18, fontWeight: "300" },

  // Productions
  productionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  prodThumb: { width: 44, height: 62, borderRadius: 6 },
  prodThumbFallback: { width: 44, height: 62, borderRadius: 6 },
  prodInfo: { flex: 1, gap: 2 },
  prodVenue: { fontSize: 14, fontWeight: "600" },
  prodMeta: { fontSize: 12 },

  // Buttons
  primaryBtn: { borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  primaryBtnText: { fontWeight: "700", fontSize: 15, color: "#fff" },
  secondaryBtnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },

  // Sheet modal
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "65%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: "700", paddingHorizontal: 18, marginBottom: 8 },
  sheetEmpty: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetRowText: { fontSize: 15, fontWeight: "600" },
  sheetRowMeta: { fontSize: 12, marginTop: 2 },
  sheetRowCount: { fontSize: 13 },
  sheetRowChevron: { fontSize: 18, fontWeight: "300" },
});
