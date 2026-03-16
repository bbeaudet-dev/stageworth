import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DetailCard, detailCardStyles } from "@/components/detail-card";

export default function ShowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showId?: string; name?: string }>();
  const showId = (params.showId ?? "") as Id<"shows">;
  const title =
    typeof params.name === "string" && params.name.trim().length > 0
      ? params.name
      : "Show";

  const show = useQuery(api.shows.getById, showId ? { id: showId } : "skip");
  const visits = useQuery(api.visits.listByShow, showId ? { showId } : "skip");
  const productions = useQuery(api.productions.listByShow, showId ? { showId } : "skip");

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title, headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      <ScrollView contentContainerStyle={styles.content}>
        <DetailCard title="Show">
          <Text style={detailCardStyles.value}>{show?.name ?? "Loading..."}</Text>
          <Text style={detailCardStyles.subtle}>{show?.type ?? ""}</Text>
        </DetailCard>

        <DetailCard title="Your stats">
          <Text style={detailCardStyles.value}>{visits?.length ?? 0} visits</Text>
          <Text style={detailCardStyles.subtle}>{productions?.length ?? 0} productions available</Text>
        </DetailCard>

        <DetailCard title="Visits">
          {visits === undefined ? (
            <Text style={detailCardStyles.subtle}>Loading...</Text>
          ) : visits.length === 0 ? (
            <Text style={detailCardStyles.subtle}>No visits for this show yet.</Text>
          ) : (
            visits.map((visit) => (
              <Pressable
                key={visit._id}
                style={styles.visitRow}
                onPress={() =>
                  router.push({
                    pathname: "/visit/[visitId]",
                    params: { visitId: String(visit._id) },
                  })
                }
              >
                <Text style={styles.visitRowText}>{visit.date}</Text>
                <Text style={styles.visitRowChevron}>▸</Text>
              </Pressable>
            ))
          )}
        </DetailCard>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/add-visit")}
        >
          <Text style={styles.primaryButtonText}>Add a Visit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
    paddingVertical: 10,
  },
  visitRowText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  visitRowChevron: {
    fontSize: 14,
    color: "#9a9a9a",
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
