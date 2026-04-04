import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DetailCard, detailCardStyles } from "@/components/detail-card";
import { Colors } from "@/constants/theme";
import { playbillMatBackground } from "@/features/browse/styles";
import { formatDate } from "@/features/browse/logic/date";
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
            {/* Show poster + title */}
            <Pressable
              style={[styles.showHero, { backgroundColor: playbillMatBackground(theme) }]}
              onPress={() =>
                visit.show?._id
                  ? router.push({
                      pathname: "/show/[showId]",
                      params: { showId: String(visit.show._id), name: visit.show.name ?? "Show" },
                    })
                  : undefined
              }
            >
              {visit.show?.images[0] ? (
                <Image
                  source={{ uri: visit.show.images[0] }}
                  style={styles.showHeroImage}
                  contentFit="contain"
                />
              ) : null}
              <View style={styles.showHeroText}>
                <Text style={[styles.showHeroTitle, { color: primaryTextColor }]} numberOfLines={2}>
                  {visit.show?.name ?? "Unknown Show"}
                </Text>
                {visit.show?._id ? (
                  <Text style={[styles.showHeroLink, { color: accentColor }]}>View show details →</Text>
                ) : null}
              </View>
            </Pressable>
            <DetailCard title="Date">
              <Text style={[detailCardStyles.value, { color: primaryTextColor }]}>{formatDate(visit.date)}</Text>
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
  showHero: {
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
  },
  showHeroImage: {
    width: 72,
    height: 108,
    borderRadius: 8,
  },
  showHeroText: {
    flex: 1,
    gap: 6,
  },
  showHeroTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  showHeroLink: {
    fontSize: 13,
    fontWeight: "600",
  },
});
