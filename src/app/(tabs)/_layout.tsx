import { useQuery } from "convex/react";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProfileTabIcon } from "@/components/ui/ProfileTabIcon";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePendingInvite } from "@/hooks/use-pending-invite";
import { useSession } from "@/lib/auth-client";

function renderTabIcon(focused: boolean, accentColor: string, icon: ReactNode) {
  return (
    <View style={styles.tabIconWrap}>
      {focused ? (
        <View style={[styles.tabActivePill, { backgroundColor: accentColor }]} />
      ) : (
        <View style={styles.tabActivePillPlaceholder} />
      )}
      {icon}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const accentColor = Colors[colorScheme ?? "light"].accent;
  const { data: session, isPending } = useSession();
  const onboardingState = useQuery(
    api.onboarding.getOnboardingState,
    session ? {} : "skip"
  );
  const { claimPendingInvite } = usePendingInvite();
  const didClaimRef = useRef(false);

  useEffect(() => {
    if (session && !isPending && !didClaimRef.current) {
      didClaimRef.current = true;
      claimPendingInvite();
    }
  }, [session, isPending, claimPendingInvite]);

  const [hasAuthResolvedOnce, setHasAuthResolvedOnce] = useState(!isPending);
  useEffect(() => {
    if (!isPending && !hasAuthResolvedOnce) setHasAuthResolvedOnce(true);
  }, [isPending, hasAuthResolvedOnce]);

  const c = Colors[colorScheme ?? "light"];

  if (!session && isPending) {
    if (!hasAuthResolvedOnce) {
      return (
        <View style={[styles.authGate, { backgroundColor: c.background }]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      );
    }
    return <View style={[styles.authGate, { backgroundColor: c.background }]} />;
  }
  if (!session) return <Redirect href="/sign-in" />;

  if (onboardingState?.phase === "profile") {
    return <Redirect href="/(onboarding)/profile" />;
  }
  if (onboardingState?.phase === "shows") {
    return <Redirect href="/(onboarding)/shows" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tabIconSelected,
        tabBarInactiveTintColor:
          Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(10, 10, 10, 0.96)"
              : "rgba(255, 255, 255, 0.96)",
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(0, 0, 0, 0.07)",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, accentColor, <IconSymbol size={28} name="person.2.fill" color={color} />),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, accentColor, <IconSymbol size={28} name="map.fill" color={color} />),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, accentColor, <IconSymbol size={28} name="magnifyingglass" color={color} />),
        }}
      />
      <Tabs.Screen
        name="my-shows"
        options={{
          title: "My Shows",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, accentColor, <IconSymbol size={28} name="theatermasks.fill" color={color} />),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, accentColor, <ProfileTabIcon color={color} size={28} />),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  authGate: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconWrap: {
    alignItems: "center",
    gap: 3,
  },
  tabActivePill: {
    width: 22,
    height: 3,
    borderRadius: 1.5,
  },
  tabActivePillPlaceholder: {
    width: 22,
    height: 3,
  },
});
