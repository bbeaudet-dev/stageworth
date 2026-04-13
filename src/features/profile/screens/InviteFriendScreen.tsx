import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function InviteFriendScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const createInviteLink = useMutation(api.invites.createInviteLink);
  const inviteStats = useQuery(api.invites.getMyInviteStats);

  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    createInviteLink({})
      .then((result) => setShareableUrl(result.shareableUrl))
      .catch(() => setShareableUrl(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (!shareableUrl) return;
    Clipboard.setString(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!shareableUrl) return;
    try {
      await Share.share({
        message:
          Platform.OS === "android"
            ? shareableUrl
            : "Join me on Center Stage — the app for theatre enthusiasts!",
        url: shareableUrl,
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol size={20} name="chevron.left" color={c.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Invite a Friend</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.content}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: c.accent + "12", borderColor: c.accent + "44" }]}>
          <View style={[styles.heroIcon, { backgroundColor: c.accent + "20" }]}>
            <IconSymbol name="person.2.fill" size={32} color={c.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: c.text }]}>Invite a Friend</Text>
          <Text style={[styles.heroSubtitle, { color: c.mutedText }]}>
            Share your personal invite link. Each link can be used once and expires in 30 days.
          </Text>
          {inviteStats && inviteStats.claimedLinks > 0 && (
            <View style={[styles.statsBadge, { backgroundColor: c.accent + "1a", borderColor: c.accent + "44" }]}>
              <Text style={[styles.statsText, { color: c.accent }]}>
                {inviteStats.claimedLinks} {inviteStats.claimedLinks === 1 ? "friend" : "friends"} joined using your link
              </Text>
            </View>
          )}
        </View>

        {/* Link card */}
        <View style={[styles.linkCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
          <Text style={[styles.linkLabel, { color: c.mutedText }]}>Your invite link</Text>
          {loading ? (
            <ActivityIndicator size="small" color={c.accent} style={{ marginVertical: 8 }} />
          ) : shareableUrl ? (
            <Text style={[styles.linkText, { color: c.text }]} numberOfLines={2} selectable>
              {shareableUrl}
            </Text>
          ) : (
            <Text style={[styles.linkText, { color: c.mutedText }]}>Could not generate link. Tap Share to try again.</Text>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.actionBtn,
                styles.actionBtnOutline,
                { borderColor: c.accent + "66" },
                copied && { borderColor: c.accent },
              ]}
              onPress={handleCopy}
              disabled={!shareableUrl || loading}
            >
              <IconSymbol
                name={copied ? "checkmark" : "doc.on.doc"}
                size={15}
                color={copied ? c.accent : c.mutedText}
              />
              <Text style={[styles.actionBtnText, { color: copied ? c.accent : c.mutedText }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { backgroundColor: c.accent }]}
              onPress={handleShare}
              disabled={loading}
            >
              <IconSymbol name="square.and.arrow.up" size={15} color={c.onAccent} />
              <Text style={[styles.actionBtnText, { color: c.onAccent }]}>Share</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  statsBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  statsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
