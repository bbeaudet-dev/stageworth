import { StyleProp, Text, TextStyle } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface BrandGradientTitleProps {
  text: string;
  fontSize?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Screen-level heading that uses the brand blue accent colour.
 * Keeps the same brand identity as the website wordmark while being
 * 100% reliable across iOS/Android and both colour modes.
 */
export function BrandGradientTitle({
  text,
  fontSize = 28,
  style,
}: BrandGradientTitleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const color = Colors[isDark ? "dark" : "light"].accent;

  return (
    <Text style={[{ fontSize, fontWeight: "bold", color }, style]}>
      {text}
    </Text>
  );
}
