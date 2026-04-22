import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActionSheetIOS,
  Alert,
  Platform,
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
import { IconSymbol } from "@/components/ui/icon-symbol";
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
  const c = Colors[theme];

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

  const goToEdit = () => {
    router.push({
      pathname: "/edit-visit/[visitId]",
      params: { visitId: String(visitId) },
    });
  };

  const openActions = () => {
    if (!visit) return;
    const iosOptions = ["Edit Visit", "Delete Visit", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: iosOptions,
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        (idx) => {
          if (idx === 0) goToEdit();
          else if (idx === 1) confirmDelete();
        },
      );
    } else {
      Alert.alert("Visit options", undefined, [
        { text: "Edit Visit", onPress: goToEdit },
        { text: "Delete Visit", style: "destructive", onPress: confirmDelete },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const hasVenueLink = !!visit?.venueId;
  const locationLabel =
    [visit?.theatre, visit?.city].filter(Boolean).join(" • ") || "—";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Visit",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerRight: isMine
            ? () => (
                <Pressable
                  hitSlop={10}
                  onPress={openActions}
                  accessibilityLabel="Visit options"
                  accessibilityRole="button"
                >
                  <IconSymbol name="ellipsis" size={22} color={c.text} />
                </Pressable>
              )
            : undefined,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!visit ? (
          <Text style={[styles.emptyText, { color: c.mutedText }]}>Visit not found.</Text>
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
                <Text style={[styles.showHeroTitle, { color: c.text }]} numberOfLines={2}>
                  {visit.show?.name ?? "Unknown Show"}
                </Text>
              </View>
            </View>

            <DetailCard title="Date">
              <Text style={[detailCardStyles.value, { color: c.text }]}>
                {formatDate(visit.date)}
              </Text>
            </DetailCard>

            <DetailCard title="Location">
              {hasVenueLink ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/venue/[venueId]",
                      params: { venueId: String(visit.venueId) },
                    })
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`Open venue ${visit.theatre ?? ""}`}
                >
                  <Text
                    style={[
                      detailCardStyles.value,
                      styles.locationLink,
                      { color: c.accent },
                    ]}
                  >
                    {visit.theatre ?? "Venue"}
                  </Text>
                  {visit.city ? (
                    <Text style={[detailCardStyles.subtle, { color: c.mutedText }]}>
                      {visit.city}
                    </Text>
                  ) : null}
                </Pressable>
              ) : (
                <Text style={[detailCardStyles.value, { color: c.text }]} numberOfLines={2}>
                  {locationLabel}
                </Text>
              )}
            </DetailCard>

            {visit.seat ? (
              <DetailCard title="Seat">
                <Text style={[detailCardStyles.value, { color: c.text }]}>
                  {visit.seat}
                </Text>
              </DetailCard>
            ) : null}

            {visit.taggedGuestNames && visit.taggedGuestNames.length > 0 ? (
              <DetailCard title="With">
                <View style={styles.guestWrap}>
                  {visit.taggedGuestNames.map((name) => (
                    <View
                      key={name}
                      style={[
                        styles.guestChip,
                        {
                          backgroundColor: c.surface,
                          borderColor: c.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.guestChipText, { color: c.text }]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>
                  ))}
                </View>
              </DetailCard>
            ) : null}

            {visit.notes ? (
              <DetailCard title="Notes">
                <NotesText
                  text={visit.notes}
                  style={detailCardStyles.subtle}
                  color={c.mutedText}
                />
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
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  locationLink: {
    textDecorationLine: "underline",
  },
  guestWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  guestChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  guestChipText: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 180,
  },
});
