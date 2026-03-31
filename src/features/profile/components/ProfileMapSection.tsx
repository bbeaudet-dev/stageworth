import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ProfileMapSectionProps {
  userId?: string;
}

export function ProfileMapSection({ userId }: ProfileMapSectionProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const mapStats = useQuery(api.visits.getMapCoverageStats, { scope: "mine" });
  const pins = useQuery(api.visits.listMapPins, { scope: "mine" });

  const theatreCount = pins?.length ?? 0;
  const citySet = new Set(pins?.map((p) => p.city).filter(Boolean));
  const cityCount = citySet.size;
  const totalVisits = mapStats?.totalVisits ?? 0;

  if (totalVisits === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="map.fill" size={18} color={accentColor} />
        <Text style={[styles.headerText, { color: primaryTextColor }]}>
          Theatre Map
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: primaryTextColor }]}>
            {theatreCount}
          </Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>
            {theatreCount === 1 ? "Theatre" : "Theatres"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: primaryTextColor }]}>
            {cityCount}
          </Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>
            {cityCount === 1 ? "City" : "Cities"}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.viewMapBtn, { borderColor: accentColor + "40" }]}
        onPress={() => router.push("/(tabs)/profile/map")}
      >
        <Text style={[styles.viewMapText, { color: accentColor }]}>
          View Theatre Map
        </Text>
        <IconSymbol name="chevron.right" size={14} color={accentColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewMapText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
