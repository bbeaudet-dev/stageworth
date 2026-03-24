import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Canvas,
  Group,
  RoundedRect,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

export type CloudShow = {
  _id: Id<"shows">;
  name: string;
  type: ShowType;
  images: string[];
  tier?: "loved" | "liked" | "okay" | "disliked" | "unranked";
};

interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  showId: Id<"shows">;
  showName: string;
  imageUrl: string | undefined;
}

const PLAYBILL_RATIO = 1.5;
const MIN_WIDTH = 42;
const ITEM_GAP = 3;

// Width range (px) per tier. First-ranked show in each tier gets the max width,
// last-ranked gets the min. Unranked shows are the smallest.
const TIER_WIDTH_RANGE: Record<string, readonly [number, number]> = {
  loved:    [100, 115],
  liked:    [80,  95],
  okay:     [65,  78],
  disliked: [52,  63],
  unranked: [42,  50],
};
const CORNER_RADIUS_RATIO = 0.05;

function overlaps(
  placed: Placement[],
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (const p of placed) {
    if (
      x < p.x + p.width + ITEM_GAP &&
      x + w + ITEM_GAP > p.x &&
      y < p.y + p.height + ITEM_GAP &&
      y + h + ITEM_GAP > p.y
    ) {
      return true;
    }
  }
  return false;
}

function computeLayout(shows: CloudShow[]): Placement[] {
  if (!shows.length) return [];

  // Pre-count shows per tier so we can normalize the intra-tier rank to [0, 1].
  const tierCounts: Record<string, number> = {};
  for (const show of shows) {
    const tier = show.tier ?? 'unranked';
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }
  const tierProgress: Record<string, number> = {};

  const placed: Placement[] = [];

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    const tier = show.tier ?? 'unranked';
    const idxInTier = tierProgress[tier] ?? 0;
    tierProgress[tier] = idxInTier + 1;
    const tierCount = tierCounts[tier];
    // tInTier goes 0 → 1 from best to worst within the tier.
    const tInTier = tierCount > 1 ? idxInTier / (tierCount - 1) : 0;
    const widthRange = TIER_WIDTH_RANGE[tier] ?? TIER_WIDTH_RANGE['unranked'];
    const w = widthRange[1] - (widthRange[1] - widthRange[0]) * tInTier;
    const h = w * PLAYBILL_RATIO;

    // Multi-angle spiral: try 8 evenly-spaced radial directions (anchored to
    // the golden angle so the distribution stays varied across shows).
    // For each direction, step outward 1px until the position is free.
    // Keep whichever direction lands closest to center — this fills in the
    // gaps left by earlier items rather than always spiralling further out.
    const baseAngle = i * (Math.PI * (3 - Math.sqrt(5)));
    let bestX = -w / 2;
    let bestY = -h / 2;
    let bestDist = Infinity;

    for (let k = 0; k < 8; k++) {
      const angle = baseAngle + (k * Math.PI) / 4;
      let radius = 0;
      let x = -w / 2;
      let y = -h / 2;
      while (overlaps(placed, x, y, w, h)) {
        radius += 1;
        x = Math.cos(angle) * radius - w / 2;
        y = Math.sin(angle) * radius - h / 2;
      }
      const dist = (x + w / 2) ** 2 + (y + h / 2) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestX = x;
        bestY = y;
      }
    }

    placed.push({ x: bestX, y: bestY, width: w, height: h,
      showId: show._id, showName: show.name, imageUrl: show.images[0] });
  }

  return placed;
}

function PlaybillImage({
  url,
  x,
  y,
  width,
  height,
  r,
}: {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  r: number;
}) {
  const image = useImage(url);
  if (!image) return null;

  return (
    <Group
      clip={{
        rect: { x, y, width, height },
        rx: r,
        ry: r,
      }}
    >
      <SkiaImage
        image={image}
        x={x}
        y={y}
        width={width}
        height={height}
        fit="cover"
      />
    </Group>
  );
}

function PlaybillItem({ placement }: { placement: Placement }) {
  const { x, y, width, height, imageUrl } = placement;
  const r = Math.max(2, width * CORNER_RADIUS_RATIO);

  return (
    <Group>
      <RoundedRect x={x} y={y} width={width} height={height} r={r} color="#e0e0e0" />
      {imageUrl && (
        <PlaybillImage url={imageUrl} x={x} y={y} width={width} height={height} r={r} />
      )}
    </Group>
  );
}

interface TheatreCloudProps {
  shows: CloudShow[];
  onShowPress: (showId: Id<"shows">) => void;
  /** Convex rankings query still loading (undefined) — show loading empty state, not "no shows". */
  rankingsLoading?: boolean;
  /** Keeps the gesture layer from sitting under the tab bar (which steals touches). */
  bottomInset?: number;
}

