import { useMutation } from "convex/react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PENDING_INVITE_KEY } from "@/hooks/use-pending-invite";
import { useSession } from "@/lib/auth-client";

export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? "light"];
  const claimMutation = useMutation(api.invites.claimInviteLink);
  const didRun = useRef(false);

  useEffect(() => {
    if (!token || didRun.current) return;

    async function handle() {
      didRun.current = true;

      if (!session) {
        // Persist token so it can be claimed after sign-in
        await SecureStore.setItemAsync(PENDING_INVITE_KEY, token as string);
        router.replace("/sign-in");
        return;
      }

      // Already signed in — claim immediately
      await claimMutation({ token: token as string }).catch(() => {});
      router.replace("/(tabs)/community");
    }

    // Wait for session state to resolve before acting
    if (!isPending) {
      handle();
    }
  }, [token, session, isPending]);

  if (isPending) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  // Fallback redirect if effect doesn't fire (e.g. SSR/web)
  return <Redirect href="/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
