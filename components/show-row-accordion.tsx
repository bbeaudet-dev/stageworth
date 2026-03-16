import { useMutation, useQuery } from "convex/react";
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

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

type RankedShow = {
  _id: Id<"shows">;
  _creationTime: number;
  name: string;
  type: ShowType;
  subtype?: string;
  images: string[];
  tier?: "loved" | "liked" | "okay" | "disliked";
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
    <View style={formStyles.container}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Date</Text>
        <TextInput
          ref={dateRef}
          style={formStyles.input}
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
        <Text style={formStyles.label}>Theatre</Text>
        <TextInput
          style={formStyles.input}
          value={theatre}
          onChangeText={setTheatre}
          placeholder="Optional"
          returnKeyType="next"
          autoCapitalize="words"
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <TextInput
          style={formStyles.input}
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
          <Text style={formStyles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          style={[formStyles.saveBtn, !date.trim() && formStyles.saveBtnDisabled]}
          disabled={!date.trim()}
        >
          <Text style={formStyles.saveText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VisitsList({ showId }: { showId: Id<"shows"> }) {
  const [isAdding, setIsAdding] = useState(false);
  const visits = useQuery(api.visits.listByShow, { showId });
  const removeVisit = useMutation(api.visits.remove);

  if (visits === undefined) {
    return (
      <View style={accordionStyles.expandedBody}>
        <Text style={accordionStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={accordionStyles.expandedBody}>
      {visits.length === 0 && !isAdding && (
        <Text style={accordionStyles.noVisits}>No visits logged</Text>
      )}

      {visits.map((visit) => {
        const parts = [formatVisitDate(visit.date)];
        if (visit.theatre) parts.push(visit.theatre);
        if (!visit.theatre && visit.city) parts.push(visit.city);
        return (
          <View key={visit._id} style={accordionStyles.visitRow}>
            <Text style={accordionStyles.visitText} numberOfLines={1}>
              {parts.join("  ·  ")}
            </Text>
            <Pressable
              onPress={() => removeVisit({ visitId: visit._id })}
              hitSlop={8}
            >
              <Text style={accordionStyles.visitRemove}>✕</Text>
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
          <Text style={accordionStyles.addVisitText}>+ Add Visit</Text>
        </Pressable>
      )}
    </View>
  );
}

function RemoveAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={accordionStyles.removeAction} onPress={onPress}>
      <Text style={accordionStyles.removeActionText}>Remove</Text>
    </Pressable>
  );
}

export const ShowRowAccordion = memo(function ShowRowAccordion({
  item,
  index,
  tierHeader,
  isExpanded,
  isRemoving,
  onToggle,
  onRemove,
  drag,
  isActive,
}: {
  item: RankedShow;
  index: number;
  tierHeader?: { label: string; color: string; textColor?: string } | null;
  isExpanded: boolean;
  isRemoving: boolean;
  onToggle: () => void;
  onRemove: () => void;
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
          style={[accordionStyles.showRow, accordionStyles.showRowRemoving]}
        >
          <ActivityIndicator size="small" color="#999" style={accordionStyles.removingSpinner} />
          <Text style={accordionStyles.removingName} numberOfLines={1}>
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
        <Pressable
          onPress={onToggle}
          onLongPress={drag}
          disabled={isActive}
          style={[
            accordionStyles.showRow,
            isActive && accordionStyles.showRowActive,
            isExpanded && accordionStyles.showRowExpanded,
          ]}
        >
          <Text style={accordionStyles.rank}>#{index + 1}</Text>
          <Text style={accordionStyles.showName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={accordionStyles.chevron}>
            {isExpanded ? "▾" : "▸"}
          </Text>
          <Text style={accordionStyles.dragHandle}>☰</Text>
        </Pressable>
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
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  showRowActive: {
    backgroundColor: "#e8e8e8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
    color: "#999",
  },
  removeAction: {
    backgroundColor: "#FF3B30",
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
    color: "#111",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  rank: {
    fontSize: 14,
    fontWeight: "bold",
    width: 36,
    color: "#333",
  },
  showName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 14,
    color: "#999",
    paddingHorizontal: 4,
  },
  dragHandle: {
    fontSize: 18,
    color: "#ccc",
    paddingLeft: 4,
  },
  expandedBody: {
    backgroundColor: "#fafafa",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#999",
    paddingVertical: 4,
  },
  noVisits: {
    fontSize: 13,
    color: "#bbb",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  visitText: {
    flex: 1,
    fontSize: 13,
    color: "#555",
  },
  visitRemove: {
    fontSize: 12,
    color: "#ccc",
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
    color: "#007AFF",
    fontWeight: "500",
  },
});

const formStyles = StyleSheet.create({
  container: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
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
    color: "#666",
    width: 56,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
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
    color: "#999",
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#007AFF",
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
