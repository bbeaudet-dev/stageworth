import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";

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
            <View style={styles.card}>
              <Text style={styles.heading}>Show</Text>
              <Text style={styles.value}>{visit.show?.name ?? "Unknown Show"}</Text>
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
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Date</Text>
              <Text style={styles.value}>{visit.date}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Location</Text>
              <Text style={styles.subtle}>
                {[visit.theatre, visit.city].filter(Boolean).join(" • ") || "—"}
              </Text>
            </View>
            {visit.notes ? (
              <View style={styles.card}>
                <Text style={styles.heading}>Notes</Text>
                <Text style={styles.subtle}>{visit.notes}</Text>
              </View>
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
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    gap: 4,
  },
  heading: { fontSize: 12, color: "#777", textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 18, color: "#222", fontWeight: "700" },
  subtle: { fontSize: 13, color: "#666", lineHeight: 18 },
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
