import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import type { TripShowLabel } from "@/features/plan/tripShowLabelMeta";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { closingCountdownLabel } from "@/features/browse/logic/date";
import { AddFromListsSheet } from "@/features/plan/components/AddFromListsSheet";
import { AddShowToTripSheet } from "@/features/plan/components/AddShowToTripSheet";
import { TripShowLabelSheet } from "@/features/plan/components/TripShowLabelSheet";
import { useTripData } from "@/features/plan/hooks/useTripData";
import { tripShowLabelMeta } from "@/features/plan/tripShowLabelMeta";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── helpers ──────────────────────────────────────────────────────────────────

function chunkRows<T>(arr: T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
  return rows;
}

const COLS = 4;
const GAP = 8;
/** Horizontal padding on `styles.tabContent` (ScrollView content). */
const TAB_CONTENT_H_PAD = 16;
/** Horizontal padding on nested `styles.card` (e.g. Closing Soon). */
const CARD_H_PAD = 14;

// ─── component ────────────────────────────────────────────────────────────────

interface TripShowsTabProps {
  trip: any;
  tripId: Id<"trips">;
  closingSoon?: any[];
}

export function TripShowsTab({ trip, tripId, closingSoon }: TripShowsTabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const chipBg = Colors[theme].surface;

  const [labelSheetItem, setLabelSheetItem] = useState<any | null>(null);
  const [optimisticLabels, setOptimisticLabels] = useState<Record<string, TripShowLabel | null>>({});
  const [showAddFromLists, setShowAddFromLists] = useState(false);
  const [showAddShow, setShowAddShow] = useState(false);
  const [showClosingInfo, setShowClosingInfo] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);

  const {
    addShowToTrip,
    removeShowFromTrip,
    assignShowToDay,
    setTripShowLabel,
    clearTripShowLabel,
  } = useTripData();

  const canEditTrip = Boolean(trip.canEdit ?? trip.isOwner);

  const labelSheetItemLive = useMemo(() => {
    if (!labelSheetItem) return null;
    const id = String(labelSheetItem._id);
    const pool = trip.unassigned ?? [];
    const base = pool.find((s: any) => String(s._id) === id) ?? labelSheetItem;
    if (id in optimisticLabels) {
      return { ...base, myLabel: optimisticLabels[id] };
    }
    return base;
  }, [labelSheetItem, trip.unassigned, optimisticLabels]);

  // Returns the effective label for a card (optimistic takes priority over server).
  const effectiveLabel = (item: any): TripShowLabel | null => {
    const id = String(item._id);
    return id in optimisticLabels ? optimisticLabels[id] : (item.myLabel ?? null);
  };

  const gridWidthFull = screenWidth - TAB_CONTENT_H_PAD * 2;
  const gridWidthInCard = gridWidthFull - CARD_H_PAD * 2;
  const cardWidth = (gridWidthFull - GAP * (COLS - 1)) / COLS;
  const cardWidthInClosingCard = (gridWidthInCard - GAP * (COLS - 1)) / COLS;

  const alreadyOnTripShowIds = new Set([
    ...(trip.unassigned ?? []).map((s: any) => String(s.showId)),
    ...(trip.days ?? []).flatMap((d: any) => d.shows.map((s: any) => String(s.showId))),
  ]);

  const handleAddShow = async (showId: Id<"shows">) => {
    await addShowToTrip({ tripId, showId });
  };

  const handleAddAll = async () => {
    if (!closingSoon || isAddingAll) return;
    const toAdd = closingSoon.filter((item: any) => !alreadyOnTripShowIds.has(String(item.show._id)));
    if (toAdd.length === 0) return;
    setIsAddingAll(true);
    try {
      for (const item of toAdd) {
        await addShowToTrip({ tripId, showId: item.show._id });
      }
    } finally {
      setIsAddingAll(false);
    }
  };

  const closingBadge = (
    closingDate: string | null | undefined
  ): { label: string; bg: string; textCol: string } | null => {
    if (!closingDate) return null;
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const close = new Date(closingDate + "T00:00:00Z");
    const diff = Math.ceil((close.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff > 30) return null;
    const label = closingCountdownLabel(diff);
    return theme === "dark"
      ? { label, bg: "rgba(239,68,68,0.18)", textCol: "#F87171" }
      : { label, bg: "#FEF2F2", textCol: "#E05252" };
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setLabelSheetItem(null)}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trip List */}
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Trip List</Text>
          <View style={styles.pillRow}>
            <Pressable
              style={[styles.pill, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}
              onPress={() => setShowAddFromLists(true)}
            >
              <IconSymbol size={12} name="plus" color={accentColor} />
              <Text style={[styles.pillText, { color: accentColor }]}>From Lists</Text>
            </Pressable>
            <Pressable
              style={[styles.pill, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}
              onPress={() => setShowAddShow(true)}
            >
              <IconSymbol size={12} name="magnifyingglass" color={accentColor} />
              <Text style={[styles.pillText, { color: accentColor }]}>Search Shows</Text>
            </Pressable>
          </View>
        </View>

        {trip.unassigned.length === 0 ? (
          <Text style={[styles.emptyHint, { color: mutedTextColor }]}>No shows added</Text>
        ) : (
          <View style={styles.grid}>
            {chunkRows(trip.unassigned, COLS).map((row: any[], ri: number) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((item: any) => {
                  const key = String(item.showId);
                  const image = item.show?.images?.[0] ?? null;
                  const badge = closingBadge(item.closingDate);
                  const myLabel = effectiveLabel(item);
                  const labelMeta = myLabel ? tripShowLabelMeta(myLabel) : null;
                  return (
                    <View key={key} style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}>
                      <Pressable onPress={() => setLabelSheetItem(item)}>
                        <View style={styles.playbillTapArea}>
                          {image
                            ? <Image source={{ uri: image }} style={[styles.playbillImg, { backgroundColor: chipBg }]} contentFit="contain" />
                            : <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: chipBg }]}><Text style={[styles.playbillFbText, { color: mutedTextColor }]} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.6}>{item.show?.name}</Text></View>}
                          {labelMeta ? (
                            <View style={[styles.myLabelBadge, { backgroundColor: labelMeta.color + "EE", borderColor: surfaceColor }]}>
                              <IconSymbol name={labelMeta.icon} size={11} color="#fff" />
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                      {badge ? (
                        <View style={[styles.closingBadgeBelow, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.closingBadgeText, { color: badge.textCol }]}>{badge.label}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {row.length < COLS ? Array.from({ length: COLS - row.length }).map((_, i) => <View key={i} style={{ width: cardWidth }} />) : null}
              </View>
            ))}
          </View>
        )}

        {/* Closing soon */}
        {closingSoon && closingSoon.length > 0 ? (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.rowBetween}>
              <View style={styles.closingHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Closing Soon</Text>
                <Pressable
                  onPress={() => setShowClosingInfo((p) => !p)}
                  hitSlop={8}
                  style={[styles.infoBubble, { backgroundColor: accentColor + "18" }]}
                >
                  <Text style={[styles.infoBubbleText, { color: accentColor }]}>i</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.pill, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }, isAddingAll && { opacity: 0.5 }]}
                onPress={handleAddAll}
                disabled={isAddingAll}
              >
                <Text style={[styles.pillText, { color: accentColor }]}>{isAddingAll ? "Adding…" : "Add All"}</Text>
              </Pressable>
            </View>
            {showClosingInfo ? (
              <View style={[styles.infoBox, { backgroundColor: accentColor + "12", borderColor: accentColor + "30" }]}>
                <Text style={[styles.infoBoxText, { color: primaryTextColor }]}>
                  Shows from your Want to See, Look Into, and Uncategorized lists that are closing within the next 60 days.
                </Text>
              </View>
            ) : null}
            <View style={styles.grid}>
              {chunkRows(closingSoon, COLS).map((row: any[], ri: number) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((item: any) => {
                    const show = item.show;
                    const image = item.production?.posterUrl ?? show?.images?.[0] ?? null;
                    const sid = String(show._id);
                    const isOnTrip = alreadyOnTripShowIds.has(sid);
                    const badge = closingBadge(item.closingDate);
                    return (
                      <View key={sid} style={[styles.playbillCard, { width: cardWidthInClosingCard, backgroundColor: surfaceColor }]}>
                        <Pressable onPress={() => router.push({ pathname: "/show/[showId]", params: { showId: sid, name: show.name } })}>
                          {image
                            ? <Image source={{ uri: image }} style={[styles.playbillImg, { backgroundColor: chipBg }]} contentFit="contain" />
                            : <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: chipBg }]}>
                                <Text style={[styles.playbillFbText, { color: mutedTextColor }]} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.6}>{show.name}</Text>
                              </View>}
                        </Pressable>
                        {badge ? (
                          <View style={[styles.closingBadgeBelow, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.closingBadgeText, { color: badge.textCol }]}>{badge.label}</Text>
                          </View>
                        ) : null}
                        {isOnTrip
                          ? <View style={[styles.onTripBadge, { backgroundColor: accentColor + "18" }]}><Text style={[styles.onTripText, { color: accentColor }]}>On trip ✓</Text></View>
                          : <Pressable style={[styles.closingAddBtn, { backgroundColor: accentColor }]} onPress={() => handleAddShow(show._id)}><Text style={styles.closingAddText}>+ Add</Text></Pressable>}
                      </View>
                    );
                  })}
                  {row.length < COLS
                    ? Array.from({ length: COLS - row.length }).map((_, i) => (
                        <View key={`pad-${i}`} style={{ width: cardWidthInClosingCard }} />
                      ))
                    : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <AddFromListsSheet
        visible={showAddFromLists}
        onClose={() => setShowAddFromLists(false)}
        tripId={tripId}
        alreadyOnTripShowIds={alreadyOnTripShowIds}
        onAddShow={handleAddShow}
      />

      <AddShowToTripSheet
        visible={showAddShow}
        onClose={() => setShowAddShow(false)}
        alreadyOnTripShowIds={alreadyOnTripShowIds}
        onAddShow={handleAddShow}
      />

      <TripShowLabelSheet
        visible={labelSheetItemLive !== null}
        onClose={() => setLabelSheetItem(null)}
        item={
          labelSheetItemLive
            ? {
                ...labelSheetItemLive,
                myLabel: labelSheetItemLive.myLabel ?? null,
                labelSummary: labelSheetItemLive.labelSummary ?? [],
              }
            : null
        }
        canEdit={canEditTrip}
        isOwner={Boolean(trip.isOwner)}
        onSetLabel={(tripShowId, label) => {
          const id = String(tripShowId);
          setOptimisticLabels((prev) => ({ ...prev, [id]: label }));
          setTripShowLabel({ tripId, tripShowId, label }).catch(() => {
            setOptimisticLabels((prev) => { const { [id]: _, ...rest } = prev; return rest; });
          });
        }}
        onClearLabel={(tripShowId) => {
          const id = String(tripShowId);
          setOptimisticLabels((prev) => ({ ...prev, [id]: null }));
          clearTripShowLabel({ tripId, tripShowId }).catch(() => {
            setOptimisticLabels((prev) => { const { [id]: _, ...rest } = prev; return rest; });
          });
        }}
        onRemoveFromTrip={async (showId) => {
          await removeShowFromTrip({ tripId, showId });
        }}
        onUnassign={async (showId) => {
          await assignShowToDay({ tripId, showId, dayDate: undefined });
        }}
      />
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabContent: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  closingHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoBubble: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoBubbleText: { fontSize: 11, fontWeight: "700", lineHeight: 14 },
  infoBox: { borderRadius: 8, borderWidth: 1, padding: 10 },
  infoBoxText: { fontSize: 13, lineHeight: 18 },
  emptyHint: { fontSize: 13, fontStyle: "italic" },
  pillRow: { flexDirection: "row", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  closingRowHint: { fontSize: 9, fontWeight: "500", paddingHorizontal: 5, paddingBottom: 4, marginTop: -2 },
  onTripBadge: { borderRadius: 6, paddingVertical: 4, alignItems: "center" },
  onTripText: { fontSize: 10, fontWeight: "700" },
  closingAddBtn: { borderRadius: 6, paddingVertical: 5, alignItems: "center" },
  closingAddText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  grid: { gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  playbillCard: { borderRadius: 10, overflow: "hidden" },
  playbillTapArea: { position: "relative" },
  playbillImg: { width: "100%", aspectRatio: 2 / 3 },
  myLabelBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  playbillFb: { alignItems: "center", justifyContent: "center", padding: 8 },
  playbillFbText: { fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 14 },
  // Full-width strip clipped by the card's overflow:hidden / borderRadius
  closingBadgeBelow: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  closingBadgeText: { fontSize: 9, fontWeight: "700" },
});
