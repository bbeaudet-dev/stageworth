import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

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

export default function VenueDetailScreen() {
  const params = useLocalSearchParams<{ venueId?: string }>();
  const venueId = params.venueId ?? "";
  const venue = useQuery(
    api.venues.getById,
    venueId ? { venueId: venueId as Id<"venues"> } : "skip",
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  // Lazy-load react-native-maps the same way MyShowsMapView does so web/dev
  // without native modules keeps working.
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
});
