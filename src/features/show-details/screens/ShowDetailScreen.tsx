import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useToast } from "@/components/Toast";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";
import {
  daysUntil,
  earliestFutureRunDate,
  formatDate,
} from "@/features/browse/logic/date";
import { playbillMatBackground } from "@/features/browse/styles";
import { getProductionStatus, type ProductionStatus } from "@/utils/productions";
import { BroadwayShowtimesGrid } from "@/components/BroadwayShowtimesGrid";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  musical: { bg: "#FFF3E0", text: "#E65100" },
  play:    { bg: "#E8F5E9", text: "#1B5E20" },
  opera:   { bg: "#EDE7F6", text: "#4A148C" },
  dance:   { bg: "#FCE4EC", text: "#880E4F" },
  other:   { bg: "#ECEFF1", text: "#37474F" },
};

const TYPE_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  musical: { bg: "rgba(230,81,0,0.18)",  text: "#FFB74D" },
  play:    { bg: "rgba(27,94,32,0.2)",   text: "#81C784" },
  opera:   { bg: "rgba(74,20,140,0.2)",  text: "#CE93D8" },
  dance:   { bg: "rgba(136,14,79,0.2)",  text: "#F48FB1" },
  other:   { bg: "rgba(55,71,79,0.2)",   text: "#B0BEC5" },
};

function districtLabel(d: string): string {
  const map: Record<string, string> = {
    broadway: "Broadway",
    off_broadway: "Off-Broadway",
    off_off_broadway: "Off-Off-Broadway",
    west_end: "West End",
    touring: "Touring",
    regional: "Regional",
    other: "Other",
  };
  return map[d] ?? d;
}

function prodTypeLabel(t: string): string {
  const map: Record<string, string> = {
    original: "Original",
    revival: "Revival",
    transfer: "Transfer",
    touring: "Touring",
    concert: "Concert",
    workshop: "Workshop",
    other: "Other",
  };
  return map[t] ?? t;
}

function deriveShowScoreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const today = () => new Date().toISOString().split("T")[0];

