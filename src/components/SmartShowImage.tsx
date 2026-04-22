import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Image as RNImage,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ImageStyle,
} from "react-native";

/**
 * Show poster with smart fit. We resolve aspect ratio via `Image.getSize` *before*
 * rendering the expo-image with the final `contentFit`, instead of flipping
 * `contentFit` in `onLoad`. Updating `contentFit` after mount breaks many
 * remote images on Android (blank tiles) while the same URLs work on iOS and
 * in simple `contain` layouts.
 */
const CARD_RATIO = 2 / 3;
const COVER_THRESHOLD = CARD_RATIO * 1.35;

type Props = {
  uri: string;
  style: StyleProp<ImageStyle>;
  matBackground?: string;
  /** Called when the image fails to load (invalid URL, network, decode, etc.). */
  onError?: () => void;
  loadingTitle?: string;
};

export function SmartShowImage({ uri, style, matBackground, onError, loadingTitle }: Props) {
  const [contentFit, setContentFit] = useState<"cover" | "contain" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContentFit(null);
    setLoaded(false);

    RNImage.getSize(
      uri,
      (width, height) => {
        if (cancelled || !width || !height) return;
        const ratio = width / height;
        setContentFit(ratio <= COVER_THRESHOLD ? "cover" : "contain");
      },
      () => {
        if (cancelled) return;
        setContentFit("contain");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const mat = matBackground ? { backgroundColor: matBackground } : undefined;

  if (contentFit === null) {
    return (
      <View style={[style as object, mat]}>
        {loadingTitle ? <LoadingTitleOverlay title={loadingTitle} /> : null}
      </View>
    );
  }

  return (
    <View style={style as object}>
      <Image
        source={{ uri }}
        style={[
          StyleSheet.absoluteFill,
          contentFit === "contain" && matBackground ? { backgroundColor: matBackground } : undefined,
        ]}
        contentFit={contentFit}
        transition={0}
        recyclingKey={uri}
        onError={() => onError?.()}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && loadingTitle ? <LoadingTitleOverlay title={loadingTitle} /> : null}
    </View>
  );
}

function LoadingTitleOverlay({ title }: { title: string }) {
  return (
    <View style={overlayStyles.wrap} pointerEvents="none">
      <Text style={overlayStyles.text} numberOfLines={3}>
        {title.trim().replace(/\s+/g, " ")}
      </Text>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
