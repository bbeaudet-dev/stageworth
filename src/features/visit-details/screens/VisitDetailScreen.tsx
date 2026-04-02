import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DetailCard, detailCardStyles } from "@/components/detail-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function VisitDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ visitId?: string }>();
  const visitId = params.visitId ?? "";
  const visit = useQuery(
    api.visits.getById,
    visitId ? { visitId: visitId as Id<"visits"> } : "skip"
  ) ?? null;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Visit",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerRight: visit
            ? () => (
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    router.push({
                      pathname: "/edit-visit/[visitId]",
                      params: { visitId: String(visitId) },
                    })
                  }
                >
                  <Text style={{ color: accentColor, fontSize: 16, fontWeight: "500" }}>Edit</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!visit ? (
          <Text style={[styles.emptyText, { color: mutedTextColor }]}>Visit not found.</Text>
        ) : (
          <>
            <DetailCard title="Show">
              <Text style={[detailCardStyles.value, { color: primaryTextColor }]}>{visit.show?.name ?? "Unknown Show"}</Text>
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
                  <Text style={[styles.linkText, { color: accentColor }]}>View Show Details</Text>
                </Pressable>
              ) : null}
            </DetailCard>
            <DetailCard title="Date">
              <Text style={[detailCardStyles.value, { color: primaryTextColor }]}>{visit.date}</Text>
            </DetailCard>
            <DetailCard title="Location">
              <Text style={[detailCardStyles.subtle, { color: mutedTextColor }]}>
                {[visit.theatre, visit.city].filter(Boolean).join(" • ") || "—"}
              </Text>
            </DetailCard>
            {visit.notes ? (
              <DetailCard title="Notes">
                <Text style={[detailCardStyles.subtle, { color: mutedTextColor }]}>{visit.notes}</Text>
              </DetailCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyText: { fontSize: 15 },
  linkButton: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
