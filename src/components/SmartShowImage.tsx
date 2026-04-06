import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Image as RNImage, View, type StyleProp, type ImageStyle } from "react-native";

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
};

export function SmartShowImage({ uri, style, matBackground, onError }: Props) {
  const [contentFit, setContentFit] = useState<"cover" | "contain" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContentFit(null);

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

  if (contentFit === null) {
    const mat = matBackground ? { backgroundColor: matBackground } : undefined;
    return <View style={[style as object, mat]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[style, contentFit === "contain" && matBackground ? { backgroundColor: matBackground } : undefined]}
      contentFit={contentFit}
      transition={0}
      recyclingKey={uri}
      onError={() => onError?.()}
    />
  );
}
