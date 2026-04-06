import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface EmptyStateProps {
  icon?: IconSymbolName;
  iconSize?: number;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  iconSize = 40,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useColorScheme() ?? "light";
  const textColor = Colors[theme].text;
  const mutedColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  return (
    <View style={styles.container}>
      {icon && (
        <IconSymbol name={icon} size={iconSize} color={mutedColor} />
      )}
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: mutedColor }]}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={onAction}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
