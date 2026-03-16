import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { DetailCard, detailCardStyles } from "@/components/detail-card";

export default function VisitDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ visitId?: string }>();
  const visitId = params.visitId ?? "";
  const allVisits = useQuery(api.visits.listAllWithShows);
  const visit = (allVisits ?? []).find((entry) => entry?._id === visitId) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Visit", headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      <ScrollView contentContainerStyle={styles.content}>
        {!visit ? (
          <Text style={styles.emptyText}>Visit not found.</Text>
        ) : (
          <>
            <DetailCard title="Show">
              <Text style={detailCardStyles.value}>{visit.show?.name ?? "Unknown Show"}</Text>
              {visit.show?._id ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() =>
                    router.push({
                      pathname: "/show/[showId]",
                      params: {
                        showId: String(visit.show._id),
                        name: visit.show.name ?? "Show",
                      },
                    })
                  }
                >
                  <Text style={styles.linkText}>View Show Details</Text>
                </Pressable>
              ) : null}
            </DetailCard>
            <DetailCard title="Date">
              <Text style={detailCardStyles.value}>{visit.date}</Text>
            </DetailCard>
            <DetailCard title="Location">
              <Text style={detailCardStyles.subtle}>
                {[visit.theatre, visit.city].filter(Boolean).join(" • ") || "—"}
              </Text>
            </DetailCard>
            {visit.notes ? (
              <DetailCard title="Notes">
                <Text style={detailCardStyles.subtle}>{visit.notes}</Text>
              </DetailCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyText: { fontSize: 15, color: "#8a8a8a" },
  linkButton: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
});
