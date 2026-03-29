import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { AddDayNoteSheet } from "@/features/plan/components/AddDayNoteSheet";
import { AddFromListsSheet } from "@/features/plan/components/AddFromListsSheet";
import { AddShowToTripSheet } from "@/features/plan/components/AddShowToTripSheet";
import { useTripData } from "@/features/plan/hooks/useTripData";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function daysUntilClose(closingDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const close = new Date(closingDate + "T00:00:00Z");
  const diff = Math.ceil((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Closed";
  if (diff === 1) return "Closes tomorrow";
  return `Closes in ${diff}d`;
}

function chunkRows<T>(arr: T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
  return rows;
}

const COLS = 4;
const GAP = 8;
const PAD = 16;

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

  const [selectedShowKey, setSelectedShowKey] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [assignForDay, setAssignForDay] = useState<string | null>(null);
  const [noteForDay, setNoteForDay] = useState<string | null>(null);
  const [showAddFromLists, setShowAddFromLists] = useState(false);
  const [showAddShow, setShowAddShow] = useState(false);

  const { addShowToTrip, removeShowFromTrip, assignShowToDay, addTripDayNote, removeTripDayNote } = useTripData();

  const cardWidth = (screenWidth - PAD * 2 - GAP * (COLS - 1)) / COLS;

  const alreadyOnTripShowIds = new Set([
    ...(trip.unassigned ?? []).map((s: any) => String(s.showId)),
    ...(trip.days ?? []).flatMap((d: any) => d.shows.map((s: any) => String(s.showId))),
  ]);

  const handleAddShow = async (showId: Id<"shows">) => {
    await addShowToTrip({ tripId, showId });
  };

  const handleRemoveShow = (showId: Id<"shows">) => {
    Alert.alert("Remove show?", "It will be removed from this trip.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await removeShowFromTrip({ tripId, showId }); setSelectedShowKey(null); } },
    ]);
  };

  const handleAssignToDay = async (showId: Id<"shows">, dayDate: string) => {
    await assignShowToDay({ tripId, showId, dayDate });
    setAssignForDay(null);
  };

  const handleUnassignFromDay = (showId: Id<"shows">) => {
    Alert.alert("Unassign?", "Show will return to the Trip List.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unassign", style: "destructive", onPress: async () => { await assignShowToDay({ tripId, showId, dayDate: undefined }); setSelectedShowKey(null); } },
    ]);
  };

  const handleAddNote = async (text: string, time?: string) => {
    if (!noteForDay) return;
    await addTripDayNote({ tripId, dayDate: noteForDay, text, time });
  };

  const handleRemoveNote = (noteId: string) => {
    Alert.alert("Remove note?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await removeTripDayNote({ noteId: noteId as Id<"tripDayNotes"> }); setSelectedNoteId(null); } },
    ]);
  };

  // Format stored "HH:MM" (24h) → "h:MM AM/PM"
  const formatTime12h = (time24: string): string => {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => { setSelectedShowKey(null); setSelectedNoteId(null); }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Closing soon */}
        {closingSoon && closingSoon.length > 0 ? (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Closing Around Your Trip</Text>
            <Text style={[styles.sectionSub, { color: mutedTextColor }]}>From your lists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.closingCards}>
              {closingSoon.map((item: any) => {
                const show = item.show;
                const image = item.production?.posterUrl ?? show?.images?.[0] ?? null;
                const sid = String(show._id);
                const isOnTrip = alreadyOnTripShowIds.has(sid);
                return (
                  <View key={sid} style={[styles.closingCard, { backgroundColor: chipBg, borderColor }]}>
                    <Pressable onPress={() => router.push({ pathname: "/show/[showId]", params: { showId: sid, name: show.name } })}>
                      {image
                        ? <Image source={{ uri: image }} style={styles.closingCardImg} contentFit="cover" />
                        : <View style={[styles.closingCardImg, styles.closingCardFb, { backgroundColor: surfaceColor }]}><Text style={[styles.closingCardFbText, { color: mutedTextColor }]} numberOfLines={3}>{show.name}</Text></View>}
                      <Text style={[styles.closingCardName, { color: primaryTextColor }]} numberOfLines={2}>{show.name}</Text>
                      <Text style={[styles.closingCardDate, { color: mutedTextColor }]}>{daysUntilClose(item.closingDate)}</Text>
                    </Pressable>
                    {isOnTrip
                      ? <View style={[styles.onTripBadge, { backgroundColor: accentColor + "18" }]}><Text style={[styles.onTripText, { color: accentColor }]}>On trip ✓</Text></View>
                      : <Pressable style={[styles.closingAddBtn, { backgroundColor: accentColor }]} onPress={() => handleAddShow(show._id)}><Text style={styles.closingAddText}>+ Add</Text></Pressable>}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Trip List header row */}
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
                  const isSelected = selectedShowKey === key;
                  const image = item.show?.images?.[0] ?? null;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
                      onPress={() => setSelectedShowKey(isSelected ? null : key)}
                    >
                      {image
                        ? <Image source={{ uri: image }} style={styles.playbillImg} contentFit="cover" />
                        : <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: chipBg }]}><Text style={[styles.playbillFbText, { color: mutedTextColor }]} numberOfLines={4}>{item.show?.name}</Text></View>}
                      <Text style={[styles.playbillName, { color: primaryTextColor }]} numberOfLines={2}>{item.show?.name}</Text>
                      {isSelected ? (
                        <Pressable style={styles.removeOverlay} onPress={() => handleRemoveShow(item.showId)}>
                          <View style={styles.removeBubble}><Text style={styles.removeIcon}>−</Text></View>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
                {row.length < COLS ? Array.from({ length: COLS - row.length }).map((_, i) => <View key={i} style={{ width: cardWidth }} />) : null}
              </View>
            ))}
          </View>
        )}

        {/* Day sections */}
        {trip.days.map((day: any) => {
          const totalItems = day.shows.length + (day.notes?.length ?? 0);
          return (
            <View key={day.date} style={styles.daySection}>
              <View style={styles.rowBetween}>
                <View style={styles.dayHeaderLeft}>
                  <Text style={[styles.dayLabel, { color: primaryTextColor }]}>{formatDateDisplay(day.date)}</Text>
                  {totalItems > 0 ? (
                    <View style={[styles.dayCountBadge, { backgroundColor: accentColor + "18" }]}>
                      <Text style={[styles.dayCountText, { color: accentColor }]}>{totalItems}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.dayBtnRow}>
                  {/* Add note button */}
                  <Pressable
                    style={[styles.dayIconBtn, { backgroundColor: accentColor + "18" }]}
                    onPress={() => setNoteForDay(day.date)}
                    hitSlop={8}
                  >
                    <IconSymbol size={13} name="pencil" color={accentColor} />
                  </Pressable>
                  {/* Assign show button — only shown when trip list has shows */}
                  {trip.unassigned.length > 0 ? (
                    <Pressable style={[styles.dayAddBtn, { backgroundColor: accentColor }]} onPress={() => setAssignForDay(day.date)} hitSlop={8}>
                      <Text style={styles.dayAddBtnText}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Note cards — above shows */}
              {(day.notes ?? []).map((note: any) => {
                const nid = String(note._id);
                const isSelected = selectedNoteId === nid;
                return (
                  <Pressable
                    key={nid}
                    style={[styles.noteCard, { backgroundColor: surfaceColor, borderColor }]}
                    onPress={() => setSelectedNoteId(isSelected ? null : nid)}
                  >
                    {note.time ? (
                      <View style={[styles.noteTimeBadge, { backgroundColor: accentColor + "18" }]}>
                        <Text style={[styles.noteTimeText, { color: accentColor }]}>{formatTime12h(note.time)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.noteIcon, { backgroundColor: accentColor + "14" }]}>
                        <IconSymbol size={12} name="pencil" color={accentColor} />
                      </View>
                    )}
                    <Text style={[styles.noteText, { color: primaryTextColor }]} numberOfLines={isSelected ? undefined : 2}>
                      {note.text}
                    </Text>
                    {isSelected ? (
                      <Pressable onPress={() => handleRemoveNote(nid)} hitSlop={8}>
                        <View style={styles.noteRemoveBubble}>
                          <Text style={styles.removeIcon}>−</Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}

              {/* Show grid */}
              {day.shows.length > 0 ? (
                <View style={styles.grid}>
                  {chunkRows(day.shows, COLS).map((row: any[], ri: number) => (
                    <View key={ri} style={styles.gridRow}>
                      {row.map((item: any) => {
                        const key = `${day.date}:${item.showId}`;
                        const isSelected = selectedShowKey === key;
                        const image = item.show?.images?.[0] ?? null;
                        return (
                          <Pressable
                            key={key}
                            style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
                            onPress={() => setSelectedShowKey(isSelected ? null : key)}
                          >
                            {image
                              ? <Image source={{ uri: image }} style={styles.playbillImg} contentFit="cover" />
                              : <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: chipBg }]}><Text style={[styles.playbillFbText, { color: mutedTextColor }]} numberOfLines={4}>{item.show?.name}</Text></View>}
                            <Text style={[styles.playbillName, { color: primaryTextColor }]} numberOfLines={2}>{item.show?.name}</Text>
                            {isSelected ? (
                              <Pressable style={styles.removeOverlay} onPress={() => handleUnassignFromDay(item.showId)}>
                                <View style={styles.removeBubble}><Text style={styles.removeIcon}>−</Text></View>
                              </Pressable>
                            ) : null}
                          </Pressable>
                        );
                      })}
                      {row.length < COLS ? Array.from({ length: COLS - row.length }).map((_, i) => <View key={i} style={{ width: cardWidth }} />) : null}
                    </View>
                  ))}
                </View>
              ) : null}

            </View>
          );
        })}
      </ScrollView>

      {/* Assign from trip list sheet */}
      <BottomSheet visible={assignForDay !== null} onClose={() => setAssignForDay(null)}>
        <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: borderColor }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.sheetTitle, { color: primaryTextColor }]}>
              {assignForDay ? `Add to ${formatDateDisplay(assignForDay)}` : ""}
            </Text>
            <Pressable onPress={() => setAssignForDay(null)}>
              <Text style={[styles.sheetDone, { color: accentColor }]}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.assignScroll} contentContainerStyle={styles.assignContent}>
            {trip.unassigned.length === 0
              ? <Text style={[styles.emptyHint, { color: mutedTextColor }]}>All shows are assigned to days.</Text>
              : trip.unassigned.map((item: any) => (
                <Pressable
                  key={String(item.showId)}
                  style={[styles.assignRow, { borderBottomColor: borderColor }]}
                  onPress={() => assignForDay && handleAssignToDay(item.showId, assignForDay)}
                >
                  {item.show?.images?.[0]
                    ? <Image source={{ uri: item.show.images[0] }} style={styles.assignThumb} contentFit="cover" />
                    : <View style={[styles.assignThumb, { backgroundColor: chipBg, borderRadius: 4 }]} />}
                  <Text style={[styles.assignName, { color: primaryTextColor }]} numberOfLines={2}>{item.show?.name ?? "Unknown"}</Text>
                  <IconSymbol size={16} name="chevron.right" color={mutedTextColor} />
                </Pressable>
              ))}
          </ScrollView>
        </View>
      </BottomSheet>

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

      <AddDayNoteSheet
        visible={noteForDay !== null}
        onClose={() => setNoteForDay(null)}
        onAdd={handleAddNote}
        dayLabel={noteForDay ? formatDateDisplay(noteForDay) : ""}
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
  sectionSub: { fontSize: 12, lineHeight: 17, marginTop: -6 },
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
  closingCards: { gap: 10, paddingVertical: 4 },
  closingCard: { width: 118, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 6, gap: 5 },
  closingCardImg: { width: "100%", aspectRatio: 2 / 3, borderRadius: 6 },
  closingCardFb: { alignItems: "center", justifyContent: "center", padding: 6 },
  closingCardFbText: { fontSize: 10, textAlign: "center" },
  closingCardName: { fontSize: 11, fontWeight: "600" },
  closingCardDate: { fontSize: 10 },
  onTripBadge: { borderRadius: 6, paddingVertical: 4, alignItems: "center" },
  onTripText: { fontSize: 10, fontWeight: "700" },
  closingAddBtn: { borderRadius: 6, paddingVertical: 5, alignItems: "center" },
  closingAddText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  grid: { gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  playbillCard: { borderRadius: 10, overflow: "hidden" },
  playbillImg: { width: "100%", aspectRatio: 2 / 3 },
  playbillFb: { alignItems: "center", justifyContent: "center", padding: 8 },
  playbillFbText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  playbillName: { fontSize: 10, fontWeight: "700", padding: 5, lineHeight: 13 },
  removeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", borderRadius: 10 },
  removeBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  removeIcon: { color: "#fff", fontSize: 24, fontWeight: "300", lineHeight: 28 },
  daySection: { gap: 10 },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayLabel: { fontSize: 15, fontWeight: "700" },
  dayCountBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  dayCountText: { fontSize: 11, fontWeight: "700" },
  dayBtnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dayIconBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayAddBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayAddBtnText: { color: "#fff", fontSize: 20, lineHeight: 22, fontWeight: "300" },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteTimeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  noteTimeText: { fontSize: 11, fontWeight: "700" },
  noteIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  noteRemoveBubble: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, maxHeight: "75%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetDone: { fontSize: 15, fontWeight: "600" },
  assignScroll: { flexGrow: 0 },
  assignContent: { paddingHorizontal: 16, paddingVertical: 8 },
  assignRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  assignThumb: { width: 44, height: 58, borderRadius: 4 },
  assignName: { flex: 1, fontSize: 15, fontWeight: "500" },
});
