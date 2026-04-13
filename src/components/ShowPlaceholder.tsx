import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Canvas, LinearGradient, RoundedRect, vec } from "@shopify/react-native-skia";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { BRAND_BLUE, BRAND_PURPLE } from "@/constants/theme";

type ShowPlaceholderProps = {
  name: string;
  style?: object;
  /** Accepted for call-site compatibility; not shown on the placeholder for now. */
  type?: string;
  /** Accepted for call-site compatibility; unused while the type chip is removed. */
  showTypeLabel?: boolean;
};

function BrandGradientFill({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <RoundedRect x={0} y={0} width={width} height={height} r={0}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[BRAND_BLUE, BRAND_PURPLE]}
        />
      </RoundedRect>
    </Canvas>
  );
}

export function ShowPlaceholder({ name, style }: ShowPlaceholderProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const title = name.trim().replace(/\s+/g, " ");

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize((prev) =>
        prev?.width === width && prev.height === height ? prev : { width, height }
      );
    }
  };

  const minSide = size ? Math.min(size.width, size.height) : 0;
  const watermarkSize =
    minSide > 0 ? Math.min(72, Math.max(36, Math.round(minSide * 0.34))) : 44;

  return (
    <View style={[s.container, style]} onLayout={onLayout}>
      {size ? (
        <BrandGradientFill width={size.width} height={size.height} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.fallbackSolid]} />
      )}

      <View style={s.watermark} pointerEvents="none">
        <IconSymbol
          name="theatermasks.fill"
          size={watermarkSize}
          color="rgba(255,255,255,0.2)"
        />
      </View>

      {/* No `numberOfLines`: iOS can reserve extra line-box height; strip uses maxHeight + overflow. */}
      <View style={s.titleStrip} pointerEvents="none">
        <Text style={s.name}>{title}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 2 / 3,
    overflow: "hidden",
  },
  fallbackSolid: {
    backgroundColor: BRAND_BLUE,
  },
  watermark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Pinned to bottom so title height follows real line count (no flex “stretch”). */
  titleStrip: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    maxHeight: 44,
    overflow: "hidden",
  },
  name: {
    alignSelf: "stretch",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    color: "#ffffff",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
