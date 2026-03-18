import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Canvas,
  Group,
  matchFont,
  RoundedRect,
  Image as SkiaImage,
  Text as SkiaText,
  useImage,
} from "@shopify/react-native-skia";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
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
const MAX_WIDTH = 115;
const MIN_WIDTH = 42;
const ITEM_GAP = 3;
const CORNER_RADIUS_RATIO = 0.05;
const FLOAT_AMPLITUDE = 8; // px each playbill can drift from its home position
const FLOAT_SPEED_BASE = 0.22; // rad/s base drift speed
const LABEL_FONT_SIZE = 9;
const LABEL_PADDING = 4;
const LABEL_MIN_WIDTH = 38;

let _labelFont: ReturnType<typeof matchFont> | null = null;
function getLabelFont() {
  if (!_labelFont) {
    try {
      _labelFont = matchFont({ fontSize: LABEL_FONT_SIZE, fontWeight: "500" });
    } catch {
      return null;
    }
  }
  return _labelFont;
}

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

function overlapsExcluding(
  placed: Placement[],
  skipIdx: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (let i = 0; i < placed.length; i++) {
    if (i === skipIdx) continue;
    const p = placed[i];
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

  const placed: Placement[] = [];

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    const t = shows.length > 1 ? i / (shows.length - 1) : 0;
    const w = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * Math.pow(t, 0.6);
    const h = w * PLAYBILL_RATIO;

    let bestX: number;
    let bestY: number;

    if (i === 0) {
      bestX = -w / 2;
      bestY = -h / 2;
    } else {
      let bestDist = Infinity;
      bestX = 0;
      bestY = 0;

      for (const p of placed) {
        const xEdges = [p.x + p.width + ITEM_GAP, p.x - w - ITEM_GAP];
        const yEdges = [p.y + p.height + ITEM_GAP, p.y - h - ITEM_GAP];

        for (const cx of xEdges) {
          for (const q of placed) {
            const yAligns = [q.y, q.y + q.height - h];
            for (const cy of yAligns) {
              if (!overlaps(placed, cx, cy, w, h)) {
                const dx = cx + w / 2;
                const dy = cy + h / 2;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                  bestDist = dist;
                  bestX = cx;
                  bestY = cy;
                }
              }
            }
          }
        }

        for (const cy of yEdges) {
          for (const q of placed) {
            const xAligns = [q.x, q.x + q.width - w];
            for (const cx of xAligns) {
              if (!overlaps(placed, cx, cy, w, h)) {
                const dx = cx + w / 2;
                const dy = cy + h / 2;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                  bestDist = dist;
                  bestX = cx;
                  bestY = cy;
                }
              }
            }
          }
        }
      }

      if (bestDist === Infinity) {
        const angle = i * (Math.PI * (3 - Math.sqrt(5)));
        let radius = Math.sqrt(i) * MAX_WIDTH * 0.65;
        bestX = Math.cos(angle) * radius - w / 2;
        bestY = Math.sin(angle) * radius - h / 2;
        while (overlaps(placed, bestX, bestY, w, h)) {
          radius += 3;
          bestX = Math.cos(angle) * radius - w / 2;
          bestY = Math.sin(angle) * radius - h / 2;
        }
      }
    }

    placed.push({
      x: bestX,
      y: bestY,
      width: w,
      height: h,
      showId: show._id,
      showName: show.name,
      imageUrl: show.images[0],
    });
  }

  // Compaction pass: slide each item (smallest first) toward center
  for (let i = placed.length - 1; i >= 0; i--) {
    const p = placed[i];
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const stepX = cx > 0 ? -1 : cx < 0 ? 1 : 0;
    const stepY = cy > 0 ? -1 : cy < 0 ? 1 : 0;

    let moved = true;
    while (moved) {
      moved = false;
      if (
        stepX !== 0 &&
        !overlapsExcluding(placed, i, p.x + stepX, p.y, p.width, p.height)
      ) {
        p.x += stepX;
        moved = true;
      }
      if (
        stepY !== 0 &&
        !overlapsExcluding(placed, i, p.x, p.y + stepY, p.width, p.height)
      ) {
        p.y += stepY;
        moved = true;
      }
    }
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

function PlaybillLabel({
  showName,
  x,
  y,
  width,
  height,
}: {
  showName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const font = getLabelFont();
  if (!font || width < LABEL_MIN_WIDTH) return null;

  return (
    <Group
      clip={{
        rect: {
          x: x + LABEL_PADDING,
          y,
          width: width - LABEL_PADDING * 2,
          height,
        },
        rx: 0,
        ry: 0,
      }}
    >
      <SkiaText
        font={font}
        text={showName}
        x={x + LABEL_PADDING}
        y={y + height / 2 + LABEL_FONT_SIZE * 0.35}
        color="#666"
      />
    </Group>
  );
}

function PlaybillItem({ placement }: { placement: Placement }) {
  const { x, y, width, height, imageUrl, showName } = placement;
  const r = Math.max(2, width * CORNER_RADIUS_RATIO);

  return (
    <Group>
      <RoundedRect
        x={x}
        y={y}
        width={width}
        height={height}
        r={r}
        color="#e0e0e0"
      />
      {imageUrl ? (
        <PlaybillImage
          url={imageUrl}
          x={x}
          y={y}
          width={width}
          height={height}
          r={r}
        />
      ) : (
        <PlaybillLabel
          showName={showName}
          x={x}
          y={y}
          width={width}
          height={height}
        />
      )}
    </Group>
  );
}

interface TheatreCloudProps {
  shows: CloudShow[];
  onShowPress: (showId: Id<"shows">) => void;
}

export function TheatreCloud({ shows, onShowPress }: TheatreCloudProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const placements = useMemo(() => computeLayout(shows), [shows]);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const emptyTextColor = Colors[theme].text;

  // Float animation — each item wanders around its home position
  const animTimeRef = useRef(0);
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!placements.length) return;
    const startMs = Date.now();
    let frameId: number;
    const tick = () => {
      animTimeRef.current = (Date.now() - startMs) / 1000;
      forceUpdate();
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [placements]);

  // Derive animated positions from base placements + sinusoidal float per item
  const t = animTimeRef.current;
  const displayPlacements = placements.map((p, i) => {
    const phaseX = (i * 2.39996) % (2 * Math.PI); // golden-angle phase spread
    const phaseY = (i * 1.61803) % (2 * Math.PI);
    const speedX = FLOAT_SPEED_BASE + (i % 5) * 0.04;
    const speedY = FLOAT_SPEED_BASE * 0.73 + (i % 7) * 0.03;
    return {
      ...p,
      x: p.x + FLOAT_AMPLITUDE * Math.sin(t * speedX + phaseX),
      y: p.y + FLOAT_AMPLITUDE * Math.cos(t * speedY + phaseY),
    };
  });

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

  // Set to true when the pan gesture activates; reset on each new touch.
  // The tap handler ignores the event if the user was scrolling.
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
          for (let i = 0; i < placements.length; i++) {
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
    [placements, onShowPress],
  );

  const gesture = useMemo(() => Gesture.Simultaneous(tap, pan), [tap, pan]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  if (!shows.length) {
    return (
      <View style={[styles.empty, { backgroundColor }]}>
        <Text style={[styles.emptyText, { color: emptyTextColor }]}>
          No shows to display
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <GestureDetector gesture={gesture}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group
              transform={[{ translateX: offset.x }, { translateY: offset.y }]}
            >
              {[...displayPlacements].reverse().map((p) => (
                <PlaybillItem key={p.showId} placement={p} />
              ))}
            </Group>
          </Canvas>
        </GestureDetector>
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
});
