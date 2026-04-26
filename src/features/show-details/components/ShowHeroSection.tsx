import { Image } from "expo-image";
import { useState } from "react";
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextLayoutEventData,
  View,
} from "react-native";

import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import { Colors } from "@/constants/theme";
import { showTypeChip, showTypeLabel } from "@/constants/showTypeColors";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";

/** Target preview length for the collapsed description state. */
const DESCRIPTION_PREVIEW_CHARS = 130;
const DESCRIPTION_LINE_HEIGHT = 20;

/**
 * Truncate a description for preview. Tries to break on a sentence boundary
 * within the last ~60 chars of the limit so we don't chop mid-word; otherwise
 * falls back to the nearest space, then a hard slice.
 */
function truncateForPreview(full: string, limit: number): string {
  if (full.length <= limit) return full;
  const windowStart = Math.max(0, limit - 60);
  const slice = full.slice(0, limit);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". ", limit),
    slice.lastIndexOf("! ", limit),
    slice.lastIndexOf("? ", limit)
  );
  if (sentenceEnd >= windowStart) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(" ", limit);
  if (lastSpace >= windowStart) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

interface ShowHeroSectionProps {
  show: {
    name: string;
    type?: string | null;
    images?: (string | null)[] | null;
    description?: string | null;
  } | null | undefined;
  placeholderName?: string;
  screenWidth: number;
}

export function ShowHeroSection({
  show,
  placeholderName,
  screenWidth,
}: ShowHeroSectionProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  const playbillSize = Math.floor((screenWidth - 32 - 12) / 3);
  const posterUrl = show?.images?.[0] ?? null;
  const showType = show?.type ?? null;
  const typeColors = showTypeChip(showType ?? "other", isDark ? "dark" : "light");

  const description = show?.description?.trim() || null;
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = !!description && description.length > DESCRIPTION_PREVIEW_CHARS;
  const preview = needsTruncate
    ? truncateForPreview(description!, DESCRIPTION_PREVIEW_CHARS)
    : description;

  // For the expanded "wrap around the playbill" layout, we measure the height
  // available next to the image (below title + type badge) and the rendered
  // line break points of the full description. Then we split the description
  // into a narrow block (next to the playbill) and a full-width block (below).
  const playbillHeight = playbillSize * 1.4;
  const [topBlockHeight, setTopBlockHeight] = useState(0);
  const [fullLines, setFullLines] = useState<{ text: string }[] | null>(null);
  const heightNextToPlaybill = Math.max(0, playbillHeight - topBlockHeight);
  const linesNextToPlaybill = Math.max(
    0,
    Math.floor(heightNextToPlaybill / DESCRIPTION_LINE_HEIGHT),
  );
  const handleTopBlockLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (Math.abs(h - topBlockHeight) > 0.5) setTopBlockHeight(h);
  };
  const handleFullLines = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = e.nativeEvent.lines.map((l) => ({ text: l.text }));
    if (
      !fullLines ||
      fullLines.length !== lines.length ||
      fullLines.some((l, i) => l.text !== lines[i]?.text)
    ) {
      setFullLines(lines);
    }
  };

  // Build the two chunks (next-to-image + overflow) from the measured lines.
  let narrowChunk = "";
  let overflowChunk = "";
  if (expanded && description && fullLines && fullLines.length > 0) {
    const splitAt = Math.min(linesNextToPlaybill, fullLines.length);
    narrowChunk = fullLines.slice(0, splitAt).map((l) => l.text).join("");
    overflowChunk = fullLines.slice(splitAt).map((l) => l.text).join("");
    narrowChunk = narrowChunk.trimEnd();
    overflowChunk = overflowChunk.trimStart();
  }

  return (
    <>
      {/* Hero row: playbill + name / type / description */}
      <View style={styles.heroRow}>
        <View style={[styles.playbillWrap, { width: playbillSize, height: playbillSize * 1.4 }]}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={[styles.playbillImg, { backgroundColor: playbillMatBackground(theme) }]}
              contentFit="contain"
            />
          ) : (
            <ShowPlaceholder
              name={show?.name ?? (placeholderName ?? "")}
              style={{ width: "100%", height: "100%", aspectRatio: undefined }}
            />
          )}
        </View>

        <View style={styles.heroInfo}>
          <View onLayout={handleTopBlockLayout} style={styles.heroTopBlock}>
            <Text style={[styles.showName, { color: c.text }]} numberOfLines={3}>
              {show?.name ?? (placeholderName ?? "Loading…")}
            </Text>
            {showType !== null && (
              <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
                <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
                  {showTypeLabel(showType)}
                </Text>
              </View>
            )}
          </View>
          {description && preview && (
            <View style={styles.descriptionWrap}>
              {/* Narrow-column description. When collapsed: preview + ellipsis.
                  When expanded: only the portion that fits next to the image.
                  A hidden measurement pass (opacity 0) captures the full line
                  breaks so we can split cleanly. */}
              {expanded ? (
                <>
                  <Text
                    style={[styles.descriptionText, styles.hiddenMeasure, { color: c.text }]}
                    onTextLayout={handleFullLines}
                  >
                    {description}
                  </Text>
                  {fullLines && linesNextToPlaybill > 0 && narrowChunk.length > 0 && (
                    <Text
                      style={[styles.descriptionText, { color: c.text }]}
                      numberOfLines={linesNextToPlaybill}
                    >
                      {narrowChunk}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.descriptionText, { color: c.text }]}>
                  {needsTruncate ? `${preview}\u2026` : description}
                </Text>
              )}
              {needsTruncate && !expanded && (
                <Pressable
                  onPress={() => setExpanded(true)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.readMoreBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.readMoreText, { color: c.accent }]}>
                    Read more
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Full-width remainder when expanded: wraps back under the playbill. */}
      {expanded && description && (
        <View style={styles.descriptionOverflowWrap}>
          {overflowChunk.length > 0 && (
            <Text style={[styles.descriptionText, { color: c.text }]}>
              {overflowChunk}
            </Text>
          )}
          <Pressable
            onPress={() => setExpanded(false)}
            hitSlop={8}
            style={({ pressed }) => [styles.readMoreBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.readMoreText, { color: c.accent }]}>Read less</Text>
          </Pressable>
        </View>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  playbillWrap: { borderRadius: 8, overflow: "hidden" },
  playbillImg: { width: "100%", height: "100%" },
  heroInfo: { flex: 1, gap: 8, paddingTop: 4 },
  showName: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  typeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  heroTopBlock: { gap: 8 },
  descriptionWrap: { gap: 4, marginTop: 8 },
  descriptionOverflowWrap: { gap: 4, marginTop: 4 },
  descriptionText: { fontSize: 14, lineHeight: DESCRIPTION_LINE_HEIGHT },
  hiddenMeasure: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
  readMoreBtn: { alignSelf: "flex-start", paddingVertical: 2 },
  readMoreText: { fontSize: 13, fontWeight: "600" },
});
