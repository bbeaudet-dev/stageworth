import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getProductionStatus } from "@/utils/productions";

function formatDistrict(district: string): string {
  const map: Record<string, string> = {
    broadway: "Broadway",
    off_broadway: "Off-Broadway",
    off_off_broadway: "Off-Off-Broadway",
    west_end: "West End",
    touring: "Touring",
    regional: "Regional",
    other: "Other",
  };
  return map[district] ?? district;
}

function statusLabel(status: ReturnType<typeof getProductionStatus>) {
  switch (status) {
    case "open":
      return "Now Playing";
    case "open_run":
      return "Open Run";
    case "in_previews":
      return "In Previews";
    case "announced":
      return "Upcoming";
    case "closed":
      return "Closed";
  }
}

export default function VenueDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ venueId?: string }>();
  const venueId = params.venueId ?? "";
  const venue = useQuery(
    api.venues.getById,
    venueId ? { venueId: venueId as Id<"venues"> } : "skip",
  );
  const venueProductions = useQuery(
    api.productions.listByVenue,
    venueId ? { venueId: venueId as Id<"venues"> } : "skip",
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const [NativeMapView, setNativeMapView] = useState<any>(null);
  const [NativeMarker, setNativeMarker] = useState<any>(null);
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mapsModule = require("react-native-maps");
      setNativeMapView(() => mapsModule.default);
      setNativeMarker(() => mapsModule.Marker);
    } catch {
      setNativeMapView(null);
      setNativeMarker(null);
    }
  }, []);

  const openInMaps = () => {
    if (!venue) return;
    const label = encodeURIComponent(venue.name);
    const query = venue.latitude != null && venue.longitude != null
      ? `${venue.latitude},${venue.longitude}`
      : encodeURIComponent([venue.name, venue.addressLine1, venue.city, venue.state, venue.country].filter(Boolean).join(", "));
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${label}&ll=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Venue",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {venue === undefined ? null : venue === null ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: c.mutedText }]}>Venue not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={[styles.name, { color: c.text }]}>{venue.name}</Text>
            <Text style={[styles.subtitle, { color: c.mutedText }]}>
              {[venue.city, venue.state].filter(Boolean).join(", ")}
              {venue.district ? ` · ${formatDistrict(venue.district)}` : ""}
            </Text>
            {venue.addressLine1 && (
              <Text style={[styles.address, { color: c.mutedText }]}>{venue.addressLine1}</Text>
            )}

            <View style={[styles.mapCard, { borderColor: c.border, backgroundColor: c.surface }]}>
              {venue.latitude != null && venue.longitude != null && NativeMapView && NativeMarker ? (
                <NativeMapView
                  style={styles.map}
                  initialRegion={{
                    latitude: venue.latitude,
                    longitude: venue.longitude,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                  pointerEvents="none"
                >
                  <NativeMarker
                    coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                    title={venue.name}
                  />
                </NativeMapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={[styles.mapPlaceholderText, { color: c.mutedText }]}>
                    {venue.latitude == null || venue.longitude == null
                      ? "No map coordinates yet."
                      : "Map preview unavailable."}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={openInMaps}
              style={({ pressed }) => [
                styles.openMapsBtn,
                { borderColor: c.accent, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.openMapsText, { color: c.accent }]}>Open in Maps</Text>
            </Pressable>
          </View>

          <View style={styles.showsSection}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Shows at this venue</Text>
            {venueProductions === undefined ? (
              <Text style={[styles.emptyText, { color: c.mutedText }]}>Loading…</Text>
            ) : venueProductions.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.mutedText }]}>
                No shows have been associated with this venue yet.
              </Text>
            ) : (
              venueProductions.map((production) => {
                const status = getProductionStatus(production);
                const poster = production.posterUrl ?? production.showImages[0] ?? null;
                return (
                  <Pressable
                    key={production._id}
                    onPress={() =>
                      router.push({
                        pathname: "/show/[showId]",
                        params: { showId: String(production.showId) },
                      })
                    }
                    style={({ pressed }) => [
                      styles.showRow,
                      {
                        backgroundColor: c.surfaceElevated,
                        borderColor: c.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.posterWrap, { backgroundColor: c.surface }]}>
                      {poster ? (
                        <Image
                          source={{ uri: poster }}
                          style={styles.poster}
                          contentFit="contain"
                        />
                      ) : (
                        <ShowPlaceholder
                          name={production.showName}
                          style={{ width: "100%", height: "100%", aspectRatio: undefined }}
                        />
                      )}
                    </View>
                    <View style={styles.showText}>
                      <Text style={[styles.showName, { color: c.text }]} numberOfLines={2}>
                        {production.showName}
                      </Text>
                      <Text style={[styles.showMeta, { color: c.mutedText }]}>
                        {statusLabel(status)}
                        {production.openingDate
                          ? ` · ${production.openingDate.slice(0, 4)}`
                          : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { padding: 16, gap: 8 },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 15 },
  name: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  address: { fontSize: 13 },
  mapCard: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    height: 240,
  },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  mapPlaceholderText: { fontSize: 13, textAlign: "center" },
  openMapsBtn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  openMapsText: { fontSize: 15, fontWeight: "600" },
  showsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  showRow: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  posterWrap: {
    width: 52,
    height: 78,
    borderRadius: 6,
    overflow: "hidden",
  },
  poster: { width: "100%", height: "100%" },
  showText: { flex: 1, gap: 4 },
  showName: { fontSize: 15, fontWeight: "600" },
  showMeta: { fontSize: 12 },
});