function productionStatusLine(
  p: {
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
  },
  status: ProductionStatus,
  todayStr: string
): string {
  if (status === "closed") {
    const c = formatDate(p.closingDate);
    return c ? `Closed ${c}` : "Closed";
  }

  if (p.closingDate) {
    const c = formatDate(p.closingDate);
    if (c) {
      const d = daysUntil(p.closingDate);
      if (d === 0) return "Closes today";
      if (d === 1) return "Closes tomorrow";
      return `Closes ${c}`;
    }
  }

  switch (status) {
    case "announced": {
      const m = earliestFutureRunDate(p.previewDate, p.openingDate, todayStr);
      if (!m) return "Announced";
      const formatted = formatDate(m);
      if (!formatted) return "Announced";
      if (p.previewDate === m) return `Previews ${formatted}`;
      return `Opens ${formatted}`;
    }
    case "in_previews": {
      const parts: string[] = ["In previews"];
      if (p.openingDate && p.openingDate >= todayStr) {
        const o = formatDate(p.openingDate);
        if (o) parts.push(`opens ${o}`);
      }
      return parts.join(" · ");
    }
    case "open_run":
      return "Open run";
    case "open":
      return "Running";
    default:
      return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showId?: string; name?: string }>();
  const showId = (params.showId ?? "") as Id<"shows">;
  const { data: session, isPending } = useSession();

  const show = useQuery(api.shows.getById, showId ? { id: showId } : "skip");
  const visits = useQuery(api.visits.listByShow, showId ? { showId } : "skip");
  const productions = useQuery(api.productions.listByShowWithImages, showId ? { showId } : "skip");

  const myLists = useQuery(
    api.lists.getProfileLists,
    !isPending && session ? { showId } : "skip"
  );
  const myTrips = useQuery(
    api.trips.trips.getMyTrips,
    !isPending && session ? {} : "skip"
  );
  const addShowToList = useMutation(api.lists.addShowToList);
  const addShowToTrip = useMutation(api.trips.trips.addShowToTrip);
  const submitCatalogFeedback = useMutation(api.admin.catalogUserFeedback.submit);
  const enrichShowScore = useAction(api.admin.showScore.enrichShowWithShowScore);
  const getRecommendation = useAction(api.recommendations.getShowRecommendation);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";
  const { showToast } = useToast();

  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // "Add to List" sheet state
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [optimisticallyInLists, setOptimisticallyInLists] = useState<Set<string>>(new Set());

  // "Add to Trip" sheet state
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState<Id<"trips"> | null>(null);

  // Catalog feedback (suggest correction)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // AI recommendation state
  const [recLoading, setRecLoading] = useState(false);
  const [recResult, setRecResult] = useState<{
    score: number;
    headline: string;
    reasoning: string;
    matchedElements: string[];
    mismatchedElements: string[];
  } | null>(null);
  const [recError, setRecError] = useState(false);

  async function handleGetRecommendation() {
    if (!showId || recLoading) return;
    if (!session) {
      Alert.alert("Sign in required", "Sign in to get personalized recommendations.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/sign-in") },
      ]);
      return;
    }
    setRecLoading(true);
    setRecError(false);
    try {
      const result = await getRecommendation({ showId });
      setRecResult(result);
    } catch {
      setRecError(true);
    } finally {
      setRecLoading(false);
    }
  }

  const playbillSize = Math.floor((screenWidth - 32 - 12) / 3);

  const posterUrl = show?.images?.[0] ?? null;

  const showType = show?.type ?? "other";
  const typeColors = isDark ? TYPE_COLORS_DARK[showType] ?? TYPE_COLORS_DARK.other : TYPE_COLORS[showType] ?? TYPE_COLORS.other;

  const todayStr = today();

  const hasVisits = (visits?.length ?? 0) > 0;

  // Lazily enrich ShowScore data when stale or missing
  const enrichAttempted = useRef(false);
  useEffect(() => {
    if (!showId || !show || enrichAttempted.current) return;
    const staleMs = 7 * 24 * 60 * 60 * 1000;
    const isFresh = show.showScoreUpdatedAt && Date.now() - show.showScoreUpdatedAt < staleMs;
    if (isFresh) return;
    enrichAttempted.current = true;
    enrichShowScore({ showId }).catch(() => {});
  }, [showId, show, enrichShowScore]);

  async function handleAddToList(listId: Id<"userLists">, listName: string) {
    if (!showId || addingToList) return;

    // Optimistic update: immediately close sheet, mark list as containing show, show toast
    setOptimisticallyInLists((prev) => new Set([...prev, listId]));
    setListSheetOpen(false);
    showToast({ message: `Added "${show?.name ?? "show"}" to ${listName}` });

    setAddingToList(true);
    try {
      await addShowToList({ listId, showId });
    } catch {
      // Rollback optimistic update on failure
      setOptimisticallyInLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    } finally {
      setAddingToList(false);
    }
  }

  async function handleAddToTrip(tripId: Id<"trips">) {
    if (!showId || addingToTrip) return;
    const trip = activeTrips.find((t) => t._id === tripId);
    setAddingToTrip(tripId);
    try {
      await addShowToTrip({ tripId, showId });
      setTripSheetOpen(false);
      showToast({ message: `Added "${show?.name ?? "show"}" to ${trip?.name ?? "trip"}` });
    } catch {
      setTripSheetOpen(false);
    } finally {
      setAddingToTrip(null);
    }
  }

  function openFeedbackSheet() {
    if (!session) {
      Alert.alert("Sign in required", "Sign in to suggest a correction.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/sign-in") },
      ]);
      return;
    }
    if (!showId || !show) return;
    setFeedbackNote("");
    setFeedbackOpen(true);
  }

  async function handleSubmitFeedback() {
    if (!showId || !show || feedbackSubmitting) return;
    const note = feedbackNote.trim();
    if (note.length < 3) {
      Alert.alert("Add more detail", "Please write at least a few characters.");
      return;
    }
    setFeedbackSubmitting(true);
    try {
      await submitCatalogFeedback({
        showId,
        note,
      });
      setFeedbackOpen(false);
      setFeedbackNote("");
      Alert.alert("Thanks", "We have received your note and will review it.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send feedback.";
      Alert.alert("Something went wrong", msg);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const allLists = useMemo(() => {
    if (!myLists) return [];
    return [...(myLists.systemLists ?? []), ...(myLists.customLists ?? [])];
  }, [myLists]);

  const activeTrips = useMemo(() => {
    if (!myTrips) return [];
    return myTrips.upcoming ?? [];
  }, [myTrips]);

  const broadwayShowtimes = useMemo(() => {
    if (!productions) return null;
    const prod = productions.find((p) => p.district === "broadway" && p.weeklySchedule != null);
    return prod?.weeklySchedule ?? null;
  }, [productions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen options={{ title: show?.name ?? (params.name ?? "Show"), headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>

        {/* ── Hero row: playbill + name/type ─────────────────────────────── */}
        <View style={styles.heroRow}>
          <View style={[styles.playbillWrap, { width: playbillSize, height: playbillSize * 1.4 }]}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={[styles.playbillImg, { backgroundColor: playbillMatBackground(theme) }]}
                contentFit="contain"
              />
            ) : (
              <View style={[styles.playbillFallback, { backgroundColor: c.surface }]}>
                <Text
                  style={[styles.playbillFallbackText, { color: c.mutedText }]}
                  numberOfLines={5}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {show?.name ?? ""}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={[styles.showName, { color: c.text }]} numberOfLines={3}>
              {show?.name ?? (params.name ?? "Loading…")}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
                {TYPE_LABEL[showType] ?? "Other"}
              </Text>
            </View>
            {show?.showScoreRating != null && (
              <Pressable
                onPress={() => {
                  const slug = show.showScoreSlug ?? deriveShowScoreSlug(show.name);
                  Linking.openURL(`https://www.show-score.com/broadway-shows/${slug}`);
                }}
                style={({ pressed }) => [
                  styles.showScoreBadge,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F5F5F5", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.showScoreValue, { color: c.text }]}>
                  {show.showScoreRating}%
                </Text>
                <Text style={[styles.showScoreLabel, { color: c.mutedText }]}>
                  ShowScore{show.showScoreCount ? ` · ${show.showScoreCount} reviews` : ""}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.accent }]}
          onPress={() => {
            if (!showId) {
              router.push("/add-visit");
              return;
            }
            router.push({
              pathname: "/add-visit",
              params: {
                showId: String(showId),
                showName: show?.name ?? params.name ?? "",
              },
            });
          }}
        >
          <Text style={[styles.primaryBtnText, { color: c.onAccent }]}>Add a Visit</Text>
        </Pressable>

        <View style={styles.secondaryBtnRow}>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.accent + "18", borderColor: c.accent + "40" }]}
            onPress={() => setListSheetOpen(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: c.accent }]}>+ Add to List</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.accent + "18", borderColor: c.accent + "40" }]}
            onPress={() => setTripSheetOpen(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: c.accent }]}>+ Add to Trip</Text>
          </Pressable>
        </View>

        {/* ── Productions ──────────────────────────────────────────────────── */}
        {productions !== undefined && productions.length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Productions</Text>
            {productions.map((p, i) => {
              const status = getProductionStatus(p, todayStr);
              const isActive = status !== "closed";
              const statusLine = productionStatusLine(p, status, todayStr);
              const warmClosing =
                isActive && Boolean(p.closingDate) && statusLine.startsWith("Closes");
              return (
                <View
                  key={p._id}
                  style={[
                    styles.productionRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}
                >
                  {p.posterUrl ? (
                    <Image
                      source={{ uri: p.posterUrl }}
                      style={[styles.prodThumb, { backgroundColor: playbillMatBackground(theme) }]}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.prodThumbFallback, { backgroundColor: c.border }]} />
                  )}
                  <View style={styles.prodInfo}>
                    <Text style={[styles.prodVenue, { color: c.text }]} numberOfLines={1}>
                      {p.theatre}{p.city ? ` · ${p.city}` : ""}
                    </Text>
                    <Text style={[styles.prodMeta, { color: c.mutedText }]} numberOfLines={1}>
                      {districtLabel(p.district)} · {prodTypeLabel(p.productionType)}
                    </Text>
                    <Text
                      style={[
                        styles.prodMeta,
                        { color: warmClosing ? "#E65100" : c.mutedText },
                      ]}
                      numberOfLines={2}
                    >
                      {statusLine}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {broadwayShowtimes ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <BroadwayShowtimesGrid
                data={broadwayShowtimes}
                borderColor={c.border}
                surfaceColor={c.surface}
                primaryTextColor={c.text}
                mutedTextColor={c.mutedText}
              />
            </View>
          </View>
        ) : null}

        {/* ── Visits ───────────────────────────────────────────────────────── */}
        {hasVisits ? (
          <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Your Visits</Text>
            {visits!.map((visit) => (
              <Pressable
                key={visit._id}
                style={[styles.row, { borderTopColor: c.border }]}
                onPress={() => router.push({ pathname: "/visit/[visitId]", params: { visitId: String(visit._id) } })}
              >
                <Text style={[styles.rowText, { color: c.text }]}>
                  {formatDate(visit.date) ?? visit.date}
                </Text>
                <Text style={[styles.rowChevron, { color: c.mutedText }]}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Would I Like This? ───────────────────────────────────────────── */}
        {!recResult ? (
          <Pressable
            onPress={handleGetRecommendation}
            disabled={recLoading || !show}
            style={[
              styles.recButton,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8F4FF",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E8E0F0",
                opacity: recLoading || !show ? 0.6 : 1,
              },
            ]}
          >
            {recLoading ? (
              <View style={styles.recLoadingRow}>
                <ActivityIndicator size="small" color={c.mutedText} />
                <Text style={[styles.recLoadingText, { color: c.mutedText }]}>
                  Analyzing your taste…
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.recButtonTitle, { color: c.text }]}>
                  Would I like this?
                </Text>
                <Text style={[styles.recButtonSub, { color: c.mutedText }]}>
                  Get a personalized recommendation based on your preferences
                </Text>
              </>
            )}
            {recError && (
              <Text style={[styles.recErrorText, { color: c.danger }]}>
                Something went wrong. Tap to try again.
              </Text>
            )}
          </Pressable>
        ) : (
          <View
            style={[
              styles.recResultCard,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: c.border,
              },
            ]}
          >
            <View style={styles.recResultHeader}>
              <Text style={[styles.recScoreBubble, { color: c.text }]}>
                {recResult.score}/5
              </Text>
              <Text style={[styles.recHeadline, { color: c.text }]}>
                {recResult.headline}
              </Text>
            </View>
            <Text style={[styles.recReasoning, { color: c.mutedText }]}>
              {recResult.reasoning}
            </Text>
            {recResult.matchedElements.length > 0 && (
              <View style={styles.recChipRow}>
                {recResult.matchedElements.map((el) => (
                  <View
                    key={el}
                    style={[styles.recChip, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5", borderColor: isDark ? "rgba(16,185,129,0.3)" : "#A7F3D0" }]}
                  >
                    <Text style={[styles.recChipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                      {el}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {recResult.mismatchedElements.length > 0 && (
              <View style={styles.recChipRow}>
                {recResult.mismatchedElements.map((el) => (
                  <View
                    key={el}
                    style={[styles.recChip, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", borderColor: isDark ? "rgba(239,68,68,0.25)" : "#FECACA" }]}
                  >
                    <Text style={[styles.recChipText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                      {el}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => { setRecResult(null); setRecError(false); }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "flex-start", marginTop: 4 })}
            >
              <Text style={[styles.recRetryText, { color: c.accent }]}>Ask again</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={openFeedbackSheet}
          disabled={!show}
          style={({ pressed }) => [
            styles.feedbackLinkWrap,
            { opacity: !show ? 0.45 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.feedbackLinkText, { color: c.mutedText }]}>
            Something wrong? Suggest a correction
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Add to List Sheet ─────────────────────────────────────────────── */}
      <Modal visible={listSheetOpen} transparent animationType="slide" onRequestClose={() => setListSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setListSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to List</Text>
          <ScrollView>
            {allLists.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No lists found.</Text>
            ) : allLists.map((list) => {
              const alreadyIn = (list.containsShow ?? false) || optimisticallyInLists.has(list._id);
              return (
                <Pressable
                  key={list._id}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { borderBottomColor: c.border, opacity: pressed && !alreadyIn ? 0.7 : 1 },
                  ]}
                  onPress={() => !alreadyIn && handleAddToList(list._id as Id<"userLists">, list.name)}
                  disabled={addingToList}
                >
                  <Text style={[styles.sheetRowText, { color: alreadyIn ? c.mutedText : c.text }]}>
                    {list.name}
                  </Text>
                  {alreadyIn ? (
                    <Text style={[styles.sheetRowCheck, { color: c.accent }]}>✓</Text>
                  ) : (
                    <Text style={[styles.sheetRowCount, { color: c.mutedText }]}>{list.showCount}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add to Trip Sheet ─────────────────────────────────────────────── */}
      <Modal visible={tripSheetOpen} transparent animationType="slide" onRequestClose={() => setTripSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setTripSheetOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Add to Trip</Text>
          <ScrollView>
            {activeTrips.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: c.mutedText }]}>No upcoming trips.</Text>
            ) : activeTrips.map((trip) => (
              <Pressable
                key={trip._id}
                style={[styles.sheetRow, { borderBottomColor: c.border }]}
                onPress={() => handleAddToTrip(trip._id as Id<"trips">)}
              >
                <View>
                  <Text style={[styles.sheetRowText, { color: c.text }]}>{trip.name}</Text>
                  <Text style={[styles.sheetRowMeta, { color: c.mutedText }]}>
                    {formatDate(trip.startDate) ?? trip.startDate} –{" "}
                    {formatDate(trip.endDate) ?? trip.endDate}
                  </Text>
                </View>
                {addingToTrip === trip._id ? (
                  <ActivityIndicator size="small" color={c.mutedText} />
                ) : (
                  <Text style={[styles.sheetRowChevron, { color: c.mutedText }]}>›</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Suggest correction ───────────────────────────────────────────── */}
      <Modal
        visible={feedbackOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !feedbackSubmitting && setFeedbackOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => !feedbackSubmitting && setFeedbackOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            styles.feedbackSheet,
            { backgroundColor: c.background, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>Suggest a correction</Text>
          <Text style={[styles.feedbackHint, { color: c.mutedText }]}>
            Tell us what’s wrong with this listing. A moderator will review it.
          </Text>

          <Text style={[styles.feedbackFieldLabel, { color: c.mutedText }]}>Your note</Text>
          <TextInput
            value={feedbackNote}
            onChangeText={setFeedbackNote}
            placeholder="What should we fix?"
            placeholderTextColor={c.mutedText}
            multiline
            editable={!feedbackSubmitting}
            style={[
              styles.feedbackInput,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.surfaceElevated,
              },
            ]}
            textAlignVertical="top"
          />

          <View style={styles.feedbackActions}>
            <Pressable
              onPress={() => !feedbackSubmitting && setFeedbackOpen(false)}
              style={[styles.feedbackCancelBtn, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmitFeedback}
              disabled={feedbackSubmitting || feedbackNote.trim().length < 3}
              style={[
                styles.feedbackSendBtn,
                {
                  backgroundColor: c.accent,
                  opacity:
                    feedbackSubmitting || feedbackNote.trim().length < 3 ? 0.45 : 1,
                },
              ]}
            >
              {feedbackSubmitting ? (
                <ActivityIndicator color={c.onAccent} />
              ) : (
                <Text style={[styles.feedbackSendBtnText, { color: c.onAccent }]}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },

  // Hero
  heroRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  playbillWrap: { borderRadius: 8, overflow: "hidden" },
  playbillImg: { width: "100%", height: "100%" },
  playbillFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 6 },
  playbillFallbackText: { fontSize: 11, textAlign: "center", fontWeight: "600" },
  heroInfo: { flex: 1, gap: 8, paddingTop: 4 },
  showName: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  typeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  showScoreBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  showScoreValue: { fontSize: 15, fontWeight: "800" },
  showScoreLabel: { fontSize: 12, fontWeight: "500" },

  // Sections
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11 },
  rowText: { fontSize: 14, fontWeight: "500" },
  rowChevron: { fontSize: 18, fontWeight: "300" },

  // Productions
  productionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  prodThumb: { width: 44, height: 62, borderRadius: 6 },
  prodThumbFallback: { width: 44, height: 62, borderRadius: 6 },
  prodInfo: { flex: 1, gap: 2 },
  prodVenue: { fontSize: 14, fontWeight: "600" },
  prodMeta: { fontSize: 12 },

  // Buttons
  primaryBtn: { borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  primaryBtnText: { fontWeight: "700", fontSize: 15 },
  secondaryBtnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },

  feedbackLinkWrap: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
  feedbackLinkText: { fontSize: 13, fontWeight: "500", textDecorationLine: "underline" },

  // Sheet modal
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "65%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: "700", paddingHorizontal: 18, marginBottom: 8 },
  sheetEmpty: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetRowText: { fontSize: 16, fontWeight: "600" },
  sheetRowMeta: { fontSize: 12, marginTop: 2 },
  sheetRowCount: { fontSize: 14, fontWeight: "500" },
  sheetRowCheck: { fontSize: 19, fontWeight: "700" },
  sheetRowChevron: { fontSize: 18, fontWeight: "300" },

  feedbackSheet: { maxHeight: "85%" },
  feedbackHint: { fontSize: 13, lineHeight: 18, paddingHorizontal: 18, marginBottom: 12 },
  feedbackFieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", paddingHorizontal: 18, marginBottom: 8 },
  feedbackInput: {
    marginHorizontal: 18,
    minHeight: 100,
    maxHeight: 160,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  feedbackActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    justifyContent: "flex-end",
  },
  feedbackCancelBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackSendBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 22,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackSendBtnText: { fontWeight: "700", fontSize: 15 },

  // Recommendation card
  recButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
  },
  recButtonTitle: { fontSize: 16, fontWeight: "700" },
  recButtonSub: { fontSize: 13, lineHeight: 18 },
  recLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  recLoadingText: { fontSize: 14, fontWeight: "500" },
  recErrorText: { fontSize: 13, marginTop: 6 },
  recResultCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  recResultHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recScoreBubble: { fontSize: 20, fontWeight: "800" },
  recHeadline: { fontSize: 16, fontWeight: "700", flex: 1 },
  recReasoning: { fontSize: 14, lineHeight: 20 },
  recChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  recChip: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recChipText: { fontSize: 12, fontWeight: "600" },
  recRetryText: { fontSize: 13, fontWeight: "600" },
});
