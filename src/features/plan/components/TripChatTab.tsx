import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const CHAT_MESSAGES = [
  { id: "1", text: "Hey, should we grab dinner before the show?", fromMe: false, name: "Alex" },
  { id: "2", text: "Definitely! There's a great place a block from the theatre.", fromMe: true },
  { id: "3", text: "Perfect, I'll make a reservation for 6:30", fromMe: false, name: "Alex" },
  { id: "4", text: "Can't wait! This trip is going to be amazing 🎭", fromMe: true },
];

export function TripChatTab() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const chipBg = Colors[theme].surface;

  return (
    <View style={styles.chatWrap}>
      <ScrollView contentContainerStyle={styles.chatMessages} showsVerticalScrollIndicator={false}>
        {CHAT_MESSAGES.map((msg) => (
          <View key={msg.id} style={[styles.bubbleRow, msg.fromMe && styles.bubbleRowMe]}>
            {!msg.fromMe ? (
              <View style={[styles.chatAvatar, { backgroundColor: accentColor + "22" }]}>
                <Text style={[styles.chatAvatarText, { color: accentColor }]}>A</Text>
              </View>
            ) : null}
            <View style={[styles.bubble, msg.fromMe ? { backgroundColor: accentColor } : { backgroundColor: surfaceColor, borderWidth: StyleSheet.hairlineWidth, borderColor }]}>
              {!msg.fromMe && msg.name ? <Text style={[styles.bubbleSender, { color: accentColor }]}>{msg.name}</Text> : null}
              <Text style={[styles.bubbleText, { color: msg.fromMe ? "#fff" : primaryTextColor }]}>{msg.text}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.chatComingSoon, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={{ fontSize: 24 }}>🚧</Text>
          <Text style={[styles.chatComingSoonText, { color: mutedTextColor }]}>Trip chat is coming soon! Coordinate with your group right here.</Text>
        </View>
      </ScrollView>
      <View style={[styles.chatBar, { backgroundColor: surfaceColor, borderTopColor: borderColor, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.chatInput, { backgroundColor: chipBg, borderColor }]}>
          <Text style={[styles.chatPlaceholder, { color: mutedTextColor }]}>Message your group…</Text>
        </View>
        <View style={[styles.chatSend, { backgroundColor: accentColor + "44" }]}>
          <IconSymbol size={18} name="chevron.right" color={accentColor} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatWrap: { flex: 1 },
  chatMessages: { padding: 16, gap: 12, paddingBottom: 24 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "85%" },
  bubbleRowMe: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { fontSize: 11, fontWeight: "700" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 2, maxWidth: "100%" },
  bubbleSender: { fontSize: 10, fontWeight: "700" },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  chatComingSoon: { marginTop: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: "center", gap: 10 },
  chatComingSoonText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  chatBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  chatInput: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  chatPlaceholder: { fontSize: 14 },
  chatSend: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
