import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

type RankedShow = {
  _id: Id<"shows">;
  _creationTime: number;
  name: string;
  type: ShowType;
  subtype?: string;
  images: string[];
  tier?: "loved" | "liked" | "okay" | "disliked" | "unranked";
  visitCount: number;
};

function formatVisitDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AddVisitForm({
  showId,
  onDone,
}: {
  showId: Id<"shows">;
  onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [theatre, setTheatre] = useState("");
  const [notes, setNotes] = useState("");
  const dateRef = useRef<TextInput>(null);

  const createVisit = useMutation(api.visits.create);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const surfaceColor = Colors[theme].surface;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const handleSubmit = () => {
    const trimmedDate = date.trim();
    if (!trimmedDate) return;

    createVisit({
      showId,
      date: trimmedDate,
      theatre: theatre.trim() || undefined,
      notes: notes.trim() || undefined,
    }).then(onDone);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onDone();
  };

  return (
    <View
      style={[
        formStyles.container,
        {
          borderTopColor: borderColor,
        },
      ]}
    >
      <View style={formStyles.field}>
        <Text style={[formStyles.label, { color: mutedTextColor }]}>Date</Text>
        <TextInput
          ref={dateRef}
          style={[
            formStyles.input,
            { backgroundColor: surfaceColor, borderColor, color: primaryTextColor },
          ]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoFocus
          returnKeyType="next"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={[formStyles.label, { color: mutedTextColor }]}>Theatre</Text>
        <TextInput
          style={[
            formStyles.input,
            { backgroundColor: surfaceColor, borderColor, color: primaryTextColor },
          ]}
          value={theatre}
          onChangeText={setTheatre}
          placeholder="Optional"
          returnKeyType="next"
          autoCapitalize="words"
        />
      </View>
      <View style={formStyles.field}>
        <Text style={[formStyles.label, { color: mutedTextColor }]}>Notes</Text>
        <TextInput
          style={[
            formStyles.input,
            { backgroundColor: surfaceColor, borderColor, color: primaryTextColor },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          autoCapitalize="sentences"
        />
      </View>
      <View style={formStyles.actions}>
        <Pressable onPress={handleCancel} style={formStyles.cancelBtn}>
          <Text style={[formStyles.cancelText, { color: mutedTextColor }]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          style={[
            formStyles.saveBtn,
            { backgroundColor: accentColor },
            !date.trim() && formStyles.saveBtnDisabled,
          ]}
          disabled={!date.trim()}
        >
          <Text style={formStyles.saveText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VisitsList({ showId }: { showId: Id<"shows"> }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const visits = useQuery(api.visits.listByShow, { showId });
  const removeVisit = useMutation(api.visits.remove);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surface;
  const borderColor = Colors[theme].border;
  const linkColor = Colors[theme].accent;
  const dangerColor = Colors[theme].danger;

  if (visits === undefined) {
    return (
      <View
        style={[
          accordionStyles.expandedBody,
          { backgroundColor: surfaceColor, borderTopColor: borderColor },
        ]}
      >
        <Text style={[accordionStyles.loadingText, { color: mutedTextColor }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        accordionStyles.expandedBody,
        { backgroundColor: surfaceColor, borderTopColor: borderColor },
      ]}
    >
      {visits.length === 0 && !isAdding && (
        <Text style={[accordionStyles.noVisits, { color: mutedTextColor }]}>No visits logged</Text>
      )}

      {visits.map((visit) => {
        const parts = [formatVisitDate(visit.date)];
        if (visit.theatre) parts.push(visit.theatre);
        if (!visit.theatre && visit.city) parts.push(visit.city);
        return (
          <View key={visit._id} style={accordionStyles.visitRow}>
            <Pressable
              style={accordionStyles.visitTextWrap}
              onPress={() =>
                router.push({
                  pathname: "/visit/[visitId]",
                  params: { visitId: String(visit._id) },
                })
              }
            >
              <Text style={[accordionStyles.visitText, { color: mutedTextColor }]} numberOfLines={1}>
                {parts.join("  ·  ")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => removeVisit({ visitId: visit._id })}
              hitSlop={8}
            >
              <Text style={[accordionStyles.visitRemove, { color: mutedTextColor }]}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      {isAdding ? (
        <AddVisitForm showId={showId} onDone={() => setIsAdding(false)} />
      ) : (
        <Pressable
          style={accordionStyles.addVisitBtn}
          onPress={() => setIsAdding(true)}
        >
          <Text style={[accordionStyles.addVisitText, { color: linkColor }]}>+ Add Visit</Text>
        </Pressable>
      )}
    </View>
  );
}

function RemoveAction({ onPress }: { onPress: () => void }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const dangerColor = Colors[theme].danger;

  return (
    <Pressable
      style={[accordionStyles.removeAction, { backgroundColor: dangerColor }]}
      onPress={onPress}
    >
      <Text style={accordionStyles.removeActionText}>Remove</Text>
    </Pressable>
  );
}

export const ShowRowAccordion = memo(function ShowRowAccordion({
  item,
  index,
  rankLabel,
  tierHeader,
  isExpanded,
  isRemoving,
  onToggle,
  onRemove,
  onViewShowDetails,
  drag,
  isActive,
}: {
  item: RankedShow;
  index: number;
  rankLabel?: string;
  tierHeader?: { label: string; color: string; textColor?: string } | null;
  isExpanded: boolean;
  isRemoving: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onViewShowDetails: () => void;
  drag: () => void;
  isActive: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleRemovePress = useCallback(() => {
    swipeableRef.current?.close();

    if (item.visitCount > 0) {
      const noun = item.visitCount === 1 ? "visit" : "visits";
      Alert.alert(
        `Remove "${item.name}"?`,
        `This show has ${item.visitCount} ${noun} that will also be deleted.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: onRemove },
        ]
      );
    } else {
      onRemove();
    }
  }, [item.name, item.visitCount, onRemove]);

  const renderRightActions = useCallback(
    () => <RemoveAction onPress={handleRemovePress} />,
    [handleRemovePress]
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surface;
  const surfaceElevated = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const listThumbUri = item.images?.[0]?.trim() ?? "";
  const hasListThumbImage = Boolean(listThumbUri);

  if (isRemoving) {
    return (
      <View>
        {tierHeader ? (
          <View
            style={[
              accordionStyles.tierBadge,
              { backgroundColor: tierHeader.color },
            ]}
          >
            <Text
              style={[
                accordionStyles.tierBadgeText,
                tierHeader.textColor ? { color: tierHeader.textColor } : null,
              ]}
            >
              {tierHeader.label}
            </Text>
          </View>
        ) : null}
        <View
          style={[
            accordionStyles.showRow,
            accordionStyles.showRowRemoving,
            { backgroundColor: surfaceColor },
          ]}
        >
          <ActivityIndicator
            size="small"
            color={mutedTextColor}
            style={accordionStyles.removingSpinner}
          />
          <Text style={[accordionStyles.removingName, { color: mutedTextColor }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {tierHeader ? (
        <View
          style={[
            accordionStyles.tierBadge,
            { backgroundColor: tierHeader.color },
          ]}
        >
          <Text
            style={[
              accordionStyles.tierBadgeText,
              tierHeader.textColor ? { color: tierHeader.textColor } : null,
            ]}
          >
            {tierHeader.label}
          </Text>
        </View>
      ) : null}
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        enabled={!isActive}
        overshootRight={false}
      >
        <View
          style={[
            accordionStyles.showRow,
            isActive && accordionStyles.showRowActive,
            isExpanded && accordionStyles.showRowExpanded,
            {
              backgroundColor: isActive ? surfaceElevated : surfaceColor,
              borderColor,
            },
          ]}
        >
          <Text style={[accordionStyles.rank, { color: mutedTextColor }]}>
            {rankLabel ?? `#${index + 1}`}
          </Text>
          <View style={[accordionStyles.listThumbFrame, { borderColor }]}>
            {hasListThumbImage ? (
              <Image
                source={{ uri: listThumbUri }}
                style={accordionStyles.listThumbImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  accordionStyles.listThumbImage,
                  { backgroundColor: isActive ? surfaceColor : surfaceElevated },
                ]}
              />
            )}
          </View>
          <Pressable
            style={accordionStyles.showNameWrap}
            onPress={onViewShowDetails}
            disabled={isActive}
          >
            <Text style={[accordionStyles.showName, { color: primaryTextColor }]} numberOfLines={1}>
              {item.name}
            </Text>
          </Pressable>
          <Pressable onPress={onToggle} disabled={isActive} hitSlop={8}>
            <Text style={[accordionStyles.chevron, { color: mutedTextColor }]}>
              {isExpanded ? "▾" : "▸"}
            </Text>
          </Pressable>
          <Pressable onLongPress={drag} disabled={isActive} hitSlop={8}>
            <Text style={[accordionStyles.dragHandle, { color: mutedTextColor }]}>☰</Text>
          </Pressable>
        </View>
      </Swipeable>

      {isExpanded && <VisitsList showId={item._id} />}
    </View>
  );
});

export type { RankedShow };

const accordionStyles = StyleSheet.create({
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  showRowActive: {
  },
  showRowExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  showRowRemoving: {
    opacity: 0.5,
  },
  removingSpinner: {
    width: 36,
  },
  removingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  removeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 88,
    borderRadius: 10,
    marginLeft: 6,
  },
  removeActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tierBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 2,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  rank: {
    fontSize: 14,
    fontWeight: "bold",
    width: 36,
    textAlign: "right",
  },
  listThumbFrame: {
    width: 26,
    height: 39,
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  listThumbImage: {
    width: "100%",
    height: "100%",
  },
  showName: {
    fontSize: 15,
    fontWeight: "500",
  },
  showNameWrap: {
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  dragHandle: {
    fontSize: 18,
    paddingLeft: 4,
  },
  expandedBody: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    paddingVertical: 4,
  },
  noVisits: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  visitTextWrap: {
    flex: 1,
  },
  visitText: {
    fontSize: 13,
  },
  visitRemove: {
    fontSize: 12,
    paddingLeft: 8,
  },
  addVisitBtn: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
    marginTop: 4,
  },
  addVisitText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

const formStyles = StyleSheet.create({
  container: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    width: 56,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelText: {
    fontSize: 13,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
});
