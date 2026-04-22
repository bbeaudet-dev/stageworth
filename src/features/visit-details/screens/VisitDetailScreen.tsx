import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const participants = useQuery(
    api.visitParticipants.listByVisit,
    visitId ? { visitId: visitId as Id<"visits"> } : "skip",
  );
  const removeVisit = useMutation(api.visits.remove);
  const leaveVisit = useMutation(api.visitParticipants.leaveVisit);
  const updateMyParticipantNotes = useMutation(
    api.visitParticipants.updateMyParticipantNotes,
  );
  const isMine = !!visit && !!myProfile && visit.userId === myProfile._id;
  const viewerStatus = visit?.viewerParticipantStatus ?? null;
  const isAcceptedParticipant = !isMine && viewerStatus === "accepted";
  const isPendingParticipant = !isMine && viewerStatus === "pending";

  const [editingMyNotes, setEditingMyNotes] = useState(false);
  const [myNotesDraft, setMyNotesDraft] = useState("");
  const [savingMyNotes, setSavingMyNotes] = useState(false);

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

  const openEditMyNotes = () => {
    if (!visit) return;
    setMyNotesDraft(visit.viewerParticipantNotes ?? "");
    setEditingMyNotes(true);
  };

  const confirmLeave = () => {
    if (!visit) return;
    Alert.alert(
      "Leave this visit?",
      "You'll be untagged and your notes on this visit will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveVisit({ visitId: visit._id });
              router.back();
            } catch (err) {
              Alert.alert(
                "Couldn't leave visit",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const saveMyNotes = async () => {
    if (!visit) return;
    setSavingMyNotes(true);
    try {
      await updateMyParticipantNotes({
        visitId: visit._id,
        notes: myNotesDraft.trim() || undefined,
      });
      setEditingMyNotes(false);
    } catch (err) {
      Alert.alert(
        "Couldn't save notes",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingMyNotes(false);
    }
  };

  const openActions = () => {
    if (!visit) return;
    if (isMine) {
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
      return;
    }

    if (isAcceptedParticipant) {
      const iosOptions = ["Edit My Notes", "Leave Visit", "Cancel"];
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: iosOptions,
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
          },
          (idx) => {
            if (idx === 0) openEditMyNotes();
            else if (idx === 1) confirmLeave();
          },
        );
      } else {
        Alert.alert("Visit options", undefined, [
          { text: "Edit My Notes", onPress: openEditMyNotes },
          { text: "Leave Visit", style: "destructive", onPress: confirmLeave },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    }
  };

  const headerRightVisible = isMine || isAcceptedParticipant;

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
          headerRight: headerRightVisible
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
                {!isMine && (
                  <Text style={[styles.sharedByLabel, { color: c.mutedText }]}>
                    Shared visit — tagged you
                  </Text>
                )}
              </View>
            </View>

            {isPendingParticipant ? (
              <Pressable
                style={[
                  styles.acceptBanner,
                  { backgroundColor: c.accent },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/accept-visit/[visitId]",
                    params: { visitId: String(visit._id) },
                  })
                }
              >
                <Text style={[styles.acceptBannerText, { color: c.onAccent }]}>
                  Accept this visit tag
                </Text>
                <IconSymbol name="chevron.right" size={16} color={c.onAccent} />
              </Pressable>
            ) : null}

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

            {(participants && participants.length > 0) ||
            (visit.taggedGuestNames && visit.taggedGuestNames.length > 0) ? (
              <DetailCard title="With">
                <View style={styles.guestWrap}>
                  {(participants ?? []).map((p) => {
                    const isPending = p.status === "pending";
                    const isDeclined = p.status === "declined";
                    return (
                      <View
                        key={p._id}
                        style={[
                          styles.guestChip,
                          {
                            backgroundColor: isPending ? c.surface : c.surface,
                            borderColor: isPending
                              ? c.accent
                              : isDeclined
                                ? c.border
                                : c.border,
                            borderStyle: isPending ? "dashed" : "solid",
                            opacity: isDeclined ? 0.55 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.guestChipText, { color: c.text }]}
                          numberOfLines={1}
                        >
                          {p.user?.name ?? p.user?.username ?? "Someone"}
                        </Text>
                        {p.status !== "accepted" ? (
                          <Text
                            style={[
                              styles.participantStatus,
                              {
                                color: isDeclined ? c.mutedText : c.accent,
                              },
                            ]}
                          >
                            {isPending ? "pending" : "declined"}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                  {(visit.taggedGuestNames ?? []).map((name) => (
                    <View
                      key={`guest-${name}`}
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

            {/* Creator-owned notes — shown to everyone. */}
            {visit.notes ? (
              <DetailCard title={isMine ? "Notes" : "Notes from tagger"}>
                <NotesText
                  text={visit.notes}
                  style={detailCardStyles.subtle}
                  color={c.mutedText}
                />
              </DetailCard>
            ) : null}

            {/* Viewer's own participant notes (shared visits only). */}
            {isAcceptedParticipant ? (
              <DetailCard
                title="Your notes"
                rightAccessory={
                  <Pressable onPress={openEditMyNotes} hitSlop={10}>
                    <Text style={[styles.editLink, { color: c.accent }]}>
                      {visit.viewerParticipantNotes ? "Edit" : "Add"}
                    </Text>
                  </Pressable>
                }
              >
                {visit.viewerParticipantNotes ? (
                  <NotesText
                    text={visit.viewerParticipantNotes}
                    style={detailCardStyles.subtle}
                    color={c.mutedText}
                  />
                ) : (
                  <Text style={[detailCardStyles.subtle, { color: c.mutedText }]}>
                    Add your own thoughts about this visit.
                  </Text>
                )}
              </DetailCard>
            ) : null}

            {/* Other participants' notes (only shown for shared visits with actual notes). */}
            {participants
              ?.filter(
                (p) =>
                  p.status === "accepted" &&
                  p.notes &&
                  p.userId !== myProfile?._id,
              )
              .map((p) => (
                <DetailCard
                  key={`notes-${p._id}`}
                  title={`Notes from ${p.user?.name ?? p.user?.username ?? "Someone"}`}
                >
                  <NotesText
                    text={p.notes ?? ""}
                    style={detailCardStyles.subtle}
                    color={c.mutedText}
                  />
                </DetailCard>
              ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={editingMyNotes}
        animationType="slide"
        transparent
        onRequestClose={() => !savingMyNotes && setEditingMyNotes(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalWrap}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !savingMyNotes && setEditingMyNotes(false)}
          />
          <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Your notes</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              placeholder="Add your thoughts about this visit..."
              placeholderTextColor={c.mutedText}
              multiline
              value={myNotesDraft}
              onChangeText={setMyNotesDraft}
              editable={!savingMyNotes}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => !savingMyNotes && setEditingMyNotes(false)}
                disabled={savingMyNotes}
                style={styles.modalSecondaryBtn}
              >
                <Text style={[styles.modalSecondaryText, { color: c.mutedText }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveMyNotes}
                disabled={savingMyNotes}
                style={[
                  styles.modalPrimaryBtn,
                  { backgroundColor: c.accent, opacity: savingMyNotes ? 0.5 : 1 },
                ]}
              >
                {savingMyNotes ? (
                  <ActivityIndicator color={c.onAccent} />
                ) : (
                  <Text style={[styles.modalPrimaryText, { color: c.onAccent }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  guestChipText: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 180,
  },
  participantStatus: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sharedByLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  acceptBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  acceptBannerText: {
    fontSize: 15,
    fontWeight: "700",
  },
  editLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalPrimaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
