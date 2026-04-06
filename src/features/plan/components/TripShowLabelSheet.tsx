import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import {
  type TripShowLabel,
  tripShowLabelMeta,
} from "@/features/plan/tripShowLabelMeta";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { closingStripLabel } from "@/features/browse/logic/closingStrip";
import { formatDate } from "@/features/browse/logic/date";

const AVATAR_CAP = 3;
const SHEET_H_PAD = 16;
const ROW_GAP = 8;

/** Placeholder weekly grid (BwayRush-style); replace when venue schedules are ingested. */
function ShowtimesPreviewPrototype({
  borderColor,
  surfaceColor,
  primaryTextColor,
  mutedTextColor,
}: {
  borderColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  mutedTextColor: string;
}) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots: (string | null)[][] = [
    ["—", "7 PM", "—", "7 PM", "8 PM", "2 PM", "—"],
    [null, "2 PM", null, "2 PM", "2 PM", "8 PM", null],
  ];
  return (
    <View style={[proto.wrap, { borderColor, backgroundColor: surfaceColor }]}>
      <View style={proto.headerRow}>
        {days.map((d) => (
          <Text key={d} style={[proto.dayHead, { color: mutedTextColor }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={proto.slotsBlock}>
        {slots.map((row, ri) => (
          <View key={ri} style={proto.slotRow}>
            {row.map((cell, ci) => (
              <View key={ci} style={proto.cell}>
                {cell ? (
                  <View style={[proto.timeChip, { borderColor }]}>
                    <Text style={[proto.timeChipText, { color: primaryTextColor }]} numberOfLines={1}>
                      {cell}
                    </Text>
                  </View>
                ) : (
                  <Text style={[proto.dash, { color: mutedTextColor }]}> </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const proto = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  headerRow: { flexDirection: "row" },
  dayHead: { flex: 1, fontSize: 9, fontWeight: "800", textAlign: "center" },
  slotsBlock: { gap: 2 },
  slotRow: { flexDirection: "row", alignItems: "center", minHeight: 20 },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 1 },
  timeChip: {
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 3,
    paddingVertical: 1,
    width: "100%",
  },
  timeChipText: { fontSize: 8, fontWeight: "700", textAlign: "center", lineHeight: 11 },
  dash: { fontSize: 10 },
});

const LABEL_ROW_1: TripShowLabel[] = ["must_see", "want_see", "dont_want"];
const LABEL_ROW_2: TripShowLabel[] = ["indifferent", "dont_know"];

export type TripShowRowForLabel = {
  _id: Id<"tripShows">;
  showId: Id<"shows">;
  dayDate?: string | null;
  closingDate?: string | null;
  isOpenRun?: boolean | null;
  tripProductionStatus?: string | null;
  show?: { name?: string; images?: (string | null)[] | null } | null;
  myLabel: TripShowLabel | null;
  labelSummary: {
    label: TripShowLabel;
    users: {
      userId: Id<"users">;
      name?: string | null;
      username: string;
      avatarUrl: string | null;
    }[];
  }[];
};

interface TripShowLabelSheetProps {
  visible: boolean;
  onClose: () => void;
  item: TripShowRowForLabel | null;
  canEdit: boolean;
  isOwner: boolean;
  onSetLabel: (tripShowId: Id<"tripShows">, label: TripShowLabel) => void;
  onClearLabel: (tripShowId: Id<"tripShows">) => void;
  onRemoveFromTrip: (showId: Id<"shows">) => Promise<void>;
  onUnassign: (showId: Id<"shows">) => Promise<void>;
}

export function TripShowLabelSheet({
  visible,
  onClose,
  item,
  canEdit,
  isOwner,
  onSetLabel,
  onClearLabel,
  onRemoveFromTrip,
  onUnassign,
}: TripShowLabelSheetProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const surfaceColor = Colors[theme].surfaceElevated;
  const chipBg = Colors[theme].surface;

  // All chips share the same width, calculated from the row with 3 chips.
  const chipWidth = (screenWidth - SHEET_H_PAD * 2 - ROW_GAP * (LABEL_ROW_1.length - 1)) / LABEL_ROW_1.length;

  if (!item) return null;

  const showName = item.show?.name ?? "Show";
  const assignedToDay = item.dayDate != null && item.dayDate !== "";
  const closingCal = item.closingDate ? formatDate(item.closingDate) : null;
  const showRunSection =
    Boolean(item.closingDate) ||
    item.isOpenRun === true ||
    item.tripProductionStatus === "open_run";

  const confirmRemove = () => {
    Alert.alert("Remove show?", "It will be removed from this trip.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await onRemoveFromTrip(item.showId);
          onClose();
        },
      },
    ]);
  };

  const confirmUnassign = () => {
    Alert.alert("Unassign?", "Show will return to the Trip List.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unassign",
        style: "destructive",
        onPress: async () => {
          await onUnassign(item.showId);
          onClose();
        },
      },
    ]);
  };

  function LabelChip({ label }: { label: TripShowLabel }) {
    const meta = tripShowLabelMeta(label);
    const selected = item!.myLabel === label;
    return (
      <Pressable
        style={[
          styles.labelChip,
          {
            width: chipWidth,
            backgroundColor: selected ? meta.color + "22" : chipBg,
            borderColor: selected ? meta.color : borderColor,
          },
        ]}
        onPress={() => {
          if (selected) {
            onClearLabel(item!._id);
          } else {
            onSetLabel(item!._id, label);
          }
          onClose();
        }}
      >
        <IconSymbol name={meta.icon} size={18} color={meta.color} />
        <Text
          style={[styles.labelChipText, { color: selected ? meta.color : primaryTextColor }]}
          numberOfLines={2}
        >
          {meta.shortTitle}
        </Text>
      </Pressable>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.title, { color: primaryTextColor }]} numberOfLines={2}>
            {showName}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.done, { color: accentColor }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showRunSection ? (
            <>
              <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>Closing</Text>
              <View style={[styles.infoCard, { borderColor, backgroundColor: surfaceColor }]}>
                {item.closingDate ? (
                  <>
                    <Text style={[styles.infoPrimary, { color: primaryTextColor }]}>
                      {closingStripLabel(item.closingDate)}
                    </Text>
                    {closingCal ? (
                      <Text style={[styles.infoSecondary, { color: mutedTextColor }]}>{closingCal}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[styles.infoPrimary, { color: primaryTextColor }]}>Open run</Text>
                )}
              </View>
            </>
          ) : null}

          <Text style={[styles.sectionLabel, { color: mutedTextColor, marginTop: showRunSection ? 4 : 0 }]}>
            Showtimes
          </Text>
          <ShowtimesPreviewPrototype
            borderColor={borderColor}
            surfaceColor={chipBg}
            primaryTextColor={primaryTextColor}
            mutedTextColor={mutedTextColor}
          />

          <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>Your label</Text>

          {/* Row 1: 3 chips, flex row */}
          <View style={styles.labelRow}>
            {LABEL_ROW_1.map((label) => <LabelChip key={label} label={label} />)}
          </View>

          {/* Row 2: 2 chips with same chip width, centered */}
          <View style={[styles.labelRow, { justifyContent: "center" }]}>
            {LABEL_ROW_2.map((label) => <LabelChip key={label} label={label} />)}
          </View>

          {item.labelSummary.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: mutedTextColor, marginTop: 4 }]}>
                Group
              </Text>
              <View style={styles.groupCompactRow}>
                {item.labelSummary.map(({ label, users }) => {
                  if (users.length === 0) return null;
                  const meta = tripShowLabelMeta(label);
                  const extra = users.length - AVATAR_CAP;
                  const shown = users.slice(0, AVATAR_CAP);
                  return (
                    <View
                      key={label}
                      style={[styles.groupChip, { backgroundColor: meta.color + "18", borderColor: meta.color + "44" }]}
                    >
                      <IconSymbol name={meta.icon} size={15} color={meta.color} />
                      <View style={styles.groupChipAvatars}>
                        {shown.map((u, idx) => (
                          <View
                            key={String(u.userId)}
                            style={[styles.groupAvatar, { borderColor: backgroundColor, marginLeft: idx === 0 ? 0 : -5 }]}
                          >
                            {u.avatarUrl ? (
                              <Image source={{ uri: u.avatarUrl }} style={styles.groupAvatarImg} contentFit="cover" />
                            ) : (
                              <View style={[styles.groupAvatarImg, styles.groupAvatarFb, { backgroundColor: chipBg }]}>
                                <Text style={[styles.groupAvatarFbText, { color: mutedTextColor }]}>
                                  {(u.name ?? u.username).slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                        {extra > 0 ? (
                          <Text style={[styles.groupChipMore, { color: mutedTextColor }]}>+{extra}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {(canEdit && assignedToDay) || isOwner ? (
            <View style={[styles.actions, { borderTopColor: borderColor }]}>
              {canEdit && assignedToDay ? (
                <Pressable style={[styles.actionBtn, { backgroundColor: chipBg, borderColor }]} onPress={confirmUnassign}>
                  <Text style={[styles.actionBtnText, { color: primaryTextColor }]}>Unassign from day</Text>
                </Pressable>
              ) : null}
              {isOwner ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "#ef444455" }]}
                  onPress={confirmRemove}
                >
                  <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Remove from trip</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, maxHeight: "75%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", marginRight: 12 },
  done: { fontSize: 16, fontWeight: "600" },
  scroll: {},
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  labelRow: { flexDirection: "row", gap: ROW_GAP },
  labelChip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    alignItems: "center",
  },
  labelChipText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  // Compact group: horizontal strip of icon+avatar chips
  groupCompactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupChipAvatars: { flexDirection: "row", alignItems: "center" },
  groupAvatar: { borderWidth: 1.5, borderRadius: 10, overflow: "hidden" },
  groupAvatarImg: { width: 18, height: 18, borderRadius: 9 },
  groupAvatarFb: { alignItems: "center", justifyContent: "center" },
  groupAvatarFbText: { fontSize: 8, fontWeight: "700" },
  groupChipMore: { marginLeft: 4, fontSize: 10, fontWeight: "700" },
  infoCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  infoPrimary: { fontSize: 15, fontWeight: "700" },
  infoSecondary: { fontSize: 13 },
  actions: { marginTop: 4, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 14, fontWeight: "600" },
});
