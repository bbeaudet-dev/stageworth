import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import type { Id } from "@/convex/_generated/dataModel";
import { TripChatTab } from "@/features/plan/components/TripChatTab";
import { TripShowsTab } from "@/features/plan/components/TripShowsTab";
import { CreateTripSheet } from "@/features/plan/components/CreateTripSheet";
import { useClosingSoonForTrip, useTripById, useTripData } from "@/features/plan/hooks/useTripData";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(startDate: string, endDate: string): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const s = new Date(startDate + "T00:00:00Z");
  const e = new Date(endDate + "T00:00:00Z");
  const sm = months[s.getUTCMonth()], em = months[e.getUTCMonth()];
  const sd = s.getUTCDate(), ed = e.getUTCDate();
  const sy = s.getUTCFullYear(), ey = e.getUTCFullYear();
  if (sy === ey && sm === em) return `${sm} ${sd}–${ed}, ${sy}`;
  if (sy === ey) return `${sm} ${sd} – ${em} ${ed}, ${sy}`;
  return `${sm} ${sd}, ${sy} – ${em} ${ed}, ${ey}`;
}

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "shows" | "chat";

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

  const typedTripId = tripId as Id<"trips">;
  const trip = useTripById(typedTripId);
  const closingSoon = useClosingSoonForTrip(typedTripId);
  const { updateTrip, deleteTrip } = useTripData();

  const handleDeleteTrip = () => {
    Alert.alert("Delete Trip", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteTrip({ tripId: typedTripId }); router.back(); } },
    ]);
  };

  const handleThreeDot = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Edit Trip", "Delete Trip"], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (idx) => {
          if (idx === 1) setShowEditTrip(true);
          if (idx === 2) handleDeleteTrip();
        }
      );
    } else {
      Alert.alert("Trip Options", "", [
        { text: "Edit Trip", onPress: () => setShowEditTrip(true) },
        { text: "Delete Trip", style: "destructive", onPress: handleDeleteTrip },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  if (trip === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
        <View style={styles.centered}><ActivityIndicator color={accentColor} /></View>
      </SafeAreaView>
    );
  }

  if (trip === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
        <Text style={[styles.errorText, { color: mutedTextColor }]}>Trip not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.headerSide} hitSlop={12}>
          <IconSymbol size={20} name="chevron.left" color={accentColor} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.tripName, { color: primaryTextColor }]} numberOfLines={1}>{trip.name}</Text>
          <Text style={[styles.tripDates, { color: mutedTextColor }]}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
        </View>
        <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
          {trip.isOwner ? (
            <Pressable onPress={handleThreeDot} hitSlop={12}>
              <Text style={[styles.threeDot, { color: primaryTextColor }]}>···</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor, backgroundColor }]}>
        {(["shows", "chat"] as Tab[]).map((t) => {
          const label = t === "shows" ? "Shows" : "Chat";
          return (
            <Pressable key={t} style={styles.tabItem} onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabLabel, { color: activeTab === t ? accentColor : mutedTextColor }]}>{label}</Text>
              {activeTab === t ? <View style={[styles.tabIndicator, { backgroundColor: accentColor }]} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === "shows" ? (
          <TripShowsTab trip={trip} tripId={typedTripId} closingSoon={closingSoon} />
        ) : (
          <TripChatTab />
        )}
      </View>

      <CreateTripSheet
        visible={showEditTrip}
        onClose={() => setShowEditTrip(false)}
        onCreate={async (args) => { await updateTrip({ tripId: typedTripId, ...args }); }}
        initialValues={{ name: trip.name, startDate: trip.startDate, endDate: trip.endDate, description: trip.description }}
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
  threeDot: { fontSize: 22, fontWeight: "600", letterSpacing: 2, lineHeight: 22 },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 10, position: "relative" },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  tabIndicator: { position: "absolute", bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1 },
});
