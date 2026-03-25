import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { MapScope } from "@/features/my-shows/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const HAS_NATIVE_MAP =
  Platform.OS !== "web" && Boolean(UIManager.getViewManagerConfig?.("AIRMap"));
const CLUSTER_THRESHOLD_FACTOR = 0.08;
const CLUSTER_MIN_DEGREES = 0.00012;
const NYC_REGION = {
  latitude: 40.758,
  longitude: -73.9855,
  latitudeDelta: 0.24,
  longitudeDelta: 0.24,
};

type MapPinRow = {
  mapKey: string;
  theatre: string;
  city?: string;
  visitCount: number;
  uniqueUserCount: number;
  latitude?: number;
  longitude?: number;
};

type MarkerPoint = {
  mapKey: string;
  theatre: string;
  city?: string;
  visitCount: number;
  uniqueUserCount: number;
  latitude: number;
  longitude: number;
};
type MarkerCluster = {
  key: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  theatreCount: number;
  theatres: string[];
  city?: string;
};
type MapCoverageStats = {
  totalVisits: number;
  visitsWithValidLocation: number;
  visitsMissingLocation: number;
  uniqueShowsMissingLocation: number;
};

const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();

async function geocodeVenue(address: string) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const payload = (await response.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
    };

    const location = payload.results?.[0]?.geometry?.location;
    const coords =
      payload.status === "OK" && location?.lat !== undefined && location?.lng !== undefined
        ? { latitude: location.lat, longitude: location.lng }
        : null;
    geocodeCache.set(address, coords);
    return coords;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

