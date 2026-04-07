import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import type { TripShowLabel } from "@/features/plan/tripShowLabelMeta";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
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
import { closingStripBadge, fullStatusBadgeForProduction } from "@/features/browse/logic/closingStrip";
import { getProductionStatus } from "@/utils/productions";
import { AddFromListsSheet } from "@/features/plan/components/AddFromListsSheet";
import { AddShowToTripSheet } from "@/features/plan/components/AddShowToTripSheet";
import { TripShowLabelSheet } from "@/features/plan/components/TripShowLabelSheet";
import { useTripData } from "@/features/plan/hooks/useTripData";
import { tripShowLabelMeta } from "@/features/plan/tripShowLabelMeta";
import type { TripDetail, TripShowItem, TripDay, ClosingSoonItem } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

// ─── helpers ──────────────────────────────────────────────────────────────────

const COLS = 4;
const GAP = 8;
/** Horizontal padding on `styles.tabContent` (ScrollView content). */
const TAB_CONTENT_H_PAD = 16;
/** Horizontal padding on nested `styles.card` (e.g. Closing Soon). */
const CARD_H_PAD = 14;

const REACTION_SORT_RANK: Record<TripShowLabel, number> = {
  must_see: 0,
  want_see: 1,
  dont_know: 2,
  indifferent: 3,
  dont_want: 4,
};

type TripListSort = "closing" | "reaction";

// ─── component ────────────────────────────────────────────────────────────────

interface TripShowsTabProps {
  trip: TripDetail;
  tripId: Id<"trips">;
  closingSoon?: ClosingSoonItem[];
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
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;

  const [labelSheetItem, setLabelSheetItem] = useState<TripShowItem | null>(null);
  const [optimisticLabels, setOptimisticLabels] = useState<Record<string, TripShowLabel | null>>({});
  const [showAddFromLists, setShowAddFromLists] = useState(false);
  const [showAddShow, setShowAddShow] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [tripListSort, setTripListSort] = useState<TripListSort>("closing");
  // Track optimistic "added" state for Closing Soon items: showId -> true
  const [optimisticAdded, setOptimisticAdded] = useState<Record<string, boolean>>({});

  const {
    addShowToTrip,
    removeShowFromTrip,
    assignShowToDay,
    setTripShowLabel,
    clearTripShowLabel,
  } = useTripData();