export function TheatreCloud({
  shows,
  onShowPress,
  rankingsLoading = false,
  bottomInset = 0,
}: TheatreCloudProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Compute all positions after the frame is painted (keeps tab-switch smooth).
  const [placements, setPlacements] = useState<Placement[]>([]);
  useEffect(() => {
    setPlacements(shows.length ? computeLayout(shows) : []);
  }, [shows]);

  // Progressive reveal: add one playbill every 20ms so they spiral in visually.
  // Reset whenever the layout is recomputed.
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    setVisibleCount(0);
  }, [placements]);
  useEffect(() => {
    if (visibleCount >= placements.length) return;
    const id = setTimeout(() => setVisibleCount((c) => c + 1), 20);
    return () => clearTimeout(id);
  }, [visibleCount, placements.length]);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const emptyTextColor = Colors[theme].text;

  const initialOffset = useMemo(() => {
    if (placements.length === 0 || size.width === 0) return { x: 0, y: 0 };
    const minX = Math.min(...placements.map((p) => p.x));
    const maxX = Math.max(...placements.map((p) => p.x + p.width));
    const minY = Math.min(...placements.map((p) => p.y));
    const maxY = Math.max(...placements.map((p) => p.y + p.height));
    return {
      x: size.width / 2 - (minX + (maxX - minX) / 2),
      y: size.height / 2 - (minY + (maxY - minY) / 2),
    };
  }, [placements, size]);

  useEffect(() => {
    setOffset(initialOffset);
    offsetRef.current = initialOffset;
  }, [initialOffset]);

  const hasPannedRef = useRef(false);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(5)
        .onStart(() => {
          hasPannedRef.current = true;
          panStartRef.current = { ...offsetRef.current };
        })
        .onUpdate((e) => {
          const next = {
            x: panStartRef.current.x + e.translationX,
            y: panStartRef.current.y + e.translationY,
          };
          offsetRef.current = next;
          setOffset(next);
        }),
    [],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onBegin(() => {
          hasPannedRef.current = false;
        })
        .onEnd((e) => {
          if (hasPannedRef.current) return;
          const hitX = e.x - offsetRef.current.x;
          const hitY = e.y - offsetRef.current.y;
          for (let i = visibleCount - 1; i >= 0; i--) {
            const p = placements[i];
            if (
              hitX >= p.x &&
              hitX <= p.x + p.width &&
              hitY >= p.y &&
              hitY <= p.y + p.height
            ) {
              onShowPress(p.showId);
              return;
            }
          }
        }),
    [placements, visibleCount, onShowPress],
  );

  const gesture = useMemo(() => Gesture.Simultaneous(tap, pan), [tap, pan]);

  // Placements that need a text label (no poster image). Rebuilt on each
  // reveal tick, but the filter is O(N) so the overhead is negligible.
  const labelPlacements = useMemo(
    () => placements.slice(0, visibleCount).filter((p) => !p.imageUrl),
    [placements, visibleCount],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  if (!shows.length) {
    return (
      <View style={[styles.empty, { backgroundColor, paddingBottom: bottomInset }]}>
        {rankingsLoading ? (
          <>
            <ActivityIndicator size="large" />
            <Text style={[styles.emptyText, { color: emptyTextColor, marginTop: 12 }]}>
              Loading your shows…
            </Text>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: emptyTextColor }]}>
            No shows to display
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, paddingBottom: bottomInset },
      ]}
      onLayout={onLayout}
    >
      {size.width > 0 && size.height > 0 && (
        <>
          <GestureDetector gesture={gesture}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Group
                transform={[{ translateX: offset.x }, { translateY: offset.y }]}
              >
                {placements.slice(0, visibleCount).map((p) => (
                  <PlaybillItem key={p.showId} placement={p} />
                ))}
              </Group>
            </Canvas>
          </GestureDetector>

          {/* RN text labels for shows without a poster image.
              pointerEvents="none" lets gestures fall through to the canvas. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {labelPlacements.map((p) => {
              const r = Math.max(2, p.width * CORNER_RADIUS_RATIO);
              return (
                <View
                  key={p.showId}
                  style={[
                    styles.labelContainer,
                    {
                      left: offset.x + p.x,
                      top: offset.y + p.y,
                      width: p.width,
                      height: p.height,
                      borderRadius: r,
                    },
                  ]}
                >
                  <Text style={styles.labelText} numberOfLines={4}>
                    {p.showName}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  labelContainer: {
    position: "absolute",
    overflow: "hidden",
    padding: 4,
    justifyContent: "center",
  },
  labelText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#555",
    lineHeight: 12,
  },
});
