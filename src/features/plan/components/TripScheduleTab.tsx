import { Image } from "expo-image";
import { useMemo, useState } from "react";
import type { TripShowLabel } from "@/features/plan/tripShowLabelMeta";
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
import { closingCountdownLabel } from "@/features/browse/components/ProductionCard";
import { AddDayNoteSheet } from "@/features/plan/components/AddDayNoteSheet";
import { TripShowLabelSheet } from "@/features/plan/components/TripShowLabelSheet";
import { useTripData } from "@/features/plan/hooks/useTripData";
import { tripShowLabelMeta } from "@/features/plan/tripShowLabelMeta";
import { useColorScheme } from "@/hooks/use-color-scheme";

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function chunkRows<T>(arr: T[], cols: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
  return rows;
}

const COLS = 4;
const GAP = 8;
const TAB_CONTENT_H_PAD = 16;

interface TripScheduleTabProps {
  trip: any;
  tripId: Id<"trips">;
}

export function TripScheduleTab({ trip, tripId }: TripScheduleTabProps) {
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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [optimisticLabels, setOptimisticLabels] = useState<Record<string, TripShowLabel | null>>({});
  const [assignForDay, setAssignForDay] = useState<string | null>(null);
  const [noteForDay, setNoteForDay] = useState<string | null>(null);

  const {
    assignShowToDay,
    addTripDayNote,
    removeTripDayNote,
    setTripShowLabel,
    clearTripShowLabel,
    removeShowFromTrip,
  } = useTripData();

  const canEditTrip = Boolean(trip.canEdit ?? trip.isOwner);

  const labelSheetItemLive = useMemo(() => {
    if (!labelSheetItem) return null;
    const id = String(labelSheetItem._id);
    const pool = (trip.days ?? []).flatMap((d: any) => d.shows ?? []);
    const base = pool.find((s: any) => String(s._id) === id) ?? labelSheetItem;
    if (id in optimisticLabels) {
      return { ...base, myLabel: optimisticLabels[id] };
    }
    return base;
  }, [labelSheetItem, trip.days, optimisticLabels]);

  const effectiveLabel = (item: any): TripShowLabel | null => {
    const id = String(item._id);
    return id in optimisticLabels ? optimisticLabels[id] : (item.myLabel ?? null);
  };

  const gridWidthFull = screenWidth - TAB_CONTENT_H_PAD * 2;
  const cardWidth = (gridWidthFull - GAP * (COLS - 1)) / COLS;

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

  const handleAssignToDay = async (showId: Id<"shows">, dayDate: string) => {
    await assignShowToDay({ tripId, showId, dayDate });
    setAssignForDay(null);
  };

  const handleAddNote = async (text: string, time?: string) => {
    if (!noteForDay) return;
    await addTripDayNote({ tripId, dayDate: noteForDay, text, time });
  };

  const handleRemoveNote = (noteId: string) => {
    Alert.alert("Remove note?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeTripDayNote({ noteId: noteId as Id<"tripDayNotes"> });
          setSelectedNoteId(null);
        },
      },
    ]);
  };

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
        onScrollBeginDrag={() => {
          setLabelSheetItem(null);
          setSelectedNoteId(null);
        }}
        keyboardShouldPersistTaps="handled"
      >
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
                  <Pressable
                    style={[styles.dayIconBtn, { backgroundColor: accentColor + "18" }]}
                    onPress={() => setNoteForDay(day.date)}
                    hitSlop={8}
                  >
                    <IconSymbol size={13} name="pencil" color={accentColor} />
                  </Pressable>
                  {trip.unassigned.length > 0 ? (
                    <Pressable
                      style={[styles.dayAddBtn, { backgroundColor: accentColor }]}
                      onPress={() => setAssignForDay(day.date)}
                      hitSlop={8}
                    >
                      <Text style={styles.dayAddBtnText}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

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

              {day.shows.length > 0 ? (
                <View style={styles.grid}>
                  {chunkRows(day.shows, COLS).map((row: any[], ri: number) => (
                    <View key={ri} style={styles.gridRow}>
                      {row.map((item: any) => {
                        const key = `${day.date}:${item.showId}`;
                        const image = item.show?.images?.[0] ?? null;
                        const badge = closingBadge(item.closingDate);
                        const myLabel = effectiveLabel(item);
                        const labelMeta = myLabel ? tripShowLabelMeta(myLabel) : null;
                        return (
                          <View key={key} style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}>
                            <Pressable onPress={() => setLabelSheetItem(item)}>
                              <View style={styles.playbillTapArea}>
                                {image ? (
                                  <Image source={{ uri: image }} style={styles.playbillImg} contentFit="cover" />
                                ) : (
                                  <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: chipBg }]}>
                                    <Text
                                      style={[styles.playbillFbText, { color: mutedTextColor }]}
                                      numberOfLines={5}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.6}
                                    >
                                      {item.show?.name}
                                    </Text>
                                  </View>
                                )}
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
                      {row.length < COLS
                        ? Array.from({ length: COLS - row.length }).map((_, i) => <View key={i} style={{ width: cardWidth }} />)
                        : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

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
            {trip.unassigned.length === 0 ? (
              <Text style={[styles.emptyHint, { color: mutedTextColor }]}>All shows are assigned to days.</Text>
            ) : (
              trip.unassigned.map((item: any) => (
                <Pressable
                  key={String(item.showId)}
                  style={[styles.assignRow, { borderBottomColor: borderColor }]}
                  onPress={() => assignForDay && handleAssignToDay(item.showId, assignForDay)}
                >
                  {item.show?.images?.[0] ? (
                    <Image source={{ uri: item.show.images[0] }} style={styles.assignThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.assignThumb, { backgroundColor: chipBg, borderRadius: 4 }]} />
                  )}
                  <Text style={[styles.assignName, { color: primaryTextColor }]} numberOfLines={2}>
                    {item.show?.name ?? "Unknown"}
                  </Text>
                  <IconSymbol size={16} name="chevron.right" color={mutedTextColor} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </BottomSheet>

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
            setOptimisticLabels((prev) => {
              const { [id]: _, ...rest } = prev;
              return rest;
            });
          });
        }}
        onClearLabel={(tripShowId) => {
          const id = String(tripShowId);
          setOptimisticLabels((prev) => ({ ...prev, [id]: null }));
          clearTripShowLabel({ tripId, tripShowId }).catch(() => {
            setOptimisticLabels((prev) => {
              const { [id]: _, ...rest } = prev;
              return rest;
            });
          });
        }}
        onRemoveFromTrip={async (showId) => {
          await removeShowFromTrip({ tripId, showId });
        }}
        onUnassign={async (showId) => {
          await assignShowToDay({ tripId, showId, dayDate: undefined });
        }}
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

const styles = StyleSheet.create({
  tabContent: { padding: 16, gap: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emptyHint: { fontSize: 13, fontStyle: "italic" },
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
  closingBadgeBelow: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  closingBadgeText: { fontSize: 9, fontWeight: "700" },
  removeIcon: { color: "#fff", fontSize: 24, fontWeight: "300", lineHeight: 28 },
  daySection: { gap: 10 },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayLabel: { fontSize: 15, fontWeight: "700" },
  dayCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
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
  noteRemoveBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, maxHeight: "75%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetDone: { fontSize: 15, fontWeight: "600" },
  assignScroll: { flexGrow: 0 },
  assignContent: { paddingHorizontal: 16, paddingVertical: 8 },
  assignRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  assignThumb: { width: 44, height: 58, borderRadius: 4 },
  assignName: { flex: 1, fontSize: 15, fontWeight: "500" },
});