  const canEditTrip = Boolean(trip.canEdit ?? trip.isOwner);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // All shows on this trip (assigned + unassigned), sorted by creation order.
  const allTripShows: TripShowItem[] = useMemo(
    () =>
      [...(trip.unassigned ?? []), ...(trip.days ?? []).flatMap((d: TripDay) => d.shows)].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      ),
    [trip.unassigned, trip.days],
  );

  const openTripListSortSheet = useCallback(() => {
    const choose = (sort: TripListSort) => () => setTripListSort(sort);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Closing date (soonest first)", "Your reaction (priority)"],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) setTripListSort("closing");
          if (i === 2) setTripListSort("reaction");
        },
      );
    } else {
      Alert.alert("Sort trip list", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Closing date (soonest first)", onPress: choose("closing") },
        { text: "Your reaction (priority)", onPress: choose("reaction") },
      ]);
    }
  }, []);

  const sortedTripShows = useMemo(() => {
    const copy = [...allTripShows];
    if (tripListSort === "closing") {
      copy.sort((a, b) => {
        const ca = a.closingDate ?? "9999-12-31";
        const cb = b.closingDate ?? "9999-12-31";
        const c = ca.localeCompare(cb);
        if (c !== 0) return c;
        return (a.show?.name ?? "").localeCompare(b.show?.name ?? "");
      });
    } else {
      copy.sort((a, b) => {
        const ida = String(a._id);
        const idb = String(b._id);
        const la =
          ida in optimisticLabels ? optimisticLabels[ida] : (a.myLabel ?? null);
        const lb =
          idb in optimisticLabels ? optimisticLabels[idb] : (b.myLabel ?? null);
        const ra =
          la != null && la in REACTION_SORT_RANK
            ? REACTION_SORT_RANK[la as TripShowLabel]
            : 99;
        const rb =
          lb != null && lb in REACTION_SORT_RANK
            ? REACTION_SORT_RANK[lb as TripShowLabel]
            : 99;
        if (ra !== rb) return ra - rb;
        return (a.show?.name ?? "").localeCompare(b.show?.name ?? "");
      });
    }
    return copy;
  }, [allTripShows, tripListSort, optimisticLabels]);

  const labelSheetItemLive = useMemo(() => {
    if (!labelSheetItem) return null;
    const id = String(labelSheetItem._id);
    const base = allTripShows.find((s) => String(s._id) === id) ?? labelSheetItem;
    if (id in optimisticLabels) {
      return { ...base, myLabel: optimisticLabels[id] };
    }
    return base;
  }, [labelSheetItem, allTripShows, optimisticLabels]);

  // Returns the effective label for a card (optimistic takes priority over server).
  const effectiveLabel = (item: TripShowItem): TripShowLabel | null => {
    const id = String(item._id);
    return id in optimisticLabels ? optimisticLabels[id] : (item.myLabel ?? null);
  };

  const gridWidthFull = screenWidth - TAB_CONTENT_H_PAD * 2;
  const gridWidthInCard = gridWidthFull - CARD_H_PAD * 2;
  const cardWidth = (gridWidthFull - GAP * (COLS - 1)) / COLS;
  const cardWidthInClosingCard = (gridWidthInCard - GAP * (COLS - 1)) / COLS;

  const alreadyOnTripShowIds = new Set([
    ...(trip.unassigned ?? []).map((s: TripShowItem) => String(s.showId)),
    ...(trip.days ?? []).flatMap((d: TripDay) => d.shows.map((s: TripShowItem) => String(s.showId))),
  ]);

  const handleAddShow = async (showId: Id<"shows">) => {
    setOptimisticAdded((prev) => ({ ...prev, [String(showId)]: true }));
    try {
      await addShowToTrip({ tripId, showId });
    } catch {
      setOptimisticAdded((prev) => { const n = { ...prev }; delete n[String(showId)]; return n; });
    }
  };

  const handleAddAll = async () => {
    if (!closingSoon || isAddingAll) return;
    const toAdd = closingSoon.filter((item) => !alreadyOnTripShowIds.has(String(item.show._id)));
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

  const stripForClosing = (closingDate: string | null | undefined) => {
    const b = closingStripBadge(closingDate, todayStr, theme === "dark");
    if (!b) return null;
    return { label: b.label, bg: b.bg, textCol: b.text };
  };

  const stripForTripPlaybill = (item: TripShowItem) => {
    const status = item.tripProductionStatus
      ? getProductionStatus(
          {
            previewDate: item.previewDate ?? undefined,
            openingDate: item.openingDate ?? undefined,
            closingDate: item.closingDate ?? undefined,
            isOpenRun: item.isOpenRun,
          },
          todayStr,
        )
      : null;
    if (!status) return null;
    const result = fullStatusBadgeForProduction(
      {
        previewDate: item.previewDate,
        openingDate: item.openingDate,
        closingDate: item.closingDate,
        isOpenRun: item.isOpenRun,
      },
      status,
      todayStr,
      theme === "dark",
    );
    if (!result) return null;
    return {
      primary: { label: result.primary.label, bg: result.primary.bg, textCol: result.primary.text },
      secondary: result.secondary
        ? { label: result.secondary.label, bg: result.secondary.bg, textCol: result.secondary.text }
        : undefined,
    };
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
          <Pressable
            style={[styles.sortIconBtn, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}
            onPress={openTripListSortSheet}
            accessibilityLabel={
              tripListSort === "closing"
                ? "Sorted by closing date. Tap to change."
                : "Sorted by reaction. Tap to change."
            }
          >
            <IconSymbol size={18} name="arrow.up.arrow.down" color={accentColor} />
          </Pressable>
        </View>

        {allTripShows.length === 0 ? (
          <Text style={[styles.emptyHint, { color: mutedTextColor }]}>No shows added</Text>
        ) : (
          <View style={styles.grid}>
            {chunkRows(sortedTripShows, COLS).map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((item) => {
                  const key = String(item.showId);
                  const image = item.show?.images?.[0] ?? null;
                  const badge = stripForTripPlaybill(item);
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
                        <>
                          {badge.secondary ? (
                            <View style={[styles.closingBadgeBelow, styles.previewsBadge, { backgroundColor: badge.secondary.bg }]}>
                              <Text style={[styles.closingBadgeText, { color: badge.secondary.textCol }]}>{badge.secondary.label}</Text>
                            </View>
                          ) : null}
                          <View style={[styles.closingBadgeBelow, { backgroundColor: badge.primary.bg }]}>
                            <Text style={[styles.closingBadgeText, { color: badge.primary.textCol }]}>{badge.primary.label}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  );
                })}
                {row.length < COLS ? Array.from({ length: COLS - row.length }).map((_, i) => <View key={i} style={{ width: cardWidth }} />) : null}
              </View>
            ))}
          </View>
        )}

        {/* Add: icon toolbar + optional closing-soon grid */}
        {((closingSoon && closingSoon.length > 0) || canEditTrip) ? (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            {canEditTrip ? (
              <View style={styles.addTripIconRow}>
                <Pressable
                  style={[styles.addTripIconBtn, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}
                  onPress={() => setShowAddFromLists(true)}
                  accessibilityLabel="Add from lists"
                >
                  <IconSymbol size={22} name="list.bullet" color={accentColor} />
                </Pressable>
                <Pressable
                  style={[styles.addTripIconBtn, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}
                  onPress={() => setShowAddShow(true)}
                  accessibilityLabel="Search shows"
                >
                  <IconSymbol size={22} name="magnifyingglass" color={accentColor} />
                </Pressable>
                {closingSoon && closingSoon.length > 0 ? (
                  <Pressable
                    style={[
                      styles.addTripIconBtn,
                      { backgroundColor: accentColor + "18", borderColor: accentColor + "40" },
                      isAddingAll && { opacity: 0.5 },
                    ]}
                    onPress={handleAddAll}
                    disabled={isAddingAll}
                    accessibilityLabel="Add all closing soon"
                  >
                    {isAddingAll ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <IconSymbol size={22} name="plus.circle.fill" color={accentColor} />
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {closingSoon && closingSoon.length > 0 ? (
              <View style={[styles.grid, canEditTrip && { marginTop: 4 }]}>
                {chunkRows(closingSoon, COLS).map((row, ri) => (
                  <View key={ri} style={styles.gridRow}>
                    {row.map((item) => {
                      const show = item.show;
                      const image = item.production?.posterUrl ?? show?.images?.[0] ?? null;
                      const sid = String(show._id);
                      const isOnTrip = alreadyOnTripShowIds.has(sid) || optimisticAdded[sid];
                      const badge = stripForClosing(item.closingDate);
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
                            : <Pressable style={[styles.closingAddBtn, { backgroundColor: accentColor }]} onPress={() => handleAddShow(show._id)}><Text style={[styles.closingAddText, { color: onAccent }]}>+ Add</Text></Pressable>}
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
            ) : null}
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
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sortIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addTripIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  addTripIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
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
  onTripBadge: { borderRadius: 6, paddingVertical: 4, alignItems: "center" },
  onTripText: { fontSize: 10, fontWeight: "700" },
  closingAddBtn: { borderRadius: 6, paddingVertical: 5, alignItems: "center" },
  closingAddText: { fontSize: 10, fontWeight: "700" },
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
  previewsBadge: {
    opacity: 0.85,
    paddingVertical: 3,
  },
  closingBadgeText: { fontSize: 9, fontWeight: "700" },
});
