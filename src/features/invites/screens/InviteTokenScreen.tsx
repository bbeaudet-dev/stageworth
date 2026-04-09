import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PENDING_INVITE_KEY } from "@/hooks/use-pending-invite";
import { authClient, useSession } from "@/lib/auth-client";

type ScreenState = "loading" | "claiming" | "signed-in";

export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? "light"];
  const claimMutation = useMutation(api.invites.claimInviteLink);
  const didRun = useRef(false);
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (isPending || !token || didRun.current) return;
    didRun.current = true;

    if (!session) {
      SecureStore.setItemAsync(PENDING_INVITE_KEY, token as string).then(() =>
        router.replace("/sign-in")
      );
      return;
    }

    setScreen("signed-in");
  }, [token, session, isPending]);

  async function handleClaim() {
    setScreen("claiming");
    await claimMutation({ token: token as string }).catch(() => {});
    router.replace("/(tabs)/community");
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await SecureStore.setItemAsync(PENDING_INVITE_KEY, token as string);
    await authClient.signOut();
    router.replace("/sign-in");
  }

  if (screen === "loading" || screen === "claiming" || isPending) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      <View style={styles.inner}>
        <Text style={[styles.heading, { color: c.text }]}>You&apos;re invited</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>
          You&apos;re currently signed in as{" "}
          <Text style={{ color: c.text, fontWeight: "600" }}>
            {session?.user.email}
          </Text>
          .
        </Text>
        <Text style={[styles.body, { color: c.mutedText }]}>
          Accept the invite with this account, or sign out to join with a different one.
        </Text>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.accent }]}
          onPress={handleClaim}
        >
          <Text style={[styles.primaryBtnText, { color: c.onAccent }]}>
            Accept invite
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { borderColor: c.border }]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          <Text style={[styles.secondaryBtnText, { color: c.mutedText, opacity: isSigningOut ? 0.5 : 1 }]}>
            Sign out &amp; use a different account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
