/**
 * FeedPostCard — shared template for every community feed post.
 *
 * Slots
 * ─────
 * pill    optional category label rendered above the content row
 * header  optional row above the title (e.g. @handle in global mode)
 * title   main headline (typically a <Text> with inline styled spans)
 * body    flexible content below the title (notes, sub-lines, progress bars…)
 * poster  content placed inside a fixed 64×92 right-side image slot;
 *         the card owns the slot dimensions/border-radius so callers
 *         only supply the inner image/placeholder
 *
 * The whole card becomes a <Pressable> when `onPress` or `onLongPress` is provided.
 */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type PillConfig = {
  label: string;
  color: string;
  bg: string;
};

export type FeedPostCardProps = {
  backgroundColor: string;
  borderColor: string;
  /** Makes the entire card tappable. */
  onPress?: () => void;
  /** Fires on long-press — used for owner actions like delete. */
  onLongPress?: () => void;
  /** Small category pill rendered at the very top of the card. */
  pill?: PillConfig;
  /** Optional content above the title (e.g. a @handle line in global mode). */
  header?: ReactNode;
  /** Primary headline — supports inline styled <Text> spans. */
  title: ReactNode;
  /** Secondary content below the title (location, notes, progress, etc.). */
  body?: ReactNode;
  /**
   * Content to render inside the fixed 64×92 poster slot on the right.
   * Pass null / undefined to hide the slot entirely.
   */
  poster?: ReactNode;
  /** Background color of the poster slot container. */
  posterBackground?: string;
};

export function FeedPostCard({
  backgroundColor,
  borderColor,
  onPress,
  onLongPress,
  pill,
  header,
  title,
  body,
  poster,
  posterBackground = "#efefef",
}: FeedPostCardProps) {
  const inner = (
    <>
      {pill && (
        <Text
          style={[
            cardStyles.pill,
            { color: pill.color, backgroundColor: pill.bg },
          ]}
        >
          {pill.label}
        </Text>
      )}

      <View style={cardStyles.row}>
        <View style={cardStyles.mainCol}>
          {header ? <View style={cardStyles.headerSlot}>{header}</View> : null}
          <View style={cardStyles.titleSlot}>{title}</View>
          {body ? <View style={cardStyles.bodySlot}>{body}</View> : null}
        </View>

        {poster !== undefined && poster !== null ? (
          <View
            style={[cardStyles.posterSlot, { backgroundColor: posterBackground }]}
          >
            {poster}
          </View>
        ) : null}
      </View>
    </>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        style={[cardStyles.card, { backgroundColor, borderColor }]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyles.card, { backgroundColor, borderColor }]}>
      {inner}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  pill: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  mainCol: {
    flex: 1,
    gap: 6,
  },
  headerSlot: {},
  titleSlot: {},
  bodySlot: {
    gap: 5,
  },
  posterSlot: {
    width: 64,
    height: 92,
    borderRadius: 8,
    overflow: "hidden",
  },
});
