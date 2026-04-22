import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DetailCard, detailCardStyles } from "@/components/detail-card";
import { NotesText } from "@/components/NotesText";
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
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const removeVisit = useMutation(api.visits.remove);
  const isMine = !!visit && !!myProfile && visit.userId === myProfile._id;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const dangerColor = Colors[theme].danger;

  const confirmDelete = () => {
    if (!visit) return;
    Alert.alert(
      "Delete visit?",
      `Remove the ${formatDate(visit.date)} visit? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeVisit({ visitId: visit._id });
              router.back();
            } catch (err) {
              Alert.alert(
                "Couldn't delete visit",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Visit",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerRight: isMine
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
            <View
              style={[styles.showHero, { backgroundColor: playbillMatBackground(theme) }]}
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
              </View>
            </View>
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
                <NotesText
                  text={visit.notes}
                  style={detailCardStyles.subtle}
                  color={mutedTextColor}
                />
              </DetailCard>
            ) : null}

            {isMine && (
              <Pressable
                onPress={confirmDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { borderColor: dangerColor, opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete this visit"
              >
                <Text style={[styles.deleteButtonText, { color: dangerColor }]}>
                  Delete Visit
                </Text>
              </Pressable>
            )}
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
  deleteButton: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
