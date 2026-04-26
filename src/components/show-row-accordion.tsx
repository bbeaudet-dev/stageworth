import { Image } from "expo-image";
import { memo, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ShowType = "musical" | "play" | "opera" | "dance" | "revue" | "comedy" | "magic" | "other";

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

function RemoveAction({ onPress, label = "Remove" }: { onPress: () => void; label?: string }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const dangerColor = Colors[theme].danger;

  return (
    <Pressable
      style={[accordionStyles.removeAction, { backgroundColor: dangerColor }]}
      onPress={onPress}
    >
      <Text style={accordionStyles.removeActionText}>{label}</Text>
    </Pressable>
  );
}

export const ShowRowAccordion = memo(function ShowRowAccordion({
  item,
  index,
  rankLabel,
  tierHeader,
  isRemoving,
  onRemove,
  onViewShowDetails,
  drag,
  isActive,
  hideDragHandle,
  changeLabel,
  isMarkedForRemoval,
  disableRemoveActions,
  confirmRemove = true,
}: {
  item: RankedShow;
  index: number;
  rankLabel?: string;
  tierHeader?: { label: string; color: string; textColor?: string } | null;
  isRemoving: boolean;
  onRemove: () => void;
  onViewShowDetails: () => void;
  drag: () => void;
  isActive: boolean;
  hideDragHandle?: boolean;
  changeLabel?: string;
  isMarkedForRemoval?: boolean;
  disableRemoveActions?: boolean;
  confirmRemove?: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleRemovePress = useCallback(() => {
    swipeableRef.current?.close();

    if (!confirmRemove) {
      onRemove();
    } else if (item.visitCount > 0) {
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
  }, [confirmRemove, item.name, item.visitCount, onRemove]);

  const renderRightActions = useCallback(
    () => (
      <RemoveAction
        onPress={handleRemovePress}
        label={isMarkedForRemoval ? "Undo" : "Remove"}
      />
    ),
    [handleRemovePress, isMarkedForRemoval]
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
  const listThumbMat = playbillMatBackground(theme);

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
            { backgroundColor: surfaceColor, borderColor },
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
        renderRightActions={disableRemoveActions ? undefined : renderRightActions}
        enabled={!isActive && !disableRemoveActions}
        overshootRight={false}
      >
        <Pressable
          onPress={onViewShowDetails}
          disabled={isActive}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${item.name}`}
          style={[
            accordionStyles.showRow,
            isActive && accordionStyles.showRowActive,
            isMarkedForRemoval && accordionStyles.showRowMarkedForRemoval,
            {
              backgroundColor: isMarkedForRemoval
                ? Colors[theme].danger + "14"
                : isActive
                  ? surfaceElevated
                  : surfaceColor,
              borderColor: isMarkedForRemoval ? Colors[theme].danger : borderColor,
            },
          ]}
        >
          <Text style={[accordionStyles.rank, { color: mutedTextColor }]}>
            {rankLabel ?? `#${index + 1}`}
          </Text>
          <View
            style={[
              accordionStyles.listThumbFrame,
              {
                borderColor,
                backgroundColor: hasListThumbImage ? listThumbMat : "transparent",
              },
            ]}
          >
            {hasListThumbImage ? (
              <Image
                source={{ uri: listThumbUri }}
                style={accordionStyles.listThumbImage}
                contentFit="contain"
              />
            ) : (
              <ShowPlaceholder
                name={item.name}
                style={{ width: "100%", height: "100%", aspectRatio: undefined }}
              />
            )}
          </View>
          <View style={accordionStyles.showNameWrap}>
            <View style={accordionStyles.showNameLine}>
              <Text
                style={[accordionStyles.showName, { color: primaryTextColor }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.visitCount === 0 ? (
                <View
                  style={[
                    accordionStyles.missingVisitBadge,
                    { backgroundColor: surfaceElevated, borderColor },
                  ]}
                  accessibilityLabel="No visits logged"
                >
                  <IconSymbol
                    name="questionmark.circle"
                    size={13}
                    color={mutedTextColor}
                  />
                </View>
              ) : item.visitCount > 1 ? (
                <View
                  style={[
                    accordionStyles.visitCountBadge,
                    { backgroundColor: surfaceElevated, borderColor },
                  ]}
                >
                  <Text style={[accordionStyles.visitCountText, { color: mutedTextColor }]}>
                    {item.visitCount}
                  </Text>
                </View>
              ) : null}
            </View>
            {isMarkedForRemoval ? (
              <Text
                style={[accordionStyles.changeLabel, { color: Colors[theme].danger }]}
                numberOfLines={1}
              >
                Will be removed
              </Text>
            ) : changeLabel ? (
              <Text
                style={[accordionStyles.changeLabel, { color: mutedTextColor }]}
                numberOfLines={1}
              >
                {changeLabel}
              </Text>
            ) : null}
          </View>
          {hideDragHandle ? null : (
            <Pressable
              onPress={(event) => event.stopPropagation()}
              onLongPress={(event) => {
                event.stopPropagation();
                drag();
              }}
              delayLongPress={120}
              disabled={isActive}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Reorder ${item.name}`}
            >
              <Text style={[accordionStyles.dragHandle, { color: mutedTextColor }]}>☰</Text>
            </Pressable>
          )}
        </Pressable>
      </Swipeable>
    </View>
  );
});

export type { RankedShow };

const accordionStyles = StyleSheet.create({
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  showRowActive: {
  },
  showRowMarkedForRemoval: {
    borderWidth: 1,
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
    width: 34,
    textAlign: "left",
    fontVariant: ["tabular-nums"],
  },
  listThumbFrame: {
    width: 26,
    height: 39,
    borderRadius: 4,
    marginRight: 4,
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
    flexShrink: 1,
  },
  showNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  showNameLine: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 6,
  },
  visitCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  missingVisitBadge: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  visitCountText: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  changeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  dragHandle: {
    fontSize: 18,
    paddingLeft: 4,
  },
});
