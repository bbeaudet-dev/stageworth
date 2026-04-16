import { type RefObject } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SECTION_PADDING = 16;

interface SearchBrowseHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  inputFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onCancel: () => void;
  inputRef: RefObject<TextInput | null>;
}

export function SearchBrowseHeader({
  query,
  onQueryChange,
  inputFocused,
  onFocus,
  onBlur,
  onCancel,
  inputRef,
}: SearchBrowseHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const border = Colors[theme].border;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;
  const chipBg = Colors[theme].surface;

  return (
    <View style={styles.headerRow}>
      <View style={[styles.searchField, { backgroundColor: chipBg, borderColor: border }]}>
        <IconSymbol size={18} name="magnifyingglass" color={muted} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: text }]}
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Shows, people, venues..."
          placeholderTextColor={muted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          returnKeyType="search"
        />
      </View>
      {inputFocused && (
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={[styles.cancelText, { color: accent }]}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SECTION_PADDING,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  cancelText: { fontSize: 15, fontWeight: "600" },
});