export function MyShowsMapView({
  tabBarHeight,
  mapScope,
  onChangeMapScope,
}: {
  tabBarHeight: number;
  mapScope: MapScope;
  onChangeMapScope: (scope: MapScope) => void;
}) {
  const mapPins = useQuery(api.visits.listMapPins, { scope: mapScope }) as MapPinRow[] | undefined;
  const coverageStats = useQuery(api.visits.getMapCoverageStats, {
    scope: mapScope,
  }) as MapCoverageStats | undefined;
  const [markers, setMarkers] = useState<MarkerPoint[]>([]);
  const [resolving, setResolving] = useState(false);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [hasResolutionError, setHasResolutionError] = useState(false);
  const [nativeMapView, setNativeMapView] = useState<any>(null);
  const [nativeMarker, setNativeMarker] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState(NYC_REGION);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const textColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const borderColor = Colors[theme].border;
  const chipColor = Colors[theme].surface;
  const activeChipColor = Colors[theme].surfaceElevated;
  const overlayBg = theme === "dark" ? "rgba(20,20,24,0.92)" : "rgba(255,255,255,0.94)";
  const overlayText = theme === "dark" ? "#F3F4F6" : "#1F2937";

  const entries = mapPins ?? [];

  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      const mapsModule = require("react-native-maps");
      setNativeMapView(() => mapsModule.default);
      setNativeMarker(() => mapsModule.Marker);
    } catch {
      setNativeMapView(null);
      setNativeMarker(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!GOOGLE_MAPS_API_KEY || !mapPins) {
        setMarkers([]);
        setHasResolutionError(false);
        return;
      }
      setResolving(true);
      const resolved: MarkerPoint[] = [];
      for (const row of mapPins) {
        if (row.latitude !== undefined && row.longitude !== undefined) {
          resolved.push({
            ...row,
            latitude: row.latitude,
            longitude: row.longitude,
          });
          continue;
        }
        const address = [row.theatre, row.city].filter(Boolean).join(", ");
        const coords = await geocodeVenue(address);
        if (!coords || cancelled) continue;
        resolved.push({
          ...row,
          ...coords,
        });
      }
      if (!cancelled) {
        setMarkers(resolved);
        setHasResolutionError(mapPins.length > 0 && resolved.length === 0);
        setResolving(false);
      }
    };
    run().catch(() => {
      if (!cancelled) setResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mapPins]);

  const initialRegion = useMemo(() => {
    if (markers.length === 0) return mapRegion;
    const latitudes = markers.map((m: MarkerPoint) => m.latitude);
    const longitudes = markers.map((m: MarkerPoint) => m.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.6),
    };
  }, [mapRegion, markers]);

  const clusteredMarkers = useMemo(() => {
    if (markers.length === 0) return [] as MarkerCluster[];
    const thresholdLat = Math.max(
      mapRegion.latitudeDelta * CLUSTER_THRESHOLD_FACTOR,
      CLUSTER_MIN_DEGREES
    );
    const thresholdLng = Math.max(
      mapRegion.longitudeDelta * CLUSTER_THRESHOLD_FACTOR,
      CLUSTER_MIN_DEGREES
    );

    const clusters: Array<{
      latitude: number;
      longitude: number;
      visitCount: number;
      theatres: string[];
      city?: string;
      count: number;
    }> = [];

    for (const marker of markers) {
      const existing = clusters.find(
        (cluster) =>
          Math.abs(cluster.latitude - marker.latitude) <= thresholdLat &&
          Math.abs(cluster.longitude - marker.longitude) <= thresholdLng
      );

      if (!existing) {
        clusters.push({
          latitude: marker.latitude,
          longitude: marker.longitude,
          visitCount: marker.visitCount,
          theatres: [marker.theatre],
          city: marker.city,
          count: 1,
        });
        continue;
      }

      const nextCount = existing.count + 1;
      existing.latitude = (existing.latitude * existing.count + marker.latitude) / nextCount;
      existing.longitude = (existing.longitude * existing.count + marker.longitude) / nextCount;
      existing.visitCount += marker.visitCount;
      existing.theatres.push(marker.theatre);
      existing.count = nextCount;
    }

    return clusters.map((cluster, index) => ({
      key: `${Math.round(cluster.latitude * 10000)}:${Math.round(cluster.longitude * 10000)}:${index}`,
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      visitCount: cluster.visitCount,
      theatreCount: cluster.count,
      theatres: cluster.theatres,
      city: cluster.city,
    }));
  }, [mapRegion.latitudeDelta, mapRegion.longitudeDelta, markers]);

  const scopeOptions: { value: MapScope; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "mine", label: "Me", icon: "person" },
    { value: "following", label: "Friends", icon: "people" },
    { value: "all", label: "All", icon: "globe-outline" },
  ];
  const selectedScope =
    scopeOptions.find((option) => option.value === mapScope) ?? scopeOptions[0];
  const NativeMapViewComponent = nativeMapView;
  const NativeMarkerComponent = nativeMarker;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {!HAS_NATIVE_MAP || !NativeMapViewComponent || !NativeMarkerComponent ? (
        <View style={styles.centered}>
          <Text style={[styles.messageTitle, { color: textColor }]}>Map native module missing</Text>
          <Text style={[styles.messageBody, { color: mutedTextColor }]}>
            Install a fresh dev build after adding maps (`bun run ios` or `bun run android`).
          </Text>
        </View>
      ) : !GOOGLE_MAPS_API_KEY ? (
        <View style={styles.centered}>
          <Text style={[styles.messageTitle, { color: textColor }]}>Map setup needed</Text>
          <Text style={[styles.messageBody, { color: mutedTextColor }]}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to render theatre pins.
          </Text>
        </View>
      ) : (
        <View style={styles.mapStage}>
          <View style={styles.mapWrap}>
            <NativeMapViewComponent
              style={styles.map}
              initialRegion={initialRegion}
              onRegionChangeComplete={setMapRegion}
            >
              {clusteredMarkers.map((marker) =>
                marker.theatreCount > 1 ? (
                  <NativeMarkerComponent
                    key={marker.key}
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    title={`${marker.theatreCount} theatres`}
                    description={`${marker.theatres.slice(0, 4).join(", ")}${marker.theatreCount > 4 ? "..." : ""}`}
                    tracksViewChanges={false}
                  >
                    <View style={styles.clusterBubble}>
                      <Text style={styles.clusterBubbleText}>{marker.theatreCount}</Text>
                    </View>
                  </NativeMarkerComponent>
                ) : (
                  <NativeMarkerComponent
                    key={marker.key}
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    title={marker.theatres[0]}
                    description={
                      marker.city
                        ? `${marker.city} - ${marker.visitCount} visits`
                        : `${marker.visitCount} visits`
                    }
                  />
                )
              )}
            </NativeMapViewComponent>
          </View>
          <View pointerEvents="box-none" style={styles.overlayLayer}>
            {resolving ? (
              <View style={[styles.resolvingBadge, { backgroundColor: overlayBg, borderColor }]}>
                <Text style={[styles.resolvingText, { color: overlayText }]}>Resolving theatres...</Text>
              </View>
            ) : null}
            {!resolving && entries.length === 0 ? (
              <View style={[styles.infoBadge, { backgroundColor: overlayBg, borderColor }]}>
                <Text style={[styles.infoText, { color: overlayText }]}>No theatres for this filter yet.</Text>
              </View>
            ) : null}
            {hasResolutionError ? (
              <View style={[styles.errorBadge, { backgroundColor: overlayBg, borderColor }]}>
                <Text style={[styles.errorText, { color: overlayText }]}>
                  Couldn&apos;t resolve locations. Check your geocoding key restrictions.
                </Text>
              </View>
            ) : null}
            {coverageStats ? (
              <View style={[styles.coverageBadge, { backgroundColor: overlayBg, borderColor }]}>
                <Text style={[styles.coverageText, { color: overlayText }]}>
                  Missing location: {coverageStats.visitsMissingLocation} visit
                  {coverageStats.visitsMissingLocation === 1 ? "" : "s"} (
                  {coverageStats.uniqueShowsMissingLocation} show
                  {coverageStats.uniqueShowsMissingLocation === 1 ? "" : "s"})
                </Text>
              </View>
            ) : (
              <View style={[styles.coverageBadge, { backgroundColor: overlayBg, borderColor }]}>
                <Text style={[styles.coverageText, { color: overlayText }]}>
                  Missing location: --
                </Text>
              </View>
            )}

            <View style={styles.scopeOverlay}>
            {showScopeMenu ? (
              <View style={styles.scopeMenu}>
                {scopeOptions.map((option) => {
                  const selected = option.value === mapScope;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        onChangeMapScope(option.value);
                        setShowScopeMenu(false);
                      }}
                      style={[
                        styles.scopeMenuButton,
                        {
                          borderColor,
                          backgroundColor: selected ? activeChipColor : chipColor,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={option.icon} size={15} color={selected ? textColor : mutedTextColor} />
                      <Text
                        style={[
                          styles.scopeMenuButtonText,
                          { color: selected ? textColor : mutedTextColor },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.scopeFab, { backgroundColor: overlayBg, borderColor }]}
              onPress={() => setShowScopeMenu((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons name={selectedScope.icon} size={18} color={overlayText} />
            </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: tabBarHeight + 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  mapWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapStage: {
    flex: 1,
    position: "relative",
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  messageBody: {
    fontSize: 14,
    textAlign: "center",
  },
  resolvingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resolvingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorBadge: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  coverageBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coverageText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scopeOverlay: {
    position: "absolute",
    right: 12,
    top: 12,
    alignItems: "flex-end",
  },
  scopeMenu: {
    marginBottom: 8,
    gap: 6,
  },
  scopeMenuButton: {
    minWidth: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scopeMenuButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scopeFab: {
    width: 38,
    height: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterBubble: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    borderWidth: 1,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  clusterBubbleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
